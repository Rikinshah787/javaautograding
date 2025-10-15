/**
 * Setup script for Java Grader Admin Dashboard
 * This script helps initialize the Supabase database and configure the system
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

class AdminDashboardSetup {
    constructor() {
        this.supabase = null;
        this.setupComplete = false;
    }

    /**
     * Initialize Supabase connection
     */
    async initializeSupabase() {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Supabase credentials not found. Please check your .env file.');
        }

        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        console.log('✅ Supabase connection initialized');
    }

    /**
     * Run the database schema
     */
    async setupDatabase() {
        try {
            console.log('📊 Setting up database schema...');
            
            const schemaPath = path.join(__dirname, 'supabase-schema.sql');
            const schema = await fs.readFile(schemaPath, 'utf8');

            // Split schema into individual statements
            const statements = schema
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await this.supabase.rpc('exec_sql', { sql: statement });
                    } catch (error) {
                        // Some statements might fail if they already exist, which is fine
                        if (!error.message.includes('already exists') && 
                            !error.message.includes('does not exist')) {
                            console.warn(`⚠️  Statement warning: ${error.message}`);
                        }
                    }
                }
            }

            console.log('✅ Database schema setup complete');
        } catch (error) {
            console.error('❌ Database setup failed:', error.message);
            throw error;
        }
    }

    /**
     * Create sample data for testing
     */
    async createSampleData() {
        try {
            console.log('📝 Creating sample data...');

            // Create sample professor
            const { data: professor, error: profError } = await this.supabase
                .from('professors')
                .upsert({
                    email: 'prof.smith@asu.edu',
                    full_name: 'Dr. Sarah Smith',
                    department: 'Computer Science',
                    institution: 'Arizona State University'
                }, { onConflict: 'email' })
                .select()
                .single();

            if (profError) throw profError;

            // Create sample assignment
            const { data: assignment, error: assignmentError } = await this.supabase
                .from('assignments')
                .upsert({
                    professor_id: professor.id,
                    title: 'Java Portfolio Application',
                    description: 'Build a stock portfolio management system with transaction tracking',
                    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
                    max_attempts: 3,
                    is_active: true
                }, { onConflict: 'id' })
                .select()
                .single();

            if (assignmentError) throw assignmentError;

            // Create sample students
            const sampleStudents = [
                {
                    email: 'john.doe@asu.edu',
                    full_name: 'John Doe',
                    student_id: 'ASU123456',
                    institution: 'Arizona State University'
                },
                {
                    email: 'jane.smith@asu.edu',
                    full_name: 'Jane Smith',
                    student_id: 'ASU123457',
                    institution: 'Arizona State University'
                },
                {
                    email: 'mike.johnson@asu.edu',
                    full_name: 'Mike Johnson',
                    student_id: 'ASU123458',
                    institution: 'Arizona State University'
                }
            ];

            for (const studentData of sampleStudents) {
                const { data: student, error: studentError } = await this.supabase
                    .from('students')
                    .upsert(studentData, { onConflict: 'email' })
                    .select()
                    .single();

                if (studentError) throw studentError;

                // Create student assignment enrollment
                await this.supabase
                    .from('student_assignments')
                    .upsert({
                        student_id: student.id,
                        assignment_id: assignment.id,
                        best_score: Math.floor(Math.random() * 40) + 60, // Random score 60-100
                        total_attempts: Math.floor(Math.random() * 3) + 1,
                        last_attempt_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
                    }, { onConflict: 'student_id,assignment_id' });
            }

            console.log('✅ Sample data created successfully');
        } catch (error) {
            console.error('❌ Sample data creation failed:', error.message);
            throw error;
        }
    }

    /**
     * Test the setup
     */
    async testSetup() {
        try {
            console.log('🧪 Testing setup...');

            // Test database connection
            const { data, error } = await this.supabase
                .from('students')
                .select('count')
                .limit(1);

            if (error) throw error;

            // Test admin dashboard API
            const response = await fetch(`http://localhost:${process.env.PORT || 5001}/api/health`);
            if (!response.ok) {
                throw new Error('Admin dashboard API not responding');
            }

            console.log('✅ Setup test passed');
            return true;
        } catch (error) {
            console.error('❌ Setup test failed:', error.message);
            return false;
        }
    }

    /**
     * Create environment file template
     */
    async createEnvTemplate() {
        const envTemplate = `# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=5001
NODE_ENV=development

# Security
JWT_SECRET=your_jwt_secret_key
ADMIN_EMAIL=admin@asu.edu

# Java Grader Integration
JAVA_GRADER_URL=http://localhost:5000

# Instructions:
# 1. Create a new Supabase project at https://supabase.com
# 2. Copy your project URL and API keys from the project settings
# 3. Replace the placeholder values above with your actual credentials
# 4. Save this file as .env (remove .template)
`;

        await fs.writeFile('.env.template', envTemplate);
        console.log('📄 Created .env.template file');
    }

    /**
     * Run the complete setup
     */
    async runSetup() {
        try {
            console.log('🚀 Starting Java Grader Admin Dashboard Setup...\n');

            // Check if .env file exists
            if (!await fs.pathExists('.env')) {
                console.log('⚠️  No .env file found. Creating template...');
                await this.createEnvTemplate();
                console.log('📝 Please configure your .env file with Supabase credentials and run setup again.\n');
                return;
            }

            // Initialize Supabase
            await this.initializeSupabase();

            // Setup database
            await this.setupDatabase();

            // Create sample data
            await this.createSampleData();

            // Test setup
            const testPassed = await this.testSetup();

            if (testPassed) {
                console.log('\n🎉 Setup completed successfully!');
                console.log('\n📋 Next steps:');
                console.log('1. Start the admin dashboard: npm start');
                console.log('2. Open http://localhost:5001 in your browser');
                console.log('3. Configure authentication for production use');
                console.log('4. Integrate with your Java Grader system');
                console.log('\n🔗 Useful links:');
                console.log('- Admin Dashboard: http://localhost:5001');
                console.log('- Supabase Dashboard: https://supabase.com/dashboard');
                console.log('- Documentation: See README.md');
            } else {
                console.log('\n❌ Setup completed with errors. Please check the logs above.');
            }

        } catch (error) {
            console.error('\n💥 Setup failed:', error.message);
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check your .env file configuration');
            console.log('2. Ensure Supabase project is properly set up');
            console.log('3. Verify network connectivity');
            console.log('4. Check the logs above for specific errors');
        }
    }

    /**
     * Reset the database (use with caution)
     */
    async resetDatabase() {
        try {
            console.log('⚠️  Resetting database...');
            
            const tables = ['error_logs', 'submissions', 'student_assignments', 'assignments', 'students', 'professors'];
            
            for (const table of tables) {
                await this.supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            }

            console.log('✅ Database reset complete');
        } catch (error) {
            console.error('❌ Database reset failed:', error.message);
            throw error;
        }
    }
}

// CLI interface
if (require.main === module) {
    const setup = new AdminDashboardSetup();
    const command = process.argv[2];

    switch (command) {
        case 'setup':
            setup.runSetup();
            break;
        case 'reset':
            setup.resetDatabase();
            break;
        case 'test':
            setup.initializeSupabase().then(() => setup.testSetup());
            break;
        default:
            console.log('Usage: node setup.js [setup|reset|test]');
            console.log('  setup - Run complete setup');
            console.log('  reset - Reset database (use with caution)');
            console.log('  test  - Test current setup');
    }
}

module.exports = AdminDashboardSetup;
