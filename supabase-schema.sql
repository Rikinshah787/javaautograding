-- Supabase Database Schema for Java Portfolio Grader Admin Dashboard
-- Professional-grade schema for university-level student tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Students table
CREATE TABLE students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) UNIQUE,
    institution VARCHAR(255) DEFAULT 'Arizona State University',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Email validation constraint
    CONSTRAINT valid_edu_email CHECK (email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.edu$')
);

-- Submissions table (tracks each upload attempt)
CREATE TABLE submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    files_uploaded JSONB NOT NULL, -- Array of file names and sizes
    compilation_successful BOOLEAN DEFAULT false,
    execution_successful BOOLEAN DEFAULT false,
    total_score INTEGER DEFAULT 0,
    max_possible_score INTEGER DEFAULT 100,
    
    -- Detailed scoring breakdown
    transaction_history_score INTEGER DEFAULT 0,
    menu_transactions_score INTEGER DEFAULT 0,
    display_functionality_score INTEGER DEFAULT 0,
    coding_standards_score INTEGER DEFAULT 0,
    
    -- Test case results
    test_cases_passed INTEGER DEFAULT 0,
    test_cases_total INTEGER DEFAULT 4,
    test_results JSONB, -- Detailed test case results
    
    -- Code analysis
    has_transaction_history BOOLEAN DEFAULT false,
    has_portfolio_manager BOOLEAN DEFAULT false,
    has_name_signature BOOLEAN DEFAULT false,
    detected_name VARCHAR(255),
    
    -- Error tracking
    compilation_errors TEXT,
    execution_errors TEXT,
    error_log JSONB,
    
    -- Processing metadata
    processing_time_ms INTEGER,
    server_response JSONB,
    
    CONSTRAINT valid_score CHECK (total_score >= 0 AND total_score <= max_possible_score)
);

-- Error logs table (detailed error tracking)
CREATE TABLE error_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    error_type VARCHAR(100) NOT NULL, -- 'compilation', 'execution', 'validation', 'timeout'
    error_message TEXT NOT NULL,
    error_details JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Professors/Instructors table
CREATE TABLE professors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    institution VARCHAR(255) DEFAULT 'Arizona State University',
    department VARCHAR(255),
    professor_id VARCHAR(50) UNIQUE NOT NULL, -- Custom professor ID
    password_hash VARCHAR(255) NOT NULL, -- Hashed password
    is_admin BOOLEAN DEFAULT false, -- Admin privileges
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_professor_email CHECK (email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.edu$')
);

-- Course assignments table
CREATE TABLE assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    max_attempts INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student assignment enrollments
CREATE TABLE student_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    best_score INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(student_id, assignment_id)
);

-- Analytics and reporting views
CREATE VIEW student_performance_summary AS
SELECT 
    s.id as student_id,
    s.email,
    s.full_name,
    s.student_id as student_number,
    COUNT(sub.id) as total_submissions,
    MAX(sub.total_score) as best_score,
    AVG(sub.total_score) as average_score,
    COUNT(CASE WHEN sub.compilation_successful THEN 1 END) as successful_compilations,
    COUNT(CASE WHEN sub.execution_successful THEN 1 END) as successful_executions,
    COUNT(CASE WHEN sub.has_name_signature THEN 1 END) as submissions_with_name,
    MIN(sub.uploaded_at) as first_submission,
    MAX(sub.uploaded_at) as last_submission
FROM students s
LEFT JOIN submissions sub ON s.id = sub.student_id
WHERE s.is_active = true
GROUP BY s.id, s.email, s.full_name, s.student_id;

-- Error analysis view
CREATE VIEW error_analysis AS
SELECT 
    el.error_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT el.submission_id) as affected_submissions,
    COUNT(DISTINCT s.student_id) as affected_students,
    AVG(CASE WHEN sub.total_score IS NOT NULL THEN sub.total_score ELSE 0 END) as avg_score_when_error
FROM error_logs el
JOIN submissions sub ON el.submission_id = sub.id
JOIN students s ON sub.student_id = s.id
GROUP BY el.error_type
ORDER BY error_count DESC;

-- Indexes for performance
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_uploaded_at ON submissions(uploaded_at);
CREATE INDEX idx_submissions_total_score ON submissions(total_score);
CREATE INDEX idx_error_logs_submission_id ON error_logs(submission_id);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);

-- Row Level Security (RLS) policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for professors to access all data
CREATE POLICY "Professors can view all students" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM professors p 
            WHERE p.email = auth.jwt() ->> 'email' 
            AND p.is_active = true
        )
    );

CREATE POLICY "Professors can view all submissions" ON submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM professors p 
            WHERE p.email = auth.jwt() ->> 'email' 
            AND p.is_active = true
        )
    );

CREATE POLICY "Professors can view all error logs" ON error_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM professors p 
            WHERE p.email = auth.jwt() ->> 'email' 
            AND p.is_active = true
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create student if not exists
CREATE OR REPLACE FUNCTION create_student_if_not_exists(
    p_email VARCHAR(255),
    p_full_name VARCHAR(255),
    p_student_id VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    student_uuid UUID;
BEGIN
    -- Try to get existing student
    SELECT id INTO student_uuid FROM students WHERE email = p_email;
    
    -- If not found, create new student
    IF student_uuid IS NULL THEN
        INSERT INTO students (email, full_name, student_id)
        VALUES (p_email, p_full_name, p_student_id)
        RETURNING id INTO student_uuid;
    END IF;
    
    RETURN student_uuid;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO professors (email, full_name, department) VALUES
('prof.smith@asu.edu', 'Dr. Sarah Smith', 'Computer Science'),
('prof.johnson@asu.edu', 'Prof. Michael Johnson', 'Computer Science');

INSERT INTO assignments (professor_id, title, description, due_date) VALUES
((SELECT id FROM professors WHERE email = 'prof.smith@asu.edu'), 
 'Java Portfolio Application', 
 'Build a stock portfolio management system with transaction tracking', 
 NOW() + INTERVAL '2 weeks');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
