/**
 * Vercel-Compatible Java Grader System
 * Simplified version for serverless deployment
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: 'java-grader-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// File upload configuration
const upload = multer({
    dest: '/tmp/',
    limits: { fileSize: 10 * 1024 * 1024 }
});

// In-memory storage for Vercel
let submissions = [];
let students = [];

// Admin credentials
const adminCredentials = {
    username: 'admin',
    password: '$2b$10$A2OjFD70ehbeY3QZBWUNBuuyE5yoU.OM9NLXifVVLb3fOnBKeWqzy'
};

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    } else {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Java Grader System is running on Vercel',
        timestamp: new Date().toISOString(),
        version: '2.0.0-vercel',
        environment: 'serverless'
    });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        if (username === adminCredentials.username) {
            const passwordMatch = await bcrypt.compare(password, adminCredentials.password);
            
            if (passwordMatch) {
                req.session.authenticated = true;
                req.session.username = username;
                
                return res.json({
                    success: true,
                    message: 'Login successful',
                    user: { username }
                });
            }
        }
        
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
        
        res.clearCookie('connect.sid');
        return res.json({
            success: true,
            message: 'Logout successful'
        });
    });
});

app.get('/api/auth/status', (req, res) => {
    res.json({
        authenticated: !!(req.session && req.session.authenticated),
        user: req.session ? { username: req.session.username } : null
    });
});

// Student submission endpoint (Vercel-compatible)
app.post('/api/upload', upload.fields([
    { name: 'transactionHistory', maxCount: 1 },
    { name: 'portfolioManager', maxCount: 1 }
]), async (req, res) => {
    try {
        const { studentName, studentEmail } = req.body;
        
        if (!req.files || !req.files.transactionHistory || !req.files.portfolioManager) {
            return res.status(400).json({ error: 'Both TransactionHistory.java and PortfolioManager.java files are required' });
        }

        // Simulate grading for Vercel (no Java compilation)
        const mockResult = await simulateGrading(studentName, studentEmail, req.files);
        
        // Store submission
        const submission = {
            id: `session_${Date.now()}`,
            studentName,
            studentEmail,
            timestamp: new Date().toISOString(),
            ...mockResult
        };
        
        submissions.push(submission);
        
        // Update student record
        let student = students.find(s => s.email === studentEmail);
        if (!student) {
            student = {
                email: studentEmail,
                name: studentName,
                submissions: [],
                bestScore: 0
            };
            students.push(student);
        }
        
        student.submissions.push(submission);
        if (mockResult.grades.total > student.bestScore) {
            student.bestScore = mockResult.grades.total;
        }

        res.json({
            success: true,
            message: 'Submission processed successfully (Vercel Demo Mode)',
            ...mockResult
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process submission' });
    }
});

// Admin dashboard data
app.get('/api/admin/dashboard', requireAuth, (req, res) => {
    const totalStudents = students.length;
    const totalSubmissions = submissions.length;
    const averageScore = submissions.length > 0 
        ? submissions.reduce((sum, sub) => sum + sub.grades.total, 0) / submissions.length 
        : 0;
    
    res.json({
        totalStudents,
        totalSubmissions,
        averageScore: Math.round(averageScore * 100) / 100,
        recentSubmissions: submissions.slice(-10).reverse(),
        students: students.map(s => ({
            ...s,
            submissionCount: s.submissions.length,
            lastSubmission: s.submissions[s.submissions.length - 1]?.timestamp
        }))
    });
});

// Get student details
app.get('/api/admin/student/:email', requireAuth, (req, res) => {
    const student = students.find(s => s.email === req.params.email);
    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
});

// Simulate grading for Vercel (no Java compilation)
async function simulateGrading(studentName, studentEmail, files) {
    // Read file contents
    const transactionContent = await fs.readFile(files.transactionHistory[0].path, 'utf8');
    const portfolioContent = await fs.readFile(files.portfolioManager[0].path, 'utf8');
    
    // Basic analysis (simplified for Vercel)
    const analysis = {
        transactionHistory: {
            hasTickerField: /private\s+String\s+ticker/i.test(transactionContent),
            hasTransDateField: /private\s+String\s+transDate/i.test(transactionContent),
            hasTransTypeField: /private\s+String\s+transType/i.test(transactionContent),
            hasQtyField: /private\s+double\s+qty/i.test(transactionContent),
            hasCostBasisField: /private\s+double\s+costBasis/i.test(transactionContent),
            hasDefaultConstructor: /public\s+TransactionHistory\s*\(\s*\)/.test(transactionContent),
            hasOverloadedConstructor: /public\s+TransactionHistory\s*\([^)]+\)/.test(transactionContent),
            hasToStringMethod: /public\s+String\s+toString\s*\(/i.test(transactionContent)
        },
        portfolioManager: {
            hasPortfolioManagerClass: /class\s+PortfolioManager/i.test(portfolioContent),
            hasMainMethod: /public\s+static\s+void\s+main\s*\(/.test(portfolioContent),
            hasArrayListAttribute: /ArrayList\s*<\s*TransactionHistory\s*>\s+portfolioList/i.test(portfolioContent),
            hasMenuDisplay: /menu|choice|option|Enter option/i.test(portfolioContent)
        },
        display: {
            hasNameInMenu: new RegExp(studentName, 'i').test(portfolioContent),
            hasNameInHistory: new RegExp(studentName, 'i').test(portfolioContent)
        },
        standards: {
            hasTryCatch: /try\s*\{[\s\S]*?catch/i.test(portfolioContent),
            hasHeaderComments: /\/\*[\s\S]*?\*\/|\/\/.*header|\/\/.*name|\/\/.*date/i.test(transactionContent)
        }
    };
    
    // Calculate grades (VERY EASY for Vercel demo)
    const grades = {
        transactionHistory: Math.min(25, Math.floor(Math.random() * 10) + 20), // 20-25
        portfolioManager: Math.min(25, Math.floor(Math.random() * 10) + 20),   // 20-25
        display: Math.min(25, Math.floor(Math.random() * 10) + 20),            // 20-25
        standards: Math.min(25, Math.floor(Math.random() * 10) + 20),          // 20-25
        total: 0
    };
    
    grades.total = grades.transactionHistory + grades.portfolioManager + grades.display + grades.standards;
    
    // Generate feedback
    const feedback = [
        '✅ Code analysis completed (Vercel Demo Mode)',
        '⚠️ Note: Java compilation not available on Vercel',
        '📊 This is a demonstration of the grading system',
        `📋 TransactionHistory Class: ${grades.transactionHistory}/25 points`,
        `📊 PortfolioManager Class: ${grades.portfolioManager}/25 points`,
        `📱 Display Requirements: ${grades.display}/25 points`,
        `🔧 Coding Standards: ${grades.standards}/25 points`,
        `\n🎯 **TOTAL SCORE: ${grades.total}/100**`,
        '\n🎉 **DEMO MODE**: This is a Vercel-compatible demonstration!'
    ];
    
    return {
        analysis,
        grades,
        testResults: [{
            name: 'Vercel Demo Test',
            success: true,
            description: 'Demo mode - Java compilation not available on Vercel'
        }],
        feedback,
        compilationSuccess: true, // Always true for demo
        executionSuccess: true,   // Always true for demo
        compilationErrors: '',
        executionOutput: 'Demo mode - Java execution not available on Vercel serverless environment'
    };
}

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve admin page (protected)
app.get('/admin', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.redirect('/login');
    }
});

// Export for Vercel
module.exports = app;
