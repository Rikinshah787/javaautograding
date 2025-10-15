-- FINAL SUPABASE SCHEMA FOR JAVA GRADER SYSTEM
-- This is the complete, error-free schema
-- Run this entire script in your Supabase SQL Editor

-- ==============================================
-- STEP 1: CLEAN SLATE - DROP EXISTING TABLES
-- ==============================================
DROP TABLE IF EXISTS student_assignments CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;

-- ==============================================
-- STEP 2: CREATE TABLES IN CORRECT ORDER
-- ==============================================

-- Create assignments table (no dependencies)
CREATE TABLE assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    created_by TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_attempts INTEGER DEFAULT 3,
    late_penalty_percentage DECIMAL(5,2) DEFAULT 10.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create students table (no dependencies)
CREATE TABLE students (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    submissions JSONB NOT NULL DEFAULT '[]',
    best_score INTEGER NOT NULL DEFAULT 0,
    first_submission TIMESTAMPTZ,
    last_submission TIMESTAMPTZ,
    submission_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create submissions table (depends on assignments and students)
CREATE TABLE submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    late_penalty_applied DECIMAL(5,2) DEFAULT 0.0,
    grades JSONB NOT NULL,
    final_score DECIMAL(5,2) GENERATED ALWAYS AS (
        (grades->>'total')::DECIMAL - late_penalty_applied
    ) STORED,
    compilation_success BOOLEAN NOT NULL DEFAULT FALSE,
    execution_success BOOLEAN NOT NULL DEFAULT FALSE,
    compilation_errors TEXT,
    execution_output TEXT,
    feedback TEXT[],
    test_results JSONB,
    analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student_assignments table (depends on students and assignments)
CREATE TABLE student_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_email TEXT REFERENCES students(email) ON DELETE CASCADE,
    assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
    best_score DECIMAL(5,2) DEFAULT 0.0,
    submission_count INTEGER DEFAULT 0,
    first_submission TIMESTAMPTZ,
    last_submission TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_email, assignment_id)
);

-- ==============================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Submissions indexes
CREATE INDEX idx_submissions_student_email ON submissions(student_email);
CREATE INDEX idx_submissions_timestamp ON submissions(timestamp DESC);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_is_late ON submissions(is_late);

-- Students indexes
CREATE INDEX idx_students_last_submission ON students(last_submission DESC);

-- Assignments indexes
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_assignments_is_active ON assignments(is_active);

-- Student assignments indexes
CREATE INDEX idx_student_assignments_student_email ON student_assignments(student_email);
CREATE INDEX idx_student_assignments_assignment_id ON student_assignments(assignment_id);
CREATE INDEX idx_student_assignments_is_completed ON student_assignments(is_completed);

-- ==============================================
-- STEP 4: CREATE TRIGGER FUNCTION
-- ==============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================
-- STEP 5: CREATE TRIGGERS
-- ==============================================

-- Create triggers for updated_at
CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at 
    BEFORE UPDATE ON submissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON students 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_assignments_updated_at 
    BEFORE UPDATE ON student_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_assignments ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 7: CREATE SECURITY POLICIES
-- ==============================================

-- Create policies (allow all operations for now)
CREATE POLICY "Allow all operations on assignments" ON assignments
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on submissions" ON submissions
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on students" ON students
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on student_assignments" ON student_assignments
    FOR ALL USING (true);

-- ==============================================
-- STEP 8: INSERT SAMPLE DATA
-- ==============================================

-- Insert default assignment
INSERT INTO assignments (id, title, description, due_date, created_by, max_attempts, late_penalty_percentage)
VALUES 
    ('default-assignment', 'Stock Portfolio Application', 'Java programming assignment for stock portfolio management', NOW() + INTERVAL '7 days', 'admin', 3, 10.0);

-- Insert admin user
INSERT INTO students (email, name, submissions, best_score, first_submission, last_submission, submission_count)
VALUES 
    ('admin@example.com', 'Admin User', '[]', 0, NOW(), NOW(), 0);

-- ==============================================
-- STEP 9: VERIFY SETUP
-- ==============================================

-- Test queries to verify everything works
SELECT 'Assignments table created successfully' as status, COUNT(*) as count FROM assignments;
SELECT 'Students table created successfully' as status, COUNT(*) as count FROM students;
SELECT 'Submissions table created successfully' as status, COUNT(*) as count FROM submissions;
SELECT 'Student assignments table created successfully' as status, COUNT(*) as count FROM student_assignments;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================
SELECT 'Database schema setup completed successfully!' as message;
