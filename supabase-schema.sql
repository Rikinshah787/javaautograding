-- Supabase Database Schema for Java Grader System
-- Run this in your Supabase SQL editor

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    grades JSONB NOT NULL,
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

-- Create students table
CREATE TABLE IF NOT EXISTS students (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_student_email ON submissions(student_email);
CREATE INDEX IF NOT EXISTS idx_submissions_timestamp ON submissions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_students_last_submission ON students(last_submission DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_submissions_updated_at 
    BEFORE UPDATE ON submissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON students 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your needs)
-- For now, allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on submissions" ON submissions
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on students" ON students
    FOR ALL USING (true);

-- Insert some sample data (optional)
INSERT INTO students (email, name, submissions, best_score, first_submission, last_submission, submission_count)
VALUES 
    ('admin@example.com', 'Admin User', '[]', 0, NOW(), NOW(), 0)
ON CONFLICT (email) DO NOTHING;