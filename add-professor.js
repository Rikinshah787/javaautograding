/**
 * Script to add real professors to the admin dashboard
 * This replaces the temporary demo professor with real users
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class ProfessorManager {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    /**
     * Add a new professor to the system
     */
    async addProfessor(email, fullName, department = 'Computer Science', institution = 'Arizona State University') {
        try {
            // Validate email format
            if (!email.includes('@') || !email.includes('.edu')) {
                throw new Error('Please use a valid .edu email address');
            }

            const { data: professor, error } = await this.supabase
                .from('professors')
                .upsert({
                    email: email.toLowerCase(),
                    full_name: fullName,
                    department: department,
                    institution: institution,
                    is_active: true
                }, { onConflict: 'email' })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Professor added successfully:`);
            console.log(`   Name: ${professor.full_name}`);
            console.log(`   Email: ${professor.email}`);
            console.log(`   Department: ${professor.department}`);
            console.log(`   Institution: ${professor.institution}`);

            return professor;
        } catch (error) {
            console.error('❌ Error adding professor:', error.message);
            throw error;
        }
    }

    /**
     * List all professors
     */
    async listProfessors() {
        try {
            const { data: professors, error } = await this.supabase
                .from('professors')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log('\n📋 Current Professors:');
            console.log('─'.repeat(80));
            
            if (professors.length === 0) {
                console.log('No professors found.');
                return [];
            }

            professors.forEach((prof, index) => {
                console.log(`${index + 1}. ${prof.full_name}`);
                console.log(`   Email: ${prof.email}`);
                console.log(`   Department: ${prof.department}`);
                console.log(`   Institution: ${prof.institution}`);
                console.log(`   Status: ${prof.is_active ? 'Active' : 'Inactive'}`);
                console.log(`   Created: ${new Date(prof.created_at).toLocaleDateString()}`);
                console.log('─'.repeat(80));
            });

            return professors;
        } catch (error) {
            console.error('❌ Error listing professors:', error.message);
            throw error;
        }
    }

    /**
     * Update professor information
     */
    async updateProfessor(email, updates) {
        try {
            const { data: professor, error } = await this.supabase
                .from('professors')
                .update(updates)
                .eq('email', email)
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Professor updated successfully:`);
            console.log(`   Email: ${professor.email}`);
            console.log(`   Name: ${professor.full_name}`);
            console.log(`   Department: ${professor.department}`);

            return professor;
        } catch (error) {
            console.error('❌ Error updating professor:', error.message);
            throw error;
        }
    }

    /**
     * Deactivate professor (soft delete)
     */
    async deactivateProfessor(email) {
        try {
            const { error } = await this.supabase
                .from('professors')
                .update({ is_active: false })
                .eq('email', email);

            if (error) throw error;

            console.log(`✅ Professor ${email} deactivated successfully`);
        } catch (error) {
            console.error('❌ Error deactivating professor:', error.message);
            throw error;
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
            console.log('🎓 Professor Setup for Java Grader Admin Dashboard\n');

            // List current professors
            await this.listProfessors();

            console.log('\n📝 Add New Professor:');
            const email = await question('Professor email (.edu required): ');
            const fullName = await question('Full name: ');
            const department = await question('Department (default: Computer Science): ') || 'Computer Science';
            const institution = await question('Institution (default: Arizona State University): ') || 'Arizona State University';

            await this.addProfessor(email, fullName, department, institution);

            console.log('\n🎉 Professor setup complete!');
            console.log('The professor can now access the admin dashboard at http://localhost:5001');

        } catch (error) {
            console.error('Setup failed:', error.message);
        } finally {
            rl.close();
        }
    }
}

// CLI interface
if (require.main === module) {
    const manager = new ProfessorManager();
    const command = process.argv[2];

    switch (command) {
        case 'add':
            const email = process.argv[3];
            const name = process.argv[4];
            const dept = process.argv[5] || 'Computer Science';
            const inst = process.argv[6] || 'Arizona State University';
            
            if (!email || !name) {
                console.log('Usage: node add-professor.js add <email> <name> [department] [institution]');
                console.log('Example: node add-professor.js add prof.johnson@asu.edu "Dr. Johnson" "Computer Science" "Arizona State University"');
                process.exit(1);
            }
            
            manager.addProfessor(email, name, dept, inst);
            break;
            
        case 'list':
            manager.listProfessors();
            break;
            
        case 'update':
            console.log('Update functionality - implement as needed');
            break;
            
        case 'interactive':
            manager.interactiveSetup();
            break;
            
        default:
            console.log('Professor Management for Java Grader Admin Dashboard');
            console.log('');
            console.log('Usage: node add-professor.js <command>');
            console.log('');
            console.log('Commands:');
            console.log('  add <email> <name> [department] [institution]  - Add a professor');
            console.log('  list                                        - List all professors');
            console.log('  interactive                                 - Interactive setup');
            console.log('');
            console.log('Examples:');
            console.log('  node add-professor.js add prof.smith@asu.edu "Dr. Sarah Smith"');
            console.log('  node add-professor.js list');
            console.log('  node add-professor.js interactive');
    }
}

module.exports = ProfessorManager;
