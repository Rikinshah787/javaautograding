# Java Portfolio Grader - Admin Dashboard

A professional-grade admin dashboard for tracking and analyzing student submissions to the Java Portfolio Grader system. Built with Node.js, Express, and Supabase for enterprise-level data management and analytics.

## 🎯 Features

### 📊 **Comprehensive Analytics**
- **Real-time Dashboard**: Live overview of student engagement and performance
- **Grade Distribution**: Visual breakdown of scores across all submissions
- **Submission Trends**: Track submission patterns over time
- **Error Analysis**: Detailed error tracking and categorization

### 👥 **Student Management**
- **Student Performance Tracking**: Individual student progress monitoring
- **Submission History**: Complete audit trail of all attempts
- **Gradebook Integration**: University-grade student record management
- **Email Validation**: Automatic .edu domain verification

### 🔍 **Advanced Monitoring**
- **Error Logging**: Comprehensive error tracking with severity levels
- **Performance Metrics**: Compilation success rates, execution statistics
- **Name Signature Detection**: Verification of student name requirements
- **Code Quality Analysis**: Automated assessment of coding standards

### 📈 **Reporting & Export**
- **CSV Export**: Download student data and analytics
- **Custom Filters**: Search and filter by multiple criteria
- **Sortable Tables**: Dynamic data organization
- **Professional Reports**: University-grade reporting system

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Java Grader   │───▶│  Admin Dashboard │───▶│    Supabase     │
│   (Port 5000)   │    │   (Port 5001)    │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Technology Stack**
- **Backend**: Node.js + Express.js
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Authentication**: Supabase Auth
- **File Processing**: Multer
- **Data Export**: CSV Writer

## 🚀 Quick Start

### **Prerequisites**
- Node.js 16+ installed
- Supabase account (free tier available)
- Java Grader system running (optional for integration)

### **1. Clone and Setup**
```bash
cd "E:\Java Automated\AdminDashboard"
npm install
```

### **2. Configure Supabase**
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and API keys
3. Create `.env` file:
```bash
cp env.example .env
# Edit .env with your Supabase credentials
```

### **3. Initialize Database**
```bash
node setup.js setup
```

### **4. Start the Dashboard**
```bash
npm start
```

