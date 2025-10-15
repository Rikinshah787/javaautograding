# Supabase Database Setup Guide

## 🚀 Quick Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Set Up Database Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL script

### 3. Configure Environment Variables
Add these to your Vercel environment variables:

```bash
DATABASE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 4. Deploy
```bash
vercel --prod
```

## 📊 Database Tables

### Submissions Table
- `id` - Unique submission ID
- `student_name` - Student's name
- `student_email` - Student's email
- `timestamp` - Submission timestamp
- `grades` - JSON object with all grades
- `compilation_success` - Boolean
- `execution_success` - Boolean
- `compilation_errors` - Error messages
- `execution_output` - Program output
- `feedback` - Array of feedback messages
- `test_results` - JSON object with test results
- `analysis` - JSON object with code analysis

### Students Table
- `email` - Student's email (primary key)
- `name` - Student's name
- `submissions` - JSON array of all submissions
- `best_score` - Highest score achieved
- `first_submission` - First submission timestamp
- `last_submission` - Last submission timestamp
- `submission_count` - Total number of submissions

## 🔄 Switching Between Databases

### Use File-Based Database (Current)
```bash
DATABASE_TYPE=file
```

### Use Supabase Database
```bash
DATABASE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 🛡️ Security

The current setup allows all operations. For production, you should:
1. Enable Row Level Security (RLS)
2. Create proper policies
3. Use service role key for admin operations
4. Restrict public access

## 📈 Benefits of Supabase

- ✅ **Cloud Database** - Highly available
- ✅ **Automatic Backups** - Data protection
- ✅ **Real-time Updates** - Live data sync
- ✅ **Scalable** - Handles growth
- ✅ **Reliable** - No data loss
- ✅ **Query Interface** - Easy data management

## 🔧 Troubleshooting

### Connection Issues
1. Check your Supabase URL and key
2. Ensure the database schema is created
3. Check Vercel environment variables

### Data Not Syncing
1. Check Supabase logs
2. Verify RLS policies
3. Check network connectivity

## 📞 Support

If you need help:
1. Check Supabase documentation
2. Review the database logs
3. Test with the health check endpoint
