/**
 * Integration script to connect Admin Dashboard with Java Grader
 * This script handles the communication between the two systems
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class JavaGraderIntegration {
    constructor(adminDashboardUrl, javaGraderUrl) {
        this.adminDashboardUrl = adminDashboardUrl;
        this.javaGraderUrl = javaGraderUrl;
        this.supabase = null;
    }

    /**
     * Initialize Supabase connection
     */
    async initializeSupabase() {
        const { createClient } = require('@supabase/supabase-js');
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    /**
     * Process a submission from Java Grader and store in Supabase
     */
    async processSubmission(submissionData) {
        try {
            // Extract student information
            const studentEmail = this.extractStudentEmail(submissionData);
            const studentName = this.extractStudentName(submissionData);
            
            if (!studentEmail) {
                throw new Error('Student email not found in submission');
            }

            // Create or get student record
            const { data: student, error: studentError } = await this.supabase
                .rpc('create_student_if_not_exists', {
                    p_email: studentEmail,
                    p_full_name: studentName || 'Unknown Student'
                });

            if (studentError) throw studentError;

            // Prepare submission record
            const submissionRecord = {
                student_id: student,
                session_id: submissionData.sessionId || `session_${Date.now()}`,
                files_uploaded: submissionData.files || [],
                compilation_successful: submissionData.success || false,
                execution_successful: submissionData.success || false,
                total_score: submissionData.grades?.total || 0,
                max_possible_score: 100,
                transaction_history_score: submissionData.grades?.transactionHistoryClass || 0,
                menu_transactions_score: submissionData.grades?.menuAndTransactions || 0,
                display_functionality_score: submissionData.grades?.displayFunctionality || 0,
                coding_standards_score: submissionData.grades?.codingStandards || 0,
                test_cases_passed: submissionData.testResults?.filter(t => t.success).length || 0,
                test_cases_total: submissionData.testResults?.length || 4,
                test_results: submissionData.testResults || [],
                has_transaction_history: submissionData.analysis?.hasTransactionHistory || false,
                has_portfolio_manager: submissionData.analysis?.hasPortfolioManager || false,
                has_name_signature: submissionData.analysis?.nameSignature?.detectedName ? true : false,
                detected_name: submissionData.analysis?.nameSignature?.detectedName || null,
                compilation_errors: submissionData.errors?.compilation || null,
                execution_errors: submissionData.errors?.execution || null,
                error_log: submissionData.errors || null,
                processing_time_ms: submissionData.processingTime || null,
                server_response: submissionData
            };

            // Insert submission record
            const { data: submission, error: submissionError } = await this.supabase
                .from('submissions')
                .insert(submissionRecord)
                .select()
                .single();

            if (submissionError) throw submissionError;

            // Log errors if any
            if (submissionData.errors) {
                await this.logErrors(submission.id, submissionData.errors);
            }

            // Update student assignment record
            await this.updateStudentAssignment(student, submission.total_score);

            return submission;

        } catch (error) {
            console.error('Error processing submission:', error);
            throw error;
        }
    }

    /**
     * Extract student email from submission data
     */
    extractStudentEmail(submissionData) {
        // Try multiple methods to extract email
        if (submissionData.studentEmail) return submissionData.studentEmail;
        if (submissionData.email) return submissionData.email;
        if (submissionData.files) {
            // Look for email in file content
            for (const file of submissionData.files) {
                if (file.content) {
                    const emailMatch = file.content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.edu)/);
                    if (emailMatch) return emailMatch[1];
                }
            }
        }
        return null;
    }

    /**
     * Extract student name from submission data
     */
    extractStudentName(submissionData) {
        if (submissionData.studentName) return submissionData.studentName;
        if (submissionData.name) return submissionData.name;
        if (submissionData.analysis?.nameSignature?.detectedName) {
            return submissionData.analysis.nameSignature.detectedName;
        }
        return null;
    }

    /**
     * Log errors to the error_logs table
     */
    async logErrors(submissionId, errors) {
        const errorLogs = [];

        if (errors.compilation) {
            errorLogs.push({
                submission_id: submissionId,
                error_type: 'compilation',
                error_message: errors.compilation,
                severity: 'error'
            });
        }

        if (errors.execution) {
            errorLogs.push({
                submission_id: submissionId,
                error_type: 'execution',
                error_message: errors.execution,
                severity: 'error'
            });
        }

        if (errors.validation) {
            errorLogs.push({
                submission_id: submissionId,
                error_type: 'validation',
                error_message: errors.validation,
                severity: 'warning'
            });
        }

        if (errorLogs.length > 0) {
            const { error } = await this.supabase
                .from('error_logs')
                .insert(errorLogs);

            if (error) {
                console.error('Error logging errors:', error);
            }
        }
    }

    /**
     * Update student assignment record
     */
    async updateStudentAssignment(studentId, score) {
        try {
            // Get the current assignment (assuming there's one active assignment)
            const { data: assignment, error: assignmentError } = await this.supabase
                .from('assignments')
                .select('id')
                .eq('is_active', true)
                .single();

            if (assignmentError || !assignment) {
                console.log('No active assignment found');
                return;
            }

            // Check if student assignment record exists
            const { data: existingRecord, error: existingError } = await this.supabase
                .from('student_assignments')
                .select('*')
                .eq('student_id', studentId)
                .eq('assignment_id', assignment.id)
                .single();

            if (existingError && existingError.code !== 'PGRST116') {
                throw existingError;
            }

            if (existingRecord) {
                // Update existing record
                const updateData = {
                    total_attempts: existingRecord.total_attempts + 1,
                    last_attempt_at: new Date().toISOString()
                };

                if (score > existingRecord.best_score) {
                    updateData.best_score = score;
                }

                const { error: updateError } = await this.supabase
                    .from('student_assignments')
                    .update(updateData)
                    .eq('id', existingRecord.id);

                if (updateError) throw updateError;
            } else {
                // Create new record
                const { error: insertError } = await this.supabase
                    .from('student_assignments')
                    .insert({
                        student_id: studentId,
                        assignment_id: assignment.id,
                        best_score: score,
                        total_attempts: 1,
                        last_attempt_at: new Date().toISOString()
                    });

                if (insertError) throw insertError;
            }
        } catch (error) {
            console.error('Error updating student assignment:', error);
        }
    }

    /**
     * Get analytics data for the admin dashboard
     */
    async getAnalyticsData() {
        try {
            const [overview, students, errors, grades] = await Promise.all([
                this.getOverviewData(),
                this.getStudentPerformanceData(),
                this.getErrorAnalysisData(),
                this.getGradeDistributionData()
            ]);

            return {
                overview,
                students,
                errors,
                grades
            };
        } catch (error) {
            console.error('Error getting analytics data:', error);
            throw error;
        }
    }

    /**
     * Get overview data
     */
    async getOverviewData() {
        const { count: totalStudents } = await this.supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        const { count: totalSubmissions } = await this.supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: submissionsToday } = await this.supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .gte('uploaded_at', today.toISOString());

        const { data: avgScoreData } = await this.supabase
            .from('submissions')
            .select('total_score')
            .not('total_score', 'is', null);

        const averageScore = avgScoreData && avgScoreData.length > 0 
            ? avgScoreData.reduce((sum, sub) => sum + sub.total_score, 0) / avgScoreData.length 
            : 0;

        const { count: errorCount } = await this.supabase
            .from('error_logs')
            .select('*', { count: 'exact', head: true });

        return {
            totalStudents,
            totalSubmissions,
            submissionsToday,
            averageScore: Math.round(averageScore * 100) / 100,
            errorCount
        };
    }

    /**
     * Get student performance data
     */
    async getStudentPerformanceData() {
        const { data, error } = await this.supabase
            .from('student_performance_summary')
            .select('*')
            .order('best_score', { ascending: false });

        if (error) throw error;
        return data;
    }

    /**
     * Get error analysis data
     */
    async getErrorAnalysisData() {
        const { data, error } = await this.supabase
            .from('error_analysis')
            .select('*');

        if (error) throw error;
        return data;
    }

    /**
     * Get grade distribution data
     */
    async getGradeDistributionData() {
        const { data, error } = await this.supabase
            .from('submissions')
            .select('total_score')
            .not('total_score', 'is', null);

        if (error) throw error;

        const distribution = {
            'A (90-100)': 0,
            'B (80-89)': 0,
            'C (70-79)': 0,
            'D (60-69)': 0,
            'F (0-59)': 0
        };

        data.forEach(submission => {
            const score = submission.total_score;
            if (score >= 90) distribution['A (90-100)']++;
            else if (score >= 80) distribution['B (80-89)']++;
            else if (score >= 70) distribution['C (70-79)']++;
            else if (score >= 60) distribution['D (60-69)']++;
            else distribution['F (0-59)']++;
        });

        return distribution;
    }

    /**
     * Export data to CSV
     */
    async exportDataToCSV(type = 'students') {
        try {
            let data, filename;
            
            switch (type) {
                case 'students':
                    data = await this.getStudentPerformanceData();
                    filename = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'submissions':
                    const { data: submissions } = await this.supabase
                        .from('submissions')
                        .select(`
                            *,
                            students(email, full_name, student_id)
                        `);
                    data = submissions;
                    filename = `submissions_export_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                default:
                    throw new Error('Invalid export type');
            }

            return { data, filename };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * Webhook endpoint to receive submissions from Java Grader
     */
    async handleWebhook(req, res) {
        try {
            const submissionData = req.body;
            const result = await this.processSubmission(submissionData);
            
            res.json({
                success: true,
                submissionId: result.id,
                message: 'Submission processed successfully'
            });
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = JavaGraderIntegration;
