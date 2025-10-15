/**
 * Authentication system for professors
 * Handles login, registration, and session management
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class ProfessorAuth {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    }

    /**
     * Hash password
     */
    async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Verify password
     */
    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT token
     */
    generateToken(professor) {
        return jwt.sign(
            { 
                id: professor.id, 
                email: professor.email, 
                professor_id: professor.professor_id,
                is_admin: professor.is_admin 
            },
            this.jwtSecret,
            { expiresIn: '24h' }
        );
    }

    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            return null;
        }
    }

    /**
     * Register a new professor
     */
    async registerProfessor(professorData) {
        try {
            const { email, full_name, professor_id, password, department, institution } = professorData;

            // Validate input
            if (!email || !full_name || !professor_id || !password) {
                throw new Error('All fields are required');
            }

            if (!email.includes('@') || !email.includes('.edu')) {
                throw new Error('Please use a valid .edu email address');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            // Check if professor ID already exists
            const { data: existingProfessor } = await this.supabase
                .from('professors')
                .select('id')
                .eq('professor_id', professor_id)
                .single();

            if (existingProfessor) {
                throw new Error('Professor ID already exists');
            }

            // Check if email already exists
            const { data: existingEmail } = await this.supabase
                .from('professors')
                .select('id')
                .eq('email', email)
                .single();

            if (existingEmail) {
                throw new Error('Email already registered');
            }

            // Hash password
            const passwordHash = await this.hashPassword(password);

            // Create professor
            const { data: professor, error } = await this.supabase
                .from('professors')
                .insert({
                    email: email.toLowerCase(),
                    full_name,
                    professor_id,
                    password_hash: passwordHash,
                    department: department || 'Computer Science',
                    institution: institution || 'Arizona State University',
                    is_admin: false,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;

            // Generate token
            const token = this.generateToken(professor);

            return {
                success: true,
                professor: {
                    id: professor.id,
                    email: professor.email,
                    full_name: professor.full_name,
                    professor_id: professor.professor_id,
                    department: professor.department,
                    institution: professor.institution,
                    is_admin: professor.is_admin
                },
                token
            };

        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Login professor
     */
    async loginProfessor(professorId, password) {
        try {
            if (!professorId || !password) {
                throw new Error('Professor ID and password are required');
            }

            // Find professor by professor_id or email
            const { data: professor, error } = await this.supabase
                .from('professors')
                .select('*')
                .or(`professor_id.eq.${professorId},email.eq.${professorId}`)
                .eq('is_active', true)
                .single();

            if (error || !professor) {
                throw new Error('Invalid professor ID or email');
            }

            // Verify password
            const isValidPassword = await this.verifyPassword(password, professor.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid password');
            }

            // Update last login
            await this.supabase
                .from('professors')
                .update({ last_login: new Date().toISOString() })
                .eq('id', professor.id);

            // Generate token
            const token = this.generateToken(professor);

            return {
                success: true,
                professor: {
                    id: professor.id,
                    email: professor.email,
                    full_name: professor.full_name,
                    professor_id: professor.professor_id,
                    department: professor.department,
                    institution: professor.institution,
                    is_admin: professor.is_admin
                },
                token
            };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get professor by token
     */
    async getProfessorByToken(token) {
        try {
            const decoded = this.verifyToken(token);
            if (!decoded) {
                throw new Error('Invalid token');
            }

            const { data: professor, error } = await this.supabase
                .from('professors')
                .select('*')
                .eq('id', decoded.id)
                .eq('is_active', true)
                .single();

            if (error || !professor) {
                throw new Error('Professor not found');
            }

            return {
                success: true,
                professor: {
                    id: professor.id,
                    email: professor.email,
                    full_name: professor.full_name,
                    professor_id: professor.professor_id,
                    department: professor.department,
                    institution: professor.institution,
                    is_admin: professor.is_admin
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create default admin professor
     */
    async createDefaultAdmin() {
        try {
            const adminData = {
                email: 'admin@asu.edu',
                full_name: 'System Administrator',
                professor_id: 'ADMIN001',
                password: 'admin123',
                department: 'Computer Science',
                institution: 'Arizona State University'
            };

            // Check if admin already exists
            const { data: existingAdmin } = await this.supabase
                .from('professors')
                .select('id')
                .eq('professor_id', 'ADMIN001')
                .single();

            if (existingAdmin) {
                console.log('✅ Default admin already exists');
                return { success: true, message: 'Admin already exists' };
            }

            // Create admin
            const result = await this.registerProfessor(adminData);
            
            if (result.success) {
                // Make this professor an admin
                await this.supabase
                    .from('professors')
                    .update({ is_admin: true })
                    .eq('professor_id', 'ADMIN001');

                console.log('✅ Default admin created successfully');
                console.log('   Professor ID: ADMIN001');
                console.log('   Password: admin123');
                console.log('   Email: admin@asu.edu');
            }

            return result;

        } catch (error) {
            console.error('Error creating default admin:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List all professors
     */
    async listProfessors() {
        try {
            const { data: professors, error } = await this.supabase
                .from('professors')
                .select('id, email, full_name, professor_id, department, institution, is_admin, is_active, created_at, last_login')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return {
                success: true,
                professors: professors || []
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update professor
     */
    async updateProfessor(professorId, updates) {
        try {
            const updateData = { ...updates };
            
            // Hash password if provided
            if (updateData.password) {
                updateData.password_hash = await this.hashPassword(updateData.password);
                delete updateData.password;
            }

            const { data: professor, error } = await this.supabase
                .from('professors')
                .update(updateData)
                .eq('professor_id', professorId)
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                professor: {
                    id: professor.id,
                    email: professor.email,
                    full_name: professor.full_name,
                    professor_id: professor.professor_id,
                    department: professor.department,
                    institution: professor.institution,
                    is_admin: professor.is_admin
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ProfessorAuth;
