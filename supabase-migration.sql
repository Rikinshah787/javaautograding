-- Migration script to fix existing Supabase database
-- Run this if you already have the old schema

-- Add missing columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_submission TIMESTAMPTZ;

-- Create assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS assignments (
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

-- Add assignment_id column to submissions if it doesn't exist
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS late_penalty_applied DECIMAL(5,2) DEFAULT 0.0;

-- Create student_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_assignments (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_is_late ON submissions(is_late);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_is_active ON assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_student_assignments_student_email ON student_assignments(student_email);
CREATE INDEX IF NOT EXISTS idx_student_assignments_assignment_id ON student_assignments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_assignments_is_completed ON student_assignments(is_completed);

-- Insert default assignment if it doesn't exist
INSERT INTO assignments (id, title, description, due_date, created_by, max_attempts, late_penalty_percentage)
VALUES 
    ('default-assignment', 'Stock Portfolio Application', 'Java programming assignment for stock portfolio management', NOW() + INTERVAL '7 days', 'admin', 3, 10.0)
ON CONFLICT (id) DO NOTHING;

-- Update existing submissions to have assignment_id
UPDATE submissions 
SET assignment_id = 'default-assignment' 
WHERE assignment_id IS NULL;
