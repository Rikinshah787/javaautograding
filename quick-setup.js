/**
 * Quick setup script for Java Grader Admin Dashboard
 * Creates default admin and initializes the system
 */

const ProfessorManager = require('./professor-manager');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function quickSetup() {
    try {
        console.log('🚀 Java Grader Admin Dashboard - Quick Setup');
        console.log('==========================================\n');

        // Check if .env file exists
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.log('❌ Supabase credentials not found!');
            console.log('📝 Please create a .env file with your Supabase credentials:');
            console.log('');
            console.log('SUPABASE_URL=your_supabase_project_url');
            console.log('SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key');
            console.log('JWT_SECRET=your_jwt_secret_key');
            console.log('PORT=5001');
            console.log('');
            console.log('Then run this script again.');
            return;
        }

        // Test Supabase connection
        console.log('🔗 Testing Supabase connection...');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error } = await supabase
            .from('professors')
            .select('count')
            .limit(1);

        if (error) {
            console.log('❌ Supabase connection failed:', error.message);
            console.log('📝 Please check your Supabase credentials and try again.');
            return;
        }

        console.log('✅ Supabase connection successful!');

        // Initialize professor system
        console.log('\n👨‍🏫 Setting up professor system...');
        const manager = new ProfessorManager();
        await manager.initialize();

        console.log('\n🎉 Setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Start the admin dashboard: npm start');
        console.log('2. Open http://localhost:5001 in your browser');
        console.log('3. Login with the default admin credentials');
        console.log('4. Add more professors as needed');
        console.log('\n🔑 Default Admin Credentials:');
        console.log('   Professor ID: ADMIN001');
        console.log('   Password: admin123');
        console.log('   Email: admin@asu.edu');

    } catch (error) {
        console.error('\n💥 Setup failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your .env file configuration');
        console.log('2. Ensure Supabase project is properly set up');
        console.log('3. Verify network connectivity');
        console.log('4. Check the logs above for specific errors');
    }
}

// Run setup
quickSetup();
