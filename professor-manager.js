/**
 * Professor Management System
 * Handles professor registration, login, and management
 */

const ProfessorAuth = require('./auth');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class ProfessorManager {
    constructor() {
        this.auth = new ProfessorAuth();
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    /**
     * Initialize the professor system
     */
    async initialize() {
        try {
            console.log('🎓 Initializing Professor Management System...\n');

            // Create default admin
            const adminResult = await this.auth.createDefaultAdmin();
            if (adminResult.success) {
                console.log('✅ Default admin created');
            }

            // List all professors
            const professorsResult = await this.auth.listProfessors();
            if (professorsResult.success) {
                console.log(`\n📋 Current Professors (${professorsResult.professors.length}):`);
                console.log('─'.repeat(80));
                
                professorsResult.professors.forEach((prof, index) => {
                    console.log(`${index + 1}. ${prof.full_name}`);
                    console.log(`   Professor ID: ${prof.professor_id}`);
                    console.log(`   Email: ${prof.email}`);
                    console.log(`   Department: ${prof.department}`);
                    console.log(`   Admin: ${prof.is_admin ? 'Yes' : 'No'}`);
                    console.log(`   Status: ${prof.is_active ? 'Active' : 'Inactive'}`);
                    console.log(`   Last Login: ${prof.last_login ? new Date(prof.last_login).toLocaleString() : 'Never'}`);
                    console.log('─'.repeat(80));
                });
            }

            console.log('\n🎉 Professor system initialized successfully!');
            console.log('\n🔑 Default Admin Credentials:');
            console.log('   Professor ID: ADMIN001');
            console.log('   Password: admin123');
            console.log('   Email: admin@asu.edu');
            console.log('\n🌐 Access the admin dashboard at: http://localhost:5001');

        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
        }
    }

    /**
     * Add a new professor
     */
    async addProfessor(professorData) {
        try {
            console.log('👨‍🏫 Adding new professor...\n');

            const result = await this.auth.registerProfessor(professorData);
            
            if (result.success) {
                console.log('✅ Professor added successfully!');
                console.log(`   Name: ${result.professor.full_name}`);
                console.log(`   Professor ID: ${result.professor.professor_id}`);
                console.log(`   Email: ${result.professor.email}`);
                console.log(`   Department: ${result.professor.department}`);
                console.log(`   Admin: ${result.professor.is_admin ? 'Yes' : 'No'}`);
            } else {
                console.log('❌ Failed to add professor:', result.error);
            }

            return result;

        } catch (error) {
            console.error('❌ Error adding professor:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Interactive professor setup
     */
    async interactiveSetup() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

        try {
            console.log('🎓 Professor Registration System\n');

            // Show current professors
            const professorsResult = await this.auth.listProfessors();
            if (professorsResult.success && professorsResult.professors.length > 0) {
                console.log('📋 Current Professors:');
                professorsResult.professors.forEach((prof, index) => {
                    console.log(`   ${index + 1}. ${prof.full_name} (${prof.professor_id})`);
                });
                console.log('');
            }

            console.log('📝 Register New Professor:');
            const fullName = await question('Full Name: ');
            const email = await question('Email (.edu required): ');
            const professorId = await question('Professor ID (e.g., PROF001): ');
            const password = await question('Password (min 6 characters): ');
            const department = await question('Department (default: Computer Science): ') || 'Computer Science';
            const institution = await question('Institution (default: Arizona State University): ') || 'Arizona State University';
            const isAdmin = await question('Make admin? (y/N): ');

            const professorData = {
                full_name: fullName,
                email: email,
                professor_id: professorId,
                password: password,
                department: department,
                institution: institution
            };

            const result = await this.addProfessor(professorData);

            if (result.success && isAdmin.toLowerCase() === 'y') {
                await this.supabase
                    .from('professors')
                    .update({ is_admin: true })
                    .eq('professor_id', professorId);
                console.log('✅ Professor granted admin privileges');
            }

            console.log('\n🎉 Professor registration complete!');
            console.log('The professor can now login to the admin dashboard.');

        } catch (error) {
            console.error('Setup failed:', error.message);
        } finally {
            rl.close();
        }
    }

    /**
     * Reset professor password
     */
    async resetPassword(professorId, newPassword) {
        try {
            const result = await this.auth.updateProfessor(professorId, { password: newPassword });
            
            if (result.success) {
                console.log(`✅ Password reset for professor ${professorId}`);
            } else {
                console.log('❌ Failed to reset password:', result.error);
            }

            return result;

        } catch (error) {
            console.error('❌ Error resetting password:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * List all professors
     */
    async listProfessors() {
        try {
            const result = await this.auth.listProfessors();
            
            if (result.success) {
                console.log('\n📋 All Professors:');
                console.log('─'.repeat(100));
                console.log('ID'.padEnd(15) + 'Name'.padEnd(25) + 'Email'.padEnd(30) + 'Admin'.padEnd(8) + 'Status');
                console.log('─'.repeat(100));
                
                result.professors.forEach(prof => {
                    console.log(
                        prof.professor_id.padEnd(15) +
                        prof.full_name.substring(0, 24).padEnd(25) +
                        prof.email.substring(0, 29).padEnd(30) +
                        (prof.is_admin ? 'Yes' : 'No').padEnd(8) +
                        (prof.is_active ? 'Active' : 'Inactive')
                    );
                });
                console.log('─'.repeat(100));
            } else {
                console.log('❌ Failed to list professors:', result.error);
            }

            return result;

        } catch (error) {
            console.error('❌ Error listing professors:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// CLI interface
if (require.main === module) {
    const manager = new ProfessorManager();
    const command = process.argv[2];

    switch (command) {
        case 'init':
            manager.initialize();
            break;
            
        case 'add':
            const fullName = process.argv[3];
            const email = process.argv[4];
            const professorId = process.argv[5];
            const password = process.argv[6];
            const department = process.argv[7] || 'Computer Science';
            const institution = process.argv[8] || 'Arizona State University';
            
            if (!fullName || !email || !professorId || !password) {
                console.log('Usage: node professor-manager.js add <name> <email> <professor_id> <password> [department] [institution]');
                console.log('Example: node professor-manager.js add "Dr. Smith" "smith@asu.edu" "PROF001" "password123"');
                process.exit(1);
            }
            
            manager.addProfessor({
                full_name: fullName,
                email: email,
                professor_id: professorId,
                password: password,
                department: department,
                institution: institution
            });
            break;
            
        case 'list':
            manager.listProfessors();
            break;
            
        case 'reset-password':
            const profId = process.argv[3];
            const newPass = process.argv[4];
            
            if (!profId || !newPass) {
                console.log('Usage: node professor-manager.js reset-password <professor_id> <new_password>');
                process.exit(1);
            }
            
            manager.resetPassword(profId, newPass);
            break;
            
        case 'interactive':
            manager.interactiveSetup();
            break;
            
        default:
            console.log('Professor Management System for Java Grader Admin Dashboard');
            console.log('');
            console.log('Usage: node professor-manager.js <command>');
            console.log('');
            console.log('Commands:');
            console.log('  init                    - Initialize system and create default admin');
            console.log('  add <name> <email> <id> <password> [dept] [inst] - Add professor');
            console.log('  list                    - List all professors');
            console.log('  reset-password <id> <password> - Reset professor password');
            console.log('  interactive             - Interactive professor setup');
            console.log('');
            console.log('Examples:');
            console.log('  node professor-manager.js init');
            console.log('  node professor-manager.js add "Dr. Johnson" "johnson@asu.edu" "PROF002" "pass123"');
            console.log('  node professor-manager.js list');
            console.log('  node professor-manager.js interactive');
    }
}

module.exports = ProfessorManager;
