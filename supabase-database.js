/**
 * Supabase Database Service for Java Grader System
 * Uses Supabase for persistent cloud storage
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseDatabaseService {
    constructor() {
        // Supabase configuration
        this.supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
        this.supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
        
        // Initialize Supabase client
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        
        // Local cache for performance
        this.cache = {
            submissions: [],
            students: [],
            lastSync: null
        };
        
        this.loadData();
    }

    // Load data from Supabase
    async loadData() {
        try {
            console.log('🔄 Loading data from Supabase...');
            
            // Load submissions
            const { data: submissions, error: submissionsError } = await this.supabase
                .from('submissions')
                .select('*')
                .order('timestamp', { ascending: false });
            
            if (submissionsError) {
                console.error('❌ Error loading submissions:', submissionsError);
            } else {
                this.cache.submissions = submissions || [];
                console.log(`✅ Loaded ${this.cache.submissions.length} submissions from Supabase`);
            }
            
            // Load students
            const { data: students, error: studentsError } = await this.supabase
                .from('students')
                .select('*')
                .order('last_submission', { ascending: false });
            
            if (studentsError) {
                console.error('❌ Error loading students:', studentsError);
            } else {
                this.cache.students = students || [];
                console.log(`✅ Loaded ${this.cache.students.length} students from Supabase`);
            }
            
            this.cache.lastSync = new Date().toISOString();
            
        } catch (error) {
            console.error('❌ Error loading data from Supabase:', error);
        }
    }

    // Save data to Supabase
    async saveData() {
        try {
            console.log('💾 Saving data to Supabase...');
            
            // This is handled by individual save methods
            // No bulk save needed as we save individual records
            
        } catch (error) {
            console.error('❌ Error saving data to Supabase:', error);
        }
    }

    // Get all submissions
    getSubmissions() {
        return this.cache.submissions || [];
    }

    // Get all students
    getStudents() {
        return this.cache.students || [];
    }

    // Add a new submission
    async addSubmission(submission, assignmentId = 'default-assignment') {
        try {
            // Get assignment details to check due date
            const { data: assignment, error: assignmentError } = await this.supabase
                .from('assignments')
                .select('*')
                .eq('id', assignmentId)
                .single();
            
            if (assignmentError) {
                console.error('❌ Error fetching assignment:', assignmentError);
                return null;
            }
            
            // Check if submission is late
            const submissionTime = new Date(submission.timestamp);
            const dueDate = new Date(assignment.due_date);
            const isLate = submissionTime > dueDate;
            
            // Calculate late penalty
            let latePenalty = 0;
            if (isLate) {
                latePenalty = (submission.grades.total * assignment.late_penalty_percentage) / 100;
            }
            
            const { data, error } = await this.supabase
                .from('submissions')
                .insert([{
                    id: submission.id,
                    assignment_id: assignmentId,
                    student_name: submission.studentName,
                    student_email: submission.studentEmail,
                    timestamp: submission.timestamp,
                    is_late: isLate,
                    late_penalty_applied: latePenalty,
                    grades: submission.grades,
                    compilation_success: submission.compilationSuccess,
                    execution_success: submission.executionSuccess,
                    compilation_errors: submission.compilationErrors,
                    execution_output: submission.executionOutput,
                    feedback: submission.feedback,
                    test_results: submission.testResults,
                    analysis: submission.analysis
                }])
                .select();
            
            if (error) {
                console.error('❌ Error saving submission:', error);
                return null;
            }
            
            // Update cache
            this.cache.submissions.unshift(data[0]);
            console.log(`✅ Submission saved to Supabase: ${submission.id} (Late: ${isLate}, Penalty: ${latePenalty})`);
            
            return data[0];
            
        } catch (error) {
            console.error('❌ Error adding submission:', error);
            return null;
        }
    }

    // Update student record
    async updateStudent(studentEmail, studentData) {
        try {
            // Check if student exists
            const { data: existingStudent, error: fetchError } = await this.supabase
                .from('students')
                .select('*')
                .eq('email', studentEmail)
                .single();
            
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('❌ Error fetching student:', fetchError);
                return null;
            }
            
            if (existingStudent) {
                // Update existing student
                const updatedSubmissions = [...existingStudent.submissions, studentData.submission];
                const bestScore = Math.max(...updatedSubmissions.map(s => s.grades.total));
                
                const { data, error } = await this.supabase
                    .from('students')
                    .update({
                        name: studentData.name,
                        submissions: updatedSubmissions,
                        best_score: bestScore,
                        last_submission: new Date().toISOString(),
                        submission_count: updatedSubmissions.length
                    })
                    .eq('email', studentEmail)
                    .select();
                
                if (error) {
                    console.error('❌ Error updating student:', error);
                    return null;
                }
                
                // Update cache
                const studentIndex = this.cache.students.findIndex(s => s.email === studentEmail);
                if (studentIndex !== -1) {
                    this.cache.students[studentIndex] = data[0];
                }
                
                console.log(`✅ Student updated in Supabase: ${studentData.name}`);
                return data[0];
                
            } else {
                // Create new student
                const newStudent = {
                    email: studentEmail,
                    name: studentData.name,
                    submissions: [studentData.submission],
                    best_score: studentData.submission.grades.total,
                    first_submission: new Date().toISOString(),
                    last_submission: new Date().toISOString(),
                    submission_count: 1
                };
                
                const { data, error } = await this.supabase
                    .from('students')
                    .insert([newStudent])
                    .select();
                
                if (error) {
                    console.error('❌ Error creating student:', error);
                    return null;
                }
                
                // Update cache
                this.cache.students.unshift(data[0]);
                console.log(`✅ New student created in Supabase: ${studentData.name}`);
                return data[0];
            }
            
        } catch (error) {
            console.error('❌ Error updating student:', error);
            return null;
        }
    }

    // Get student by email
    getStudent(email) {
        return this.cache.students.find(s => s.email === email);
    }

    // Get data statistics
    getStats() {
        return {
            submissions: this.cache.submissions.length,
            students: this.cache.students.length,
            lastSync: this.cache.lastSync,
            database: 'supabase',
            status: 'connected'
        };
    }

    // Test Supabase connection
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('submissions')
                .select('count')
                .limit(1);
            
            if (error) {
                return { success: false, error: error.message };
            }
            
            return { success: true, message: 'Supabase connection successful' };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = SupabaseDatabaseService;