### **5. Access the Dashboard**
Open [http://localhost:5001](http://localhost:5001) in your browser.

## 📋 Database Schema

### **Core Tables**
- **`students`**: Student information and enrollment
- **`submissions`**: Individual submission records
- **`error_logs`**: Detailed error tracking
- **`professors`**: Instructor management
- **`assignments`**: Course assignment configuration

### **Analytics Views**
- **`student_performance_summary`**: Aggregated student statistics
- **`error_analysis`**: Error pattern analysis

## 🔧 Configuration

### **Environment Variables**
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=5001
NODE_ENV=development

# Java Grader Integration
JAVA_GRADER_URL=http://localhost:5000
```

### **Supabase Setup**
1. **Create Project**: Go to [supabase.com](https://supabase.com) and create a new project
2. **Get Credentials**: Copy URL and API keys from project settings
3. **Run Schema**: The setup script automatically creates all necessary tables
4. **Configure Auth**: Set up Row Level Security (RLS) policies

## 🔗 Integration with Java Grader

### **Automatic Integration**
The admin dashboard automatically integrates with the Java Grader system:

1. **Submission Forwarding**: Submissions are automatically stored in Supabase
2. **Real-time Updates**: Dashboard updates in real-time as students submit
3. **Error Tracking**: All compilation and execution errors are logged
4. **Analytics**: Performance metrics are calculated automatically

### **Manual Integration**
If you need to manually integrate existing data:

```javascript
const integration = new JavaGraderIntegration();
await integration.processSubmission(submissionData);
```

## 📊 Dashboard Sections

### **1. Overview**
- Total students and submissions
- Daily submission counts
- Average scores
- Recent activity feed

### **2. Students**
- Student performance table
- Individual student details
- Submission history
- Grade tracking

### **3. Analytics**
- Submission trends over time
- Error analysis and patterns
- Grade distribution charts
- Performance metrics

### **4. Error Logs**
- Detailed error tracking
- Error categorization
- Affected student analysis
- Resolution tracking

## 🎨 UI/UX Features

### **Professional Design**
- **Arizona State University inspired**: Clean, academic interface
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Professional color scheme
- **Accessibility**: WCAG compliant design

### **Interactive Elements**
- **Real-time Updates**: Live data refresh
- **Advanced Filtering**: Search and sort capabilities
- **Modal Dialogs**: Detailed student information
- **Progress Indicators**: Visual feedback for all operations

## 🔒 Security Features

### **Authentication**
- **Supabase Auth**: Secure user authentication
- **Role-based Access**: Professor-only access controls
- **JWT Tokens**: Secure API communication
- **Row Level Security**: Database-level access control

### **Data Protection**
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Configuration**: Secure cross-origin requests
- **Helmet Security**: Security headers and protection

## 📈 Analytics & Reporting

### **Key Metrics**
- **Student Engagement**: Submission frequency and patterns
- **Performance Analysis**: Score distributions and trends
- **Error Patterns**: Common issues and solutions
- **Success Rates**: Compilation and execution statistics

### **Export Capabilities**
- **CSV Export**: Student data and performance metrics
- **Custom Reports**: Filtered data exports
- **Date Range Selection**: Time-based reporting
- **Bulk Operations**: Mass data operations

## 🛠️ Development

### **Project Structure**
```
AdminDashboard/
├── public/
│   └── index.html          # Main dashboard interface
├── server.js               # Express server and API
├── integration.js          # Java Grader integration
├── setup.js               # Database setup and configuration
├── supabase-schema.sql    # Database schema
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

### **API Endpoints**
- `GET /api/health` - Health check
- `GET /api/dashboard/overview` - Dashboard statistics
- `GET /api/students/performance` - Student performance data
- `GET /api/analytics/errors` - Error analysis
- `GET /api/export/students` - CSV export
- `POST /api/grader/submit` - Integration endpoint

### **Development Commands**
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
node setup.js setup    # Run database setup
node setup.js test     # Test current setup
node setup.js reset    # Reset database (use with caution)
```

## 🚨 Troubleshooting

### **Common Issues**

#### **Supabase Connection Failed**
- Verify your `.env` file has correct credentials
- Check if your Supabase project is active
- Ensure network connectivity

#### **Database Schema Errors**
- Run `node setup.js reset` to reset database
- Check Supabase dashboard for table creation
- Verify RLS policies are properly configured

#### **Integration Issues**
- Ensure Java Grader is running on port 5000
- Check firewall settings
- Verify API endpoints are accessible

### **Logs and Debugging**
- Check browser console for frontend errors
- Monitor server logs for backend issues
- Use Supabase dashboard for database queries
- Enable debug mode with `NODE_ENV=development`

## 📚 Documentation

### **Additional Resources**
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### **Support**
- Check the troubleshooting section above
- Review server logs for error details
- Verify all environment variables are set correctly
- Ensure all dependencies are installed

## 🎓 Educational Use

This admin dashboard is designed for educational institutions and provides:

- **Academic Standards**: University-grade interface and functionality
- **Student Privacy**: Secure handling of student data
- **Compliance**: FERPA-compliant data management
- **Scalability**: Handles large numbers of students and submissions
- **Professional Reporting**: Suitable for academic administration

## 🔄 Updates and Maintenance

### **Regular Maintenance**
- Monitor database performance
- Update dependencies regularly
- Review error logs for patterns
- Backup data periodically

### **Scaling Considerations**
- Supabase handles automatic scaling
- Consider caching for large datasets
- Monitor API rate limits
- Optimize queries for performance

---

**Built with ❤️ for educational excellence**

*This admin dashboard provides enterprise-level functionality for tracking and analyzing student Java submissions, designed to meet the needs of modern educational institutions.*