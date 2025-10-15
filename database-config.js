/**
 * Database Configuration
 * Choose between file-based or Supabase database
 */

const DatabaseService = require('./database-service');
const SupabaseDatabaseService = require('./supabase-database');

// Database configuration
const DATABASE_TYPE = process.env.DATABASE_TYPE || 'file'; // 'file' or 'supabase'

function createDatabaseService() {
    switch (DATABASE_TYPE) {
        case 'supabase':
            console.log('🗄️ Using Supabase database');
            return new SupabaseDatabaseService();
        
        case 'file':
        default:
            console.log('📁 Using file-based database');
            return new DatabaseService();
    }
}

module.exports = {
    createDatabaseService,
    DATABASE_TYPE
};
