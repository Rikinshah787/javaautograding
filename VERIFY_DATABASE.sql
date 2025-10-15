-- VERIFY DATABASE SETUP
-- Run this after running FINAL_SUPABASE_SCHEMA.sql to verify everything works

-- Check if all tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('assignments', 'students', 'submissions', 'student_assignments') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('assignments', 'students', 'submissions', 'student_assignments')
ORDER BY table_name;

-- Check table structures
SELECT 'ASSIGNMENTS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'assignments' 
ORDER BY ordinal_position;

SELECT 'STUDENTS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;

SELECT 'SUBMISSIONS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'submissions' 
ORDER BY ordinal_position;

-- Check indexes
SELECT 'INDEXES CREATED:' as info;
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('assignments', 'students', 'submissions', 'student_assignments')
ORDER BY tablename, indexname;

-- Check foreign key constraints
SELECT 'FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('submissions', 'student_assignments');

-- Test data insertion
SELECT 'TESTING DATA INSERTION:' as info;

-- Test inserting a sample assignment
INSERT INTO assignments (title, description, due_date, created_by, max_attempts, late_penalty_percentage)
VALUES ('Test Assignment', 'Test Description', NOW() + INTERVAL '1 day', 'test-professor', 2, 5.0)
RETURNING 'Assignment inserted successfully' as result;

-- Test inserting a sample student
INSERT INTO students (email, name, submissions, best_score, submission_count)
VALUES ('test@example.com', 'Test Student', '[]', 0, 0)
RETURNING 'Student inserted successfully' as result;

-- Test inserting a sample submission
INSERT INTO submissions (id, assignment_id, student_name, student_email, timestamp, grades, compilation_success, execution_success)
VALUES (
    'test-submission-1',
    (SELECT id FROM assignments WHERE title = 'Test Assignment' LIMIT 1),
    'Test Student',
    'test@example.com',
    NOW(),
    '{"total": 85, "transactionHistory": 20, "portfolioManager": 22, "display": 21, "standards": 22}',
    true,
    true
)
RETURNING 'Submission inserted successfully' as result;

-- Clean up test data
DELETE FROM submissions WHERE id = 'test-submission-1';
DELETE FROM students WHERE email = 'test@example.com';
DELETE FROM assignments WHERE title = 'Test Assignment';

SELECT 'Test data cleaned up successfully' as cleanup_result;

-- Final verification
SELECT 'DATABASE SETUP VERIFICATION COMPLETE!' as final_status;
