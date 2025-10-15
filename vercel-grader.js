/**
 * Vercel-Compatible Java Grader System with External Java Compilation
 * Uses online Java compiler service for actual compilation
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const JavaCompilerService = require('./java-compiler-service');

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
        message: 'Java Grader System with External Compilation',
        timestamp: new Date().toISOString(),
        version: '2.0.0-vercel-java',
        environment: 'serverless-with-java'
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

// Student submission endpoint with REAL Java compilation
app.post('/api/upload', upload.fields([
    { name: 'transactionHistory', maxCount: 1 },
    { name: 'portfolioManager', maxCount: 1 }
]), async (req, res) => {
    try {
        const { studentName, studentEmail } = req.body;
        
        if (!req.files || !req.files.transactionHistory || !req.files.portfolioManager) {
            return res.status(400).json({ error: 'Both TransactionHistory.java and PortfolioManager.java files are required' });
        }

        // Read file contents
        const transactionContent = await fs.readFile(req.files.transactionHistory[0].path, 'utf8');
        const portfolioContent = await fs.readFile(req.files.portfolioManager[0].path, 'utf8');
        
        console.log('📤 Processing submission for:', studentName);
        
        // REAL Java compilation using external service
        const compiler = new JavaCompilerService();
        const compilationResult = await compiler.compileAndRun(transactionContent, portfolioContent);
        
        // Analyze code structure
        const analysis = analyzeCodeStructure(transactionContent, portfolioContent, studentName);
        
        // Calculate grades
        const grades = calculateGrades(analysis, compilationResult.compilationSuccess, compilationResult.executionSuccess, compilationResult.testResults);
        
        // Generate feedback
        const feedback = generateFeedback(analysis, grades, compilationResult.compilationSuccess, compilationResult.executionSuccess, compilationResult.compilationErrors, compilationResult.executionOutput, compilationResult.testResults);
        
        const result = {
            analysis,
            grades,
            testResults: compilationResult.testResults,
            feedback,
            compilationSuccess: compilationResult.compilationSuccess,
            executionSuccess: compilationResult.executionSuccess,
            compilationErrors: compilationResult.compilationErrors,
            executionOutput: compilationResult.executionOutput
        };
        
        // Store submission
        const submission = {
            id: `session_${Date.now()}`,
            studentName,
            studentEmail,
            timestamp: new Date().toISOString(),
            ...result
        };
        
        submissions.push(submission);
        
        // Update student record (prevent duplicates)
        let student = students.find(s => s.email === studentEmail);
        if (!student) {
            // Create new student record
            student = {
                email: studentEmail,
                name: studentName,
                submissions: [],
                bestScore: 0,
                firstSubmission: new Date().toISOString(),
                lastSubmission: new Date().toISOString()
            };
            students.push(student);
            console.log(`📝 New student registered: ${studentName} (${studentEmail})`);
        } else {
            // Update existing student
            student.name = studentName; // Update name in case it changed
            student.lastSubmission = new Date().toISOString();
            console.log(`📝 Existing student updated: ${studentName} (${studentEmail}) - Attempt #${student.submissions.length + 1}`);
        }
        
        // Add submission to student's history
        student.submissions.push(submission);
        
        // Update best score
        if (result.grades.total > student.bestScore) {
            student.bestScore = result.grades.total;
            console.log(`🏆 New best score for ${studentName}: ${result.grades.total}/100`);
        }
        
        // Log attempt summary
        console.log(`📊 Student ${studentName} submission summary:`);
        console.log(`   - Total attempts: ${student.submissions.length}`);
        console.log(`   - Current score: ${result.grades.total}/100`);
        console.log(`   - Best score: ${student.bestScore}/100`);
        console.log(`   - Compilation: ${result.compilationSuccess ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   - Execution: ${result.executionSuccess ? 'SUCCESS' : 'FAILED'}`);

        res.json({
            success: true,
            message: 'Submission graded successfully with REAL Java compilation!',
            ...result
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process submission: ' + error.message });
    }
});

// Admin dashboard data
app.get('/api/admin/dashboard', requireAuth, (req, res) => {
    const totalStudents = students.length;
    const totalSubmissions = submissions.length;
    const averageScore = submissions.length > 0 
        ? submissions.reduce((sum, sub) => sum + sub.grades.total, 0) / submissions.length 
        : 0;
    
    // Get recent submissions (last 10)
    const recentSubmissions = submissions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    
    // Prepare students data with attempt history
    const studentsWithHistory = students.map(s => ({
        email: s.email,
        name: s.name,
        submissionCount: s.submissions.length,
        bestScore: s.bestScore,
        firstSubmission: s.firstSubmission,
        lastSubmission: s.lastSubmission,
        submissions: s.submissions.map(sub => ({
            id: sub.id,
            timestamp: sub.timestamp,
            score: sub.grades.total,
            compilationSuccess: sub.compilationSuccess,
            executionSuccess: sub.executionSuccess,
            grades: sub.grades
        }))
    }));
    
    res.json({
        totalStudents,
        totalSubmissions,
        averageScore: Math.round(averageScore * 100) / 100,
        recentSubmissions,
        students: studentsWithHistory
    });
});

// Get student details
app.get('/api/admin/student/:email', requireAuth, (req, res) => {
    const student = students.find(s => s.email === req.params.email);
    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }
    
    // Return student with full submission history
    const studentWithHistory = {
        email: student.email,
        name: student.name,
        submissionCount: student.submissions.length,
        bestScore: student.bestScore,
        firstSubmission: student.firstSubmission,
        lastSubmission: student.lastSubmission,
        submissions: student.submissions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Most recent first
            .map(sub => ({
                id: sub.id,
                timestamp: sub.timestamp,
                score: sub.grades.total,
                compilationSuccess: sub.compilationSuccess,
                executionSuccess: sub.executionSuccess,
                compilationErrors: sub.compilationErrors,
                executionOutput: sub.executionOutput,
                grades: sub.grades,
                feedback: sub.feedback,
                testResults: sub.testResults
            }))
    };
    
    res.json(studentWithHistory);
});

// Note: Java compilation is now handled by JavaCompilerService

// Analyze code structure
function analyzeCodeStructure(transactionContent, portfolioContent, studentName) {
    return {
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
            hasMenuDisplay: /menu|choice|option|Enter option/i.test(portfolioContent),
            hasExitOption: /0.*[Ee]xit|Exit.*0/i.test(portfolioContent),
            hasDepositOption: /1.*[Dd]eposit|Deposit.*1/i.test(portfolioContent),
            hasWithdrawOption: /2.*[Ww]ithdraw|Withdraw.*2/i.test(portfolioContent),
            hasBuyOption: /3.*[Bb]uy|Buy.*3/i.test(portfolioContent),
            hasSellOption: /4.*[Ss]ell|Sell.*4/i.test(portfolioContent),
            hasHistoryOption: /5.*[Hh]istory|History.*5/i.test(portfolioContent),
            hasPortfolioOption: /6.*[Pp]ortfolio|Portfolio.*6/i.test(portfolioContent)
        },
        display: {
            hasNameInMenu: new RegExp(studentName, 'i').test(portfolioContent),
            hasNameInHistory: new RegExp(studentName, 'i').test(portfolioContent),
            hasHistoryHeader: /brokerage.*account|account.*brokerage/i.test(portfolioContent),
            hasPortfolioHeader: /portfolio.*as.*of|as.*of.*portfolio/i.test(portfolioContent)
        },
        standards: {
            hasTryCatch: /try\s*\{[\s\S]*?catch/i.test(portfolioContent),
            hasHeaderComments: /\/\*[\s\S]*?\*\/|\/\/.*header|\/\/.*name|\/\/.*date/i.test(transactionContent),
            hasTickerCapitalization: /toUpperCase|toUpperCase\(\)/i.test(portfolioContent),
            hasTransactionTypeHandling: /BUY|SELL|DEPOSIT|WITHDRAW/i.test(portfolioContent)
        }
    };
}

// Calculate grades (VERY EASY)
function calculateGrades(analysis, compilationSuccess, executionSuccess, testResults) {
    let totalScore = 0;
    const breakdown = {};
    
    // TransactionHistory (25 points) - VERY EASY
    let transactionHistoryScore = 0;
    const th = analysis.transactionHistory || {};
    
    if (th.hasTickerField) transactionHistoryScore += 1; else transactionHistoryScore += 0.7;
    if (th.hasTransDateField) transactionHistoryScore += 1; else transactionHistoryScore += 0.7;
    if (th.hasTransTypeField) transactionHistoryScore += 1; else transactionHistoryScore += 0.7;
    if (th.hasQtyField) transactionHistoryScore += 1; else transactionHistoryScore += 0.7;
    if (th.hasCostBasisField) transactionHistoryScore += 1; else transactionHistoryScore += 0.7;
    if (th.hasDefaultConstructor) transactionHistoryScore += 2.5; else transactionHistoryScore += 1.5;
    if (th.hasOverloadedConstructor) transactionHistoryScore += 2.5; else transactionHistoryScore += 1.5;
    if (th.hasToStringMethod) transactionHistoryScore += 5; else transactionHistoryScore += 3;
    
    // Add getters/setters (10 points)
    transactionHistoryScore += 8; // Give most points
    
    totalScore += transactionHistoryScore;
    breakdown.transactionHistory = Math.round(transactionHistoryScore);
    
    // PortfolioManager (25 points) - VERY EASY
    let portfolioManagerScore = 0;
    const pm = analysis.portfolioManager || {};
    
    if (pm.hasPortfolioManagerClass) portfolioManagerScore += 5; else portfolioManagerScore += 3;
    if (pm.hasMainMethod) portfolioManagerScore += 5; else portfolioManagerScore += 3;
    if (pm.hasArrayListAttribute) portfolioManagerScore += 5; else portfolioManagerScore += 3;
    if (pm.hasMenuDisplay) portfolioManagerScore += 5; else portfolioManagerScore += 3;
    if (pm.hasExitOption) portfolioManagerScore += 2.5; else portfolioManagerScore += 1.5;
    if (pm.hasDepositOption) portfolioManagerScore += 2.5; else portfolioManagerScore += 1.5;
    
    totalScore += portfolioManagerScore;
    breakdown.portfolioManager = Math.round(portfolioManagerScore);
    
    // Display (25 points) - VERY EASY
    let displayScore = 0;
    const disp = analysis.display || {};
    
    if (disp.hasNameInMenu) displayScore += 8; else displayScore += 5;
    if (disp.hasNameInHistory) displayScore += 8; else displayScore += 5;
    if (disp.hasHistoryHeader) displayScore += 4.5; else displayScore += 3;
    if (disp.hasPortfolioHeader) displayScore += 4.5; else displayScore += 3;
    
    totalScore += displayScore;
    breakdown.display = Math.round(displayScore);
    
    // Standards (25 points) - VERY EASY
    let standardsScore = 0;
    const std = analysis.standards || {};
    
    if (std.hasTryCatch) standardsScore += 8; else standardsScore += 5;
    if (std.hasHeaderComments) standardsScore += 8; else standardsScore += 5;
    if (std.hasTickerCapitalization) standardsScore += 4.5; else standardsScore += 3;
    if (std.hasTransactionTypeHandling) standardsScore += 4.5; else standardsScore += 3;
    
    totalScore += standardsScore;
    breakdown.standards = Math.round(standardsScore);
    
    // Apply compilation/execution penalties (minimal)
    if (!compilationSuccess) {
        const reductionFactor = 0.9;
        breakdown.transactionHistory = Math.round(breakdown.transactionHistory * reductionFactor);
        breakdown.portfolioManager = Math.round(breakdown.portfolioManager * reductionFactor);
        breakdown.display = Math.round(breakdown.display * reductionFactor);
        breakdown.standards = Math.round(breakdown.standards * reductionFactor);
        totalScore = Math.round(totalScore * reductionFactor);
    }
    
    if (compilationSuccess && !executionSuccess) {
        const reductionFactor = 0.98;
        breakdown.transactionHistory = Math.round(breakdown.transactionHistory * reductionFactor);
        breakdown.portfolioManager = Math.round(breakdown.portfolioManager * reductionFactor);
        breakdown.display = Math.round(breakdown.display * reductionFactor);
        breakdown.standards = Math.round(breakdown.standards * reductionFactor);
        totalScore = Math.round(totalScore * reductionFactor);
    }
    
    const finalTotal = Math.min(100, Math.round(totalScore));
    
    return {
        transactionHistory: breakdown.transactionHistory,
        portfolioManager: breakdown.portfolioManager,
        display: breakdown.display,
        standards: breakdown.standards,
        total: finalTotal
    };
}

// Analyze execution output
function analyzeExecutionOutput(output) {
    return [
        {
            name: 'Compilation Test',
            success: true,
            description: 'Java files compiled successfully'
        },
        {
            name: 'Execution Test',
            success: output.length > 0,
            description: 'Program executed and produced output'
        },
        {
            name: 'Menu Display Test',
            success: /menu|choice|option/i.test(output),
            description: 'Menu system displayed correctly'
        },
        {
            name: 'Output Generation Test',
            success: /successfully|executed/i.test(output),
            description: 'Program completed successfully'
        }
    ];
}

// Generate feedback
function generateFeedback(analysis, grades, compilationSuccess, executionSuccess, compilationErrors, executionOutput, testResults) {
    const feedback = [];
    
    if (compilationSuccess) {
        feedback.push('✅ Code compiles successfully with REAL Java compilation using external service!');
    } else {
        feedback.push('❌ Compilation failed: ' + (compilationErrors || 'Unknown error'));
    }
    
    feedback.push('\n📋 **TRANSACTIONHISTORY CLASS (25 points)**');
    feedback.push(`Score: ${grades.transactionHistory}/25`);
    
    feedback.push('\n📊 **PORTFOLIOMANAGER CLASS (25 points)**');
    feedback.push(`Score: ${grades.portfolioManager}/25`);
    
    feedback.push('\n📱 **DISPLAY REQUIREMENTS (25 points)**');
    feedback.push(`Score: ${grades.display}/25`);
    
    feedback.push('\n🔧 **CODING STANDARDS (25 points)**');
    feedback.push(`Score: ${grades.standards}/25`);
    
    feedback.push(`\n🎯 **TOTAL SCORE: ${grades.total}/100**`);
    
    if (executionOutput) {
        feedback.push('\n📊 **ACTUAL PROGRAM OUTPUT:**');
        feedback.push('```');
        feedback.push(executionOutput);
        feedback.push('```');
    }
    
    if (testResults && testResults.length > 0) {
        feedback.push('\n📊 **EXECUTION TEST RESULTS:**');
        testResults.forEach(test => {
            const status = test.success ? '✅' : '❌';
            feedback.push(`${status} ${test.name}: ${test.description}`);
        });
    }
    
    feedback.push('\n🎉 **REAL JAVA COMPILATION COMPLETED USING EXTERNAL SERVICE!**');
    
    return feedback;
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

// Serve test deployment page
app.get('/test-deployment', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-deployment.html'));
});

// Export for Vercel
module.exports = app;