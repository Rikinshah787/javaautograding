/**
 * Simple Java Grader System
 * Integrates with existing Java grader logic
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;
const isVercel = process.env.VERCEL === '1';

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
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// File upload configuration
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// File-based storage for persistence
const dataFile = isVercel ? '/tmp/data.json' : 'data.json';

// Load data from file on startup
let submissions = [];
let students = [];

// Load existing data
try {
    if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        submissions = data.submissions || [];
        students = data.students || [];
        console.log(`📊 Loaded ${submissions.length} submissions and ${students.length} students from storage`);
    }
} catch (error) {
    console.log('📝 Starting with empty data storage');
}

// Save data to file
function saveData() {
    try {
        const data = {
            submissions,
            students,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Admin credentials (in production, store in database with hashed passwords)
const adminCredentials = {
    username: 'admin',
    password: '$2b$10$A2OjFD70ehbeY3QZBWUNBuuyE5yoU.OM9NLXifVVLb3fOnBKeWqzy' // 'admin123' hashed
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
        message: 'Java Grader System is running',
        timestamp: new Date().toISOString()
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

        // Check credentials
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

// Student submission endpoint
app.post('/api/upload', upload.fields([
    { name: 'transactionHistory', maxCount: 1 },
    { name: 'portfolioManager', maxCount: 1 }
]), async (req, res) => {
    try {
        const { studentName, studentEmail } = req.body;
        
        if (!req.files || !req.files.transactionHistory || !req.files.portfolioManager) {
            return res.status(400).json({ error: 'Both TransactionHistory.java and PortfolioManager.java files are required' });
        }

        const sessionId = `session_${Date.now()}`;
        const baseDir = isVercel ? '/tmp' : __dirname;
        const uploadDir = path.join(baseDir, 'uploads', sessionId);
        await fs.ensureDir(uploadDir);

        // Move uploaded files
        const transactionFile = req.files.transactionHistory[0];
        const portfolioFile = req.files.portfolioManager[0];
        
        const transactionPath = path.join(uploadDir, 'TransactionHistory.java');
        const portfolioPath = path.join(uploadDir, 'PortfolioManager.java');
        
        await fs.move(transactionFile.path, transactionPath);
        await fs.move(portfolioFile.path, portfolioPath);

        // Call your existing Java grader logic here
        const result = await callExistingGrader(uploadDir, studentName, studentEmail);
        
        // Store submission
        const submission = {
            id: sessionId,
            studentName,
            studentEmail,
            timestamp: new Date().toISOString(),
            ...result
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
        if (result.grades.total > student.bestScore) {
            student.bestScore = result.grades.total;
        }
        
        // Save data to file
        saveData();

        res.json({
            success: true,
            message: 'Submission graded successfully',
            ...result
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process submission' });
    }
});

// Admin dashboard data (protected)
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

// Get student details (protected)
app.get('/api/admin/student/:email', requireAuth, (req, res) => {
    const student = students.find(s => s.email === req.params.email);
    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
});

// Complete Java Grader Logic
async function callExistingGrader(uploadDir, studentName, studentEmail) {
    try {
        const transactionPath = path.join(uploadDir, 'TransactionHistory.java');
        const portfolioPath = path.join(uploadDir, 'PortfolioManager.java');
        
        // Read and analyze files
        const transactionContent = await fs.readFile(transactionPath, 'utf8');
        const portfolioContent = await fs.readFile(portfolioPath, 'utf8');
        
        // Comprehensive code analysis
        const analysis = analyzeCodeStructure(transactionContent, portfolioContent, studentName);
        
        // Try to compile
        let compilationSuccess = false;
        let compilationErrors = '';
        
        try {
            const { stdout, stderr } = await execAsync(`javac "${transactionPath}" "${portfolioPath}"`, {
                cwd: uploadDir,
                timeout: 10000
            });
            compilationSuccess = true;
        } catch (error) {
            compilationErrors = error.stderr || error.message;
        }

        // Try to run if compilation successful
        let executionSuccess = false;
        let executionOutput = '';
        let testResults = [];
        
        if (compilationSuccess) {
            try {
                // Create test input file with realistic menu interactions including error handling
                const testInputPath = path.join(uploadDir, 'test_input.txt');
                const testInput = [
                    '1',           // Deposit Cash
                    '10000',       // Amount
                    '3',           // Buy Stock
                    'IBM',         // Ticker
                    '20',          // Quantity
                    '250',         // Price
                    'abc',         // Invalid menu choice (should trigger error handling)
                    '3',           // Buy Stock again
                    'AAPL',        // Ticker
                    '1000',        // Quantity (too much - should trigger insufficient funds error)
                    '150',         // Price
                    '5',           // Display Transaction History
                    '6',           // Display Portfolio
                    '0'            // Exit
                ].join('\n') + '\n';
                
                await fs.writeFile(testInputPath, testInput);
                
                const { stdout, stderr } = await execAsync(`java -cp "${uploadDir}" PortfolioManager < "${testInputPath}"`, {
                    cwd: uploadDir,
                    timeout: 15000
                });
                executionSuccess = true;
                executionOutput = stdout;
                
                // Analyze execution output
                testResults = analyzeExecutionOutput(stdout, analysis);
            } catch (error) {
                executionOutput = error.stderr || error.message;
                testResults = [
                    {
                        name: 'Execution Test',
                        success: false,
                        description: 'Program failed to run: ' + (error.stderr || error.message)
                    }
                ];
            }
        }

        // Calculate comprehensive grades
        const grades = calculateGrades(analysis, compilationSuccess, executionSuccess, testResults);
        
        // Ensure grades object has all required properties
        if (!grades.transactionHistory) grades.transactionHistory = 0;
        if (!grades.portfolioManager) grades.portfolioManager = 0;
        if (!grades.display) grades.display = 0;
        if (!grades.standards) grades.standards = 0;
        if (!grades.total) grades.total = 0;
        
        // Generate detailed feedback
        const feedback = generateFeedback(analysis, grades, compilationSuccess, executionSuccess, compilationErrors, executionOutput, testResults);

        return {
            analysis,
            grades,
            testResults,
            feedback,
            compilationSuccess,
            executionSuccess,
            compilationErrors,
            executionOutput
        };

    } catch (error) {
        console.error('Grading error:', error);
        return {
            analysis: {},
            grades: { total: 0 },
            testResults: [{
                name: 'System Error',
                success: false,
                description: 'Error during grading: ' + error.message
            }],
            feedback: ['❌ Error during grading: ' + error.message],
            compilationSuccess: false,
            executionSuccess: false,
            compilationErrors: error.message,
            executionOutput: ''
        };
    }
}

// Analyze code structure based on detailed rubric
function analyzeCodeStructure(transactionContent, portfolioContent, studentName) {
    const analysis = {
        // === TRANSACTIONHISTORY CLASS REQUIREMENTS (25 points) ===
        transactionHistory: {
            // File structure
            hasTransactionHistoryClass: /class\s+TransactionHistory/i.test(transactionContent),
            hasSeparateFile: transactionContent.length > 0,
            
            // Private attributes (5 points)
            hasTickerField: /private\s+String\s+ticker/i.test(transactionContent),
            hasTransDateField: /private\s+String\s+transDate/i.test(transactionContent),
            hasTransTypeField: /private\s+String\s+transType/i.test(transactionContent),
            hasQtyField: /private\s+double\s+qty/i.test(transactionContent),
            hasCostBasisField: /private\s+double\s+costBasis/i.test(transactionContent),
            
            // Constructors (5 points)
            hasDefaultConstructor: /public\s+TransactionHistory\s*\(\s*\)/.test(transactionContent),
            hasOverloadedConstructor: /public\s+TransactionHistory\s*\([^)]+\)/.test(transactionContent),
            
            // Getters and Setters (10 points)
            hasTickerGetter: /public\s+String\s+getTicker\s*\(/i.test(transactionContent),
            hasTickerSetter: /public\s+void\s+setTicker\s*\(/i.test(transactionContent),
            hasTransDateGetter: /public\s+String\s+getTransDate\s*\(/i.test(transactionContent),
            hasTransDateSetter: /public\s+void\s+setTransDate\s*\(/i.test(transactionContent),
            hasTransTypeGetter: /public\s+String\s+getTransType\s*\(/i.test(transactionContent),
            hasTransTypeSetter: /public\s+void\s+setTransType\s*\(/i.test(transactionContent),
            hasQtyGetter: /public\s+double\s+getQty\s*\(/i.test(transactionContent),
            hasQtySetter: /public\s+void\s+setQty\s*\(/i.test(transactionContent),
            hasCostBasisGetter: /public\s+double\s+getCostBasis\s*\(/i.test(transactionContent),
            hasCostBasisSetter: /public\s+void\s+setCostBasis\s*\(/i.test(transactionContent),
            
            // toString method (5 points)
            hasToStringMethod: /public\s+String\s+toString\s*\(/i.test(transactionContent),
            
            // Header comments
            hasHeaderComments: /\/\*[\s\S]*?\*\/|\/\/.*header|\/\/.*name|\/\/.*date/i.test(transactionContent)
        },
        
        // === PORTFOLIOMANAGER CLASS REQUIREMENTS (25 points) ===
        portfolioManager: {
            // File structure
            hasPortfolioManagerClass: /class\s+PortfolioManager/i.test(portfolioContent),
            hasMainMethod: /public\s+static\s+void\s+main\s*\(/.test(portfolioContent),
            
            // ArrayList attribute (5 points)
            hasArrayListAttribute: /ArrayList\s*<\s*TransactionHistory\s*>\s+portfolioList/i.test(portfolioContent),
            hasArrayListInitialization: /new\s+ArrayList\s*<\s*TransactionHistory\s*>\s*\(\s*\)/i.test(portfolioContent),
            
            // Menu system (10 points)
            hasMenuDisplay: /menu|choice|option|Enter option/i.test(portfolioContent),
            hasExitOption: /0.*[Ee]xit|Exit.*0/i.test(portfolioContent),
            hasDepositOption: /1.*[Dd]eposit|Deposit.*1/i.test(portfolioContent),
            hasWithdrawOption: /2.*[Ww]ithdraw|Withdraw.*2/i.test(portfolioContent),
            hasBuyOption: /3.*[Bb]uy|Buy.*3/i.test(portfolioContent),
            hasSellOption: /4.*[Ss]ell|Sell.*4/i.test(portfolioContent),
            hasHistoryOption: /5.*[Hh]istory|History.*5/i.test(portfolioContent),
            hasPortfolioOption: /6.*[Pp]ortfolio|Portfolio.*6/i.test(portfolioContent),
            
            // Transaction handling (10 points)
            hasDepositLogic: /deposit|DEPOSIT/i.test(portfolioContent),
            hasWithdrawLogic: /withdraw|WITHDRAW/i.test(portfolioContent),
            hasBuyLogic: /buy|BUY/i.test(portfolioContent),
            hasSellLogic: /sell|SELL/i.test(portfolioContent),
            hasTransactionHistoryDisplay: /transaction.*history|history.*transaction/i.test(portfolioContent),
            hasPortfolioDisplay: /portfolio.*display|display.*portfolio/i.test(portfolioContent)
        },
        
        // === DISPLAY REQUIREMENTS (25 points) ===
        display: {
            // Transaction History Display (12.5 points)
            hasNameInMenu: new RegExp(studentName, 'i').test(portfolioContent),
            hasNameInHistory: new RegExp(studentName, 'i').test(portfolioContent),
            hasHistoryHeader: /brokerage.*account|account.*brokerage/i.test(portfolioContent),
            hasHistoryTable: /date.*ticker.*quantity.*cost.*basis.*trans.*type/i.test(portfolioContent),
            hasHistoryFormatting: /===|===|====/i.test(portfolioContent),
            
            // Portfolio Display (12.5 points)
            hasPortfolioHeader: /portfolio.*as.*of|as.*of.*portfolio/i.test(portfolioContent),
            hasPortfolioTable: /ticker.*quantity/i.test(portfolioContent),
            hasPortfolioFormatting: /===|===|====/i.test(portfolioContent),
            hasTimestamp: /\d{2}\/\d{2}\/\d{4}|\d{2}:\d{2}:\d{2}/i.test(portfolioContent)
        },
        
        // === CODING AND TESTING STANDARDS (25 points) ===
        standards: {
            // Error handling (8 points)
            hasTryCatch: /try\s*\{[\s\S]*?catch/i.test(portfolioContent),
            hasMenuErrorHandling: /invalid.*input|error.*message/i.test(portfolioContent),
            hasCashValidation: /enough.*cash|cash.*available|insufficient.*funds/i.test(portfolioContent),
            hasWithdrawValidation: /withdraw.*amount|amount.*withdraw/i.test(portfolioContent),
            hasStockValidation: /enough.*shares|shares.*available/i.test(portfolioContent),
            
            // Code quality (7 points)
            hasHeaderComments: /\/\*[\s\S]*?\*\/|\/\/.*header|\/\/.*name|\/\/.*date/i.test(transactionContent) && 
                              /\/\*[\s\S]*?\*\/|\/\/.*header|\/\/.*name|\/\/.*date/i.test(portfolioContent),
            hasProperFormatting: /public\s+class|private\s+\w+|public\s+\w+/.test(transactionContent) && 
                                /public\s+class|private\s+\w+|public\s+\w+/.test(portfolioContent),
            hasProperNaming: /[A-Z][a-zA-Z]*/.test(transactionContent) && /[A-Z][a-zA-Z]*/.test(portfolioContent),
            
            // Business logic (10 points)
            hasCashTransactionLogic: /cash.*transaction|transaction.*cash/i.test(portfolioContent),
            hasStockTransactionLogic: /stock.*transaction|transaction.*stock/i.test(portfolioContent),
            hasTickerCapitalization: /toUpperCase|toUpperCase\(\)/i.test(portfolioContent),
            hasCostBasisLogic: /cost.*basis|basis.*cost/i.test(portfolioContent),
            hasQuantityHandling: /quantity|qty/i.test(portfolioContent),
            hasTransactionTypeHandling: /BUY|SELL|DEPOSIT|WITHDRAW/i.test(portfolioContent),
            hasPortfolioCalculation: /portfolio.*calculation|calculate.*portfolio/i.test(portfolioContent),
            hasArrayListUsage: /portfolioList\.|\.add\(|\.get\(|\.size\(/i.test(portfolioContent)
        },
        
        // File analysis
        fileAnalysis: {
            transactionSize: transactionContent.length,
            portfolioSize: portfolioContent.length,
            transactionLines: transactionContent.split('\n').length,
            portfolioLines: portfolioContent.split('\n').length,
            hasStudentName: new RegExp(studentName, 'i').test(transactionContent) || 
                           new RegExp(studentName, 'i').test(portfolioContent)
        }
    };
    
    return analysis;
}

// Analyze execution output
function analyzeExecutionOutput(output, analysis) {
    const tests = [
        {
            name: 'Compilation Test',
            success: true, // Already checked
            description: 'Java files compile without errors'
        },
        {
            name: 'Execution Test',
            success: output.length > 0,
            description: 'Program runs and produces output'
        },
        {
            name: 'Menu Display Test',
            success: /menu|choice|option|select/i.test(output),
            description: 'Menu system is displayed'
        },
        {
            name: 'Transaction History Test',
            success: /transaction|history|record/i.test(output),
            description: 'Transaction history functionality works'
        },
        {
            name: 'Portfolio Display Test',
            success: /portfolio|balance|total|value/i.test(output),
            description: 'Portfolio information is displayed'
        },
        {
            name: 'User Input Test',
            success: /enter|input|choice|select/i.test(output),
            description: 'Program accepts user input'
        },
        {
            name: 'Error Handling Test',
            success: /error|invalid|valid number|try again/i.test(output) && output.includes('abc'),
            description: 'Program handles invalid input (abc) with proper error message'
        },
        {
            name: 'Insufficient Funds Test',
            success: /insufficient|funds|required|available/i.test(output) && output.includes('150000'),
            description: 'Program validates insufficient funds for large purchases'
        }
    ];
    
    return tests;
}

// Calculate comprehensive grades based on detailed rubric
function calculateGrades(analysis, compilationSuccess, executionSuccess, testResults) {
    let totalScore = 0;
    const breakdown = {};
    
    // === TRANSACTIONHISTORY CLASS (25 points) ===
    let transactionHistoryScore = 0;
    const th = analysis.transactionHistory || {};
    
    // Private attributes (5 points) - 1 point each
    if (th.hasTickerField) transactionHistoryScore += 1;
    if (th.hasTransDateField) transactionHistoryScore += 1;
    if (th.hasTransTypeField) transactionHistoryScore += 1;
    if (th.hasQtyField) transactionHistoryScore += 1;
    if (th.hasCostBasisField) transactionHistoryScore += 1;
    
    // Constructors (5 points) - 2.5 points each
    if (th.hasDefaultConstructor) transactionHistoryScore += 2.5;
    if (th.hasOverloadedConstructor) transactionHistoryScore += 2.5;
    
    // Getters and Setters (10 points) - 1 point each
    if (th.hasTickerGetter) transactionHistoryScore += 0.5;
    if (th.hasTickerSetter) transactionHistoryScore += 0.5;
    if (th.hasTransDateGetter) transactionHistoryScore += 0.5;
    if (th.hasTransDateSetter) transactionHistoryScore += 0.5;
    if (th.hasTransTypeGetter) transactionHistoryScore += 0.5;
    if (th.hasTransTypeSetter) transactionHistoryScore += 0.5;
    if (th.hasQtyGetter) transactionHistoryScore += 0.5;
    if (th.hasQtySetter) transactionHistoryScore += 0.5;
    if (th.hasCostBasisGetter) transactionHistoryScore += 0.5;
    if (th.hasCostBasisSetter) transactionHistoryScore += 0.5;
    
    // toString method (5 points)
    if (th.hasToStringMethod) transactionHistoryScore += 5;
    
    totalScore += transactionHistoryScore;
    breakdown.transactionHistory = Math.round(transactionHistoryScore);
    
    // === PORTFOLIOMANAGER CLASS (25 points) ===
    let portfolioManagerScore = 0;
    const pm = analysis.portfolioManager || {};
    
    // ArrayList attribute (5 points)
    if (pm.hasArrayListAttribute) portfolioManagerScore += 2.5;
    if (pm.hasArrayListInitialization) portfolioManagerScore += 2.5;
    
    // Menu system (10 points) - 1.25 points each
    if (pm.hasMenuDisplay) portfolioManagerScore += 1.25;
    if (pm.hasExitOption) portfolioManagerScore += 1.25;
    if (pm.hasDepositOption) portfolioManagerScore += 1.25;
    if (pm.hasWithdrawOption) portfolioManagerScore += 1.25;
    if (pm.hasBuyOption) portfolioManagerScore += 1.25;
    if (pm.hasSellOption) portfolioManagerScore += 1.25;
    if (pm.hasHistoryOption) portfolioManagerScore += 1.25;
    if (pm.hasPortfolioOption) portfolioManagerScore += 1.25;
    
    // Transaction handling (10 points) - 1.67 points each
    if (pm.hasDepositLogic) portfolioManagerScore += 1.67;
    if (pm.hasWithdrawLogic) portfolioManagerScore += 1.67;
    if (pm.hasBuyLogic) portfolioManagerScore += 1.67;
    if (pm.hasSellLogic) portfolioManagerScore += 1.67;
    if (pm.hasTransactionHistoryDisplay) portfolioManagerScore += 1.67;
    if (pm.hasPortfolioDisplay) portfolioManagerScore += 1.67;
    
    totalScore += portfolioManagerScore;
    breakdown.portfolioManager = Math.round(portfolioManagerScore);
    
    // === DISPLAY REQUIREMENTS (25 points) ===
    let displayScore = 0;
    const disp = analysis.display || {};
    
    // Transaction History Display (12.5 points) - 2.5 points each
    if (disp.hasNameInMenu) displayScore += 2.5;
    if (disp.hasNameInHistory) displayScore += 2.5;
    if (disp.hasHistoryHeader) displayScore += 2.5;
    if (disp.hasHistoryTable) displayScore += 2.5;
    if (disp.hasHistoryFormatting) displayScore += 2.5;
    
    // Portfolio Display (12.5 points) - 3.125 points each
    if (disp.hasPortfolioHeader) displayScore += 3.125;
    if (disp.hasPortfolioTable) displayScore += 3.125;
    if (disp.hasPortfolioFormatting) displayScore += 3.125;
    if (disp.hasTimestamp) displayScore += 3.125;
    
    totalScore += displayScore;
    breakdown.display = Math.round(displayScore);
    
    // === CODING AND TESTING STANDARDS (25 points) ===
    let standardsScore = 0;
    const std = analysis.standards || {};
    
    // Error handling (8 points) - EASY GRADING
    if (std.hasTryCatch) standardsScore += 1.6;
    
    // Menu error handling - give points if code has it, even if not perfect
    if (std.hasMenuErrorHandling) {
        standardsScore += 1.6;
    } else {
        // Light penalty only
        standardsScore -= 0.2;
    }
    
    // Cash validation - EASY
    if (std.hasCashValidation) standardsScore += 1.6;
    
    // Withdrawal validation - EASY  
    if (std.hasWithdrawValidation) standardsScore += 1.6;
    
    // Stock validation - EASY
    if (std.hasStockValidation) standardsScore += 1.6;
    
    // Code quality (7 points) - 2.33 points each
    if (std.hasHeaderComments) standardsScore += 2.33;
    if (std.hasProperFormatting) standardsScore += 2.33;
    if (std.hasProperNaming) standardsScore += 2.33;
    
    // Business logic (10 points) - 1.25 points each
    if (std.hasCashTransactionLogic) standardsScore += 1.25;
    if (std.hasStockTransactionLogic) standardsScore += 1.25;
    if (std.hasTickerCapitalization) standardsScore += 1.25;
    if (std.hasCostBasisLogic) standardsScore += 1.25;
    if (std.hasQuantityHandling) standardsScore += 1.25;
    if (std.hasTransactionTypeHandling) standardsScore += 1.25;
    if (std.hasPortfolioCalculation) standardsScore += 1.25;
    if (std.hasArrayListUsage) standardsScore += 1.25;
    
    totalScore += standardsScore;
    breakdown.standards = Math.round(standardsScore);
    
    // No bonus points - follow exact rubric: 4 sections of 25 points each = 100 points total
    
    // EASY GRADING - Only light penalties
    if (!compilationSuccess) {
        // Light penalty for compilation failure
        const reductionFactor = 0.8; // Only 20% reduction
        
        breakdown.transactionHistory = Math.round(breakdown.transactionHistory * reductionFactor);
        breakdown.portfolioManager = Math.round(breakdown.portfolioManager * reductionFactor);
        breakdown.display = Math.round(breakdown.display * reductionFactor);
        breakdown.standards = Math.round(breakdown.standards * reductionFactor);
        
        totalScore = Math.round(totalScore * reductionFactor);
    }
    
    // Very light penalty for execution failure
    if (compilationSuccess && !executionSuccess) {
        const executionReductionFactor = 0.95; // Only 5% reduction
        
        breakdown.transactionHistory = Math.round(breakdown.transactionHistory * executionReductionFactor);
        breakdown.portfolioManager = Math.round(breakdown.portfolioManager * executionReductionFactor);
        breakdown.display = Math.round(breakdown.display * executionReductionFactor);
        breakdown.standards = Math.round(breakdown.standards * executionReductionFactor);
        
        totalScore = Math.round(totalScore * executionReductionFactor);
    }
    
    // Ensure total doesn't exceed 100 (4 sections of 25 points each)
    const finalTotal = Math.min(100, Math.round(totalScore));
    
    // Ensure individual scores add up to total (no bonuses)
    const individualTotal = breakdown.transactionHistory + breakdown.portfolioManager + 
                           breakdown.display + breakdown.standards;
    
    // If there's a discrepancy, adjust proportionally
    if (Math.abs(individualTotal - finalTotal) > 1) {
        const adjustmentFactor = finalTotal / individualTotal;
        breakdown.transactionHistory = Math.round(breakdown.transactionHistory * adjustmentFactor);
        breakdown.portfolioManager = Math.round(breakdown.portfolioManager * adjustmentFactor);
        breakdown.display = Math.round(breakdown.display * adjustmentFactor);
        breakdown.standards = Math.round(breakdown.standards * adjustmentFactor);
    }
    
    return {
        transactionHistory: breakdown.transactionHistory,
        portfolioManager: breakdown.portfolioManager,
        display: breakdown.display,
        standards: breakdown.standards,
        total: finalTotal
    };
}

// Generate detailed feedback
function generateFeedback(analysis, grades, compilationSuccess, executionSuccess, compilationErrors, executionOutput, testResults = []) {
    const feedback = [];
    
    // Compilation feedback
    if (compilationSuccess) {
        feedback.push('✅ Code compiles successfully');
    } else {
        feedback.push('❌ Compilation failed: ' + (compilationErrors || 'Unknown compilation error'));
        if (compilationErrors && compilationErrors.length > 200) {
            feedback.push('📝 Full error details: ' + compilationErrors);
        }
    }
    
    // === TRANSACTIONHISTORY CLASS FEEDBACK (25 points) ===
    feedback.push('\n📋 **TRANSACTIONHISTORY CLASS (25 points)**');
    
    // Private attributes
    const attributes = [
        { name: 'ticker (String)', found: analysis.transactionHistory?.hasTickerField },
        { name: 'transDate (String)', found: analysis.transactionHistory?.hasTransDateField },
        { name: 'transType (String)', found: analysis.transactionHistory?.hasTransTypeField },
        { name: 'qty (double)', found: analysis.transactionHistory?.hasQtyField },
        { name: 'costBasis (double)', found: analysis.transactionHistory?.hasCostBasisField }
    ];
    
    attributes.forEach(attr => {
        if (attr.found) {
            feedback.push(`✅ Private field '${attr.name}' found`);
        } else {
            feedback.push(`❌ Private field '${attr.name}' missing`);
        }
    });
    
    // Constructors
    if (analysis.transactionHistory?.hasDefaultConstructor) {
        feedback.push('✅ Default constructor found');
    } else {
        feedback.push('❌ Default constructor missing');
    }
    
    if (analysis.transactionHistory?.hasOverloadedConstructor) {
        feedback.push('✅ Overloaded constructor found');
    } else {
        feedback.push('❌ Overloaded constructor missing');
    }
    
    // Getters and Setters
    const getterSetters = [
        { name: 'getTicker/setTicker', getter: analysis.transactionHistory?.hasTickerGetter, setter: analysis.transactionHistory?.hasTickerSetter },
        { name: 'getTransDate/setTransDate', getter: analysis.transactionHistory?.hasTransDateGetter, setter: analysis.transactionHistory?.hasTransDateSetter },
        { name: 'getTransType/setTransType', getter: analysis.transactionHistory?.hasTransTypeGetter, setter: analysis.transactionHistory?.hasTransTypeSetter },
        { name: 'getQty/setQty', getter: analysis.transactionHistory?.hasQtyGetter, setter: analysis.transactionHistory?.hasQtySetter },
        { name: 'getCostBasis/setCostBasis', getter: analysis.transactionHistory?.hasCostBasisGetter, setter: analysis.transactionHistory?.hasCostBasisSetter }
    ];
    
    getterSetters.forEach(gs => {
        if (gs.getter && gs.setter) {
            feedback.push(`✅ ${gs.name} methods found`);
        } else if (gs.getter || gs.setter) {
            feedback.push(`⚠️ ${gs.name} methods partially implemented`);
        } else {
            feedback.push(`❌ ${gs.name} methods missing`);
        }
    });
    
    // toString method
    if (analysis.transactionHistory?.hasToStringMethod) {
        feedback.push('✅ toString method found');
    } else {
        feedback.push('❌ toString method missing');
    }
    
    // === PORTFOLIOMANAGER CLASS FEEDBACK (25 points) ===
    feedback.push('\n📊 **PORTFOLIOMANAGER CLASS (25 points)**');
    
    // ArrayList
    if (analysis.portfolioManager?.hasArrayListAttribute && analysis.portfolioManager?.hasArrayListInitialization) {
        feedback.push('✅ ArrayList<TransactionHistory> portfolioList properly declared and initialized');
    } else {
        feedback.push('❌ ArrayList<TransactionHistory> portfolioList missing or not properly initialized');
    }
    
    // Menu system
    const menuItems = [
        { name: 'Exit (0)', found: analysis.portfolioManager?.hasExitOption },
        { name: 'Deposit Cash (1)', found: analysis.portfolioManager?.hasDepositOption },
        { name: 'Withdraw Cash (2)', found: analysis.portfolioManager?.hasWithdrawOption },
        { name: 'Buy Stock (3)', found: analysis.portfolioManager?.hasBuyOption },
        { name: 'Sell Stock (4)', found: analysis.portfolioManager?.hasSellOption },
        { name: 'Display Transaction History (5)', found: analysis.portfolioManager?.hasHistoryOption },
        { name: 'Display Portfolio (6)', found: analysis.portfolioManager?.hasPortfolioOption }
    ];
    
    menuItems.forEach(item => {
        if (item.found) {
            feedback.push(`✅ Menu option '${item.name}' found`);
        } else {
            feedback.push(`❌ Menu option '${item.name}' missing`);
        }
    });
    
    // Transaction handling
    const transactionTypes = [
        { name: 'Deposit logic', found: analysis.portfolioManager?.hasDepositLogic },
        { name: 'Withdraw logic', found: analysis.portfolioManager?.hasWithdrawLogic },
        { name: 'Buy stock logic', found: analysis.portfolioManager?.hasBuyLogic },
        { name: 'Sell stock logic', found: analysis.portfolioManager?.hasSellLogic },
        { name: 'Transaction history display', found: analysis.portfolioManager?.hasTransactionHistoryDisplay },
        { name: 'Portfolio display', found: analysis.portfolioManager?.hasPortfolioDisplay }
    ];
    
    transactionTypes.forEach(type => {
        if (type.found) {
            feedback.push(`✅ ${type.name} implemented`);
        } else {
            feedback.push(`❌ ${type.name} missing`);
        }
    });
    
    // === DISPLAY REQUIREMENTS FEEDBACK (25 points) ===
    feedback.push('\n📱 **DISPLAY REQUIREMENTS (25 points)**');
    
    // Name display
    if (analysis.display?.hasNameInMenu) {
        feedback.push('✅ Student name displayed in menu');
    } else {
        feedback.push('❌ Student name missing from menu');
    }
    
    if (analysis.display?.hasNameInHistory) {
        feedback.push('✅ Student name displayed in transaction history');
    } else {
        feedback.push('❌ Student name missing from transaction history');
    }
    
    // Transaction history display
    if (analysis.display?.hasHistoryHeader) {
        feedback.push('✅ Transaction history header found');
    } else {
        feedback.push('❌ Transaction history header missing');
    }
    
    if (analysis.display?.hasHistoryTable) {
        feedback.push('✅ Transaction history table format found');
    } else {
        feedback.push('❌ Transaction history table format missing');
    }
    
    // Portfolio display
    if (analysis.display?.hasPortfolioHeader) {
        feedback.push('✅ Portfolio header found');
    } else {
        feedback.push('❌ Portfolio header missing');
    }
    
    if (analysis.display?.hasPortfolioTable) {
        feedback.push('✅ Portfolio table format found');
    } else {
        feedback.push('❌ Portfolio table format missing');
    }
    
    // === CODING AND TESTING STANDARDS FEEDBACK (25 points) ===
    feedback.push('\n🔧 **CODING AND TESTING STANDARDS (25 points)**');
    
    // Error handling
    if (analysis.standards?.hasTryCatch) {
        feedback.push('✅ Try-catch error handling implemented');
    } else {
        feedback.push('❌ Try-catch error handling missing');
    }
    
    // Check if menu error handling actually works during execution
    const hasWorkingMenuErrorHandling = testResults.some(test => 
        test.name === 'Error Handling Test' && test.success
    );
    if (hasWorkingMenuErrorHandling) {
        feedback.push('✅ Menu input error handling works correctly');
    } else {
        feedback.push('❌ Menu input error handling missing or not working');
    }
    
    if (analysis.standards?.hasCashValidation) {
        feedback.push('✅ Cash validation for purchases implemented');
    } else {
        feedback.push('❌ Cash validation for purchases missing');
    }
    
    if (analysis.standards?.hasWithdrawValidation) {
        feedback.push('✅ Withdrawal amount validation implemented');
    } else {
        feedback.push('❌ Withdrawal amount validation missing');
    }
    
    if (analysis.standards?.hasStockValidation) {
        feedback.push('✅ Stock share validation for selling implemented');
    } else {
        feedback.push('❌ Stock share validation for selling missing');
    }
    
    // Code quality
    if (analysis.standards?.hasHeaderComments) {
        feedback.push('✅ Header comments with name and date found');
    } else {
        feedback.push('❌ Header comments with name and date missing');
    }
    
    if (analysis.standards?.hasProperFormatting) {
        feedback.push('✅ Code properly formatted and readable');
    } else {
        feedback.push('❌ Code formatting needs improvement');
    }
    
    // Business logic
    if (analysis.standards?.hasTickerCapitalization) {
        feedback.push('✅ Ticker capitalization (toUpperCase) implemented');
    } else {
        feedback.push('❌ Ticker capitalization missing');
    }
    
    if (analysis.standards?.hasTransactionTypeHandling) {
        feedback.push('✅ Transaction type handling (BUY/SELL/DEPOSIT/WITHDRAW) found');
    } else {
        feedback.push('❌ Transaction type handling missing');
    }
    
    if (analysis.standards?.hasArrayListUsage) {
        feedback.push('✅ ArrayList methods (add, get, size) used');
    } else {
        feedback.push('❌ ArrayList methods not properly used');
    }
    
    // === EXECUTION FEEDBACK ===
    if (executionSuccess) {
        feedback.push('\n✅ **EXECUTION**: Program runs successfully');
    } else {
        feedback.push('\n❌ **EXECUTION**: Program failed to run');
    }
    
    // === OVERALL FEEDBACK ===
    feedback.push('\n📊 **GRADE BREAKDOWN**');
    feedback.push(`TransactionHistory Class: ${grades.transactionHistory}/25 points`);
    feedback.push(`PortfolioManager Class: ${grades.portfolioManager}/25 points`);
    feedback.push(`Display Requirements: ${grades.display}/25 points`);
    feedback.push(`Coding Standards: ${grades.standards}/25 points`);
    feedback.push(`\n🎯 **TOTAL SCORE: ${grades.total}/100**`);
    
    // Overall assessment
    if (grades.total >= 90) {
        feedback.push('\n🎉 **EXCELLENT WORK!** Outstanding implementation that meets all requirements.');
    } else if (grades.total >= 80) {
        feedback.push('\n👍 **GOOD WORK!** Well implemented with minor issues.');
    } else if (grades.total >= 70) {
        feedback.push('\n👌 **SATISFACTORY.** Some improvements needed to meet all requirements.');
    } else if (grades.total >= 60) {
        feedback.push('\n⚠️ **NEEDS IMPROVEMENT.** Review requirements and implement missing features.');
    } else {
        feedback.push('\n❌ **SIGNIFICANT IMPROVEMENTS NEEDED.** Major requirements missing.');
    }
    
    // Add actual execution output from student's code
    if (executionOutput && executionOutput.trim()) {
        feedback.push('\n📊 **ACTUAL PROGRAM OUTPUT:**');
        feedback.push('```');
        feedback.push(executionOutput.trim());
        feedback.push('```');
    }
    
    // Add test results summary
    if (testResults && testResults.length > 0) {
        feedback.push('\n📊 **EXECUTION TEST RESULTS:**');
        testResults.forEach(test => {
            const status = test.success ? '✅' : '❌';
            feedback.push(`${status} ${test.name}: ${test.description}`);
        });
    }
    
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

// Start server (only if not in Vercel)
if (!isVercel) {
    app.listen(PORT, () => {
        console.log(`🚀 Java Grader System running on http://localhost:${PORT}`);
        console.log(`📚 Student Interface: http://localhost:${PORT}`);
        console.log(`🔐 Admin Login: http://localhost:${PORT}/login`);
        console.log(`👨‍🏫 Admin Dashboard: http://localhost:${PORT}/admin`);
        console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
        console.log(`\n🔑 Default Admin Credentials:`);
        console.log(`   Username: admin`);
        console.log(`   Password: admin123`);
    });
}

// Export for Vercel
module.exports = app;

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
