/**
 * Database Service for Java Grader System
 * Uses multiple storage strategies for data persistence
 */

const fs = require('fs-extra');
const path = require('path');

class DatabaseService {
    constructor() {
        // Multiple storage locations for redundancy
        this.storagePaths = [
            '/tmp/data.json',           // Vercel temp (ephemeral)
            './data/data.json',         // Local persistent
            './uploads/data.json'       // Alternative location
        ];
        
        this.data = {
            submissions: [],
            students: [],
            lastSaved: null,
            version: '1.0.0'
        };
        
        this.loadData();
    }

    // Load data from any available storage
    loadData() {
        console.log('🔄 Loading data from storage...');
        
        for (const storagePath of this.storagePaths) {
            try {
                if (fs.existsSync(storagePath)) {
                    const data = fs.readFileSync(storagePath, 'utf8');
                    const parsed = JSON.parse(data);
                    
                    if (parsed.submissions && parsed.students) {
                        this.data = parsed;
                        console.log(`✅ Loaded ${this.data.submissions.length} submissions and ${this.data.students.length} students from ${storagePath}`);
                        return;
                    }
                }
            } catch (error) {
                console.log(`⚠️ Failed to load from ${storagePath}:`, error.message);
            }
        }
        
        console.log('📊 No existing data found, starting fresh');
    }

    // Save data to all available storage locations
    saveData() {
        console.log('💾 Saving data to storage...');
        
        this.data.lastSaved = new Date().toISOString();
        const dataString = JSON.stringify(this.data, null, 2);
        
        let savedCount = 0;
        
        for (const storagePath of this.storagePaths) {
            try {
                // Ensure directory exists
                const dir = path.dirname(storagePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(storagePath, dataString);
                savedCount++;
                console.log(`✅ Saved to ${storagePath}`);
            } catch (error) {
                console.log(`⚠️ Failed to save to ${storagePath}:`, error.message);
            }
        }
        
        console.log(`💾 Data saved to ${savedCount}/${this.storagePaths.length} locations`);
        return savedCount > 0;
    }

    // Get all submissions
    getSubmissions() {
        return this.data.submissions || [];
    }

    // Get all students
    getStudents() {
        return this.data.students || [];
    }

    // Add a new submission
    addSubmission(submission) {
        this.data.submissions.push(submission);
        this.saveData();
        return submission;
    }

    // Update student record
    updateStudent(studentEmail, studentData) {
        let student = this.data.students.find(s => s.email === studentEmail);
        
        if (!student) {
            // Create new student
            student = {
                email: studentEmail,
                name: studentData.name,
                submissions: [],
                bestScore: 0,
                firstSubmission: new Date().toISOString(),
                lastSubmission: new Date().toISOString()
            };
            this.data.students.push(student);
            console.log(`📝 New student registered: ${studentData.name} (${studentEmail})`);
        } else {
            // Update existing student
            student.name = studentData.name;
            student.lastSubmission = new Date().toISOString();
            console.log(`📝 Existing student updated: ${studentData.name} (${studentEmail}) - Attempt #${student.submissions.length + 1}`);
        }
        
        // Add submission to student's history
        student.submissions.push(studentData.submission);
        
        // Update best score
        if (studentData.submission.grades.total > student.bestScore) {
            student.bestScore = studentData.submission.grades.total;
            console.log(`🏆 New best score for ${studentData.name}: ${studentData.submission.grades.total}/100`);
        }
        
        this.saveData();
        return student;
    }

    // Get student by email
    getStudent(email) {
        return this.data.students.find(s => s.email === email);
    }

    // Get data statistics
    getStats() {
        return {
            submissions: this.data.submissions.length,
            students: this.data.students.length,
            lastSaved: this.data.lastSaved,
            storageLocations: this.storagePaths.map(path => ({
                path,
                exists: fs.existsSync(path),
                size: fs.existsSync(path) ? fs.statSync(path).size : 0,
                lastModified: fs.existsSync(path) ? fs.statSync(path).mtime.toISOString() : null
            }))
        };
    }

    // Backup data to a specific location
    backupData(backupPath) {
        try {
            const dir = path.dirname(backupPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const backupData = {
                ...this.data,
                backupDate: new Date().toISOString(),
                backupVersion: '1.0.0'
            };
            
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
            console.log(`💾 Backup created at ${backupPath}`);
            return true;
        } catch (error) {
            console.error('❌ Backup failed:', error);
            return false;
        }
    }

    // Restore data from backup
    restoreData(backupPath) {
        try {
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file not found');
            }
            
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            this.data = backupData;
            this.saveData();
            console.log(`🔄 Data restored from ${backupPath}`);
            return true;
        } catch (error) {
            console.error('❌ Restore failed:', error);
            return false;
        }
    }
}

module.exports = DatabaseService;
