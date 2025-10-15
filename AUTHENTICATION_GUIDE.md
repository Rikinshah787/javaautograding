# 🔐 Authentication Guide - Java Grader Admin Dashboard

Complete guide for setting up and managing professor authentication in the Java Grader Admin Dashboard.

## 🚀 Quick Start

### **1. One-Command Setup**
```bash
# Run the quick setup (creates default admin)
node quick-setup.js
```

### **2. Start the Dashboard**
```bash
# Start the admin dashboard
npm start
```

### **3. Access the System**
- **URL**: http://localhost:5001
- **Default Admin ID**: ADMIN001
- **Default Password**: admin123

## 👨‍🏫 Professor Management

### **Default Admin Account**
The system automatically creates a default admin professor:
- **Professor ID**: `ADMIN001`
- **Password**: `admin123`
- **Email**: `admin@asu.edu`
- **Privileges**: Full admin access

### **Adding New Professors**

#### **Method 1: Command Line (Quick)**
```bash
# Add a professor with all details
node professor-manager.js add "Dr. Sarah Smith" "smith@asu.edu" "PROF001" "password123" "Computer Science" "Arizona State University"

# Add a professor with defaults
node professor-manager.js add "Dr. Johnson" "johnson@asu.edu" "PROF002" "pass123"
```

#### **Method 2: Interactive Setup**
```bash
# Interactive professor registration
node professor-manager.js interactive
```

#### **Method 3: API Registration**
```bash
# Register via API
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prof@asu.edu",
    "full_name": "Dr. Professor",
    "professor_id": "PROF003",
    "password": "password123",
    "department": "Computer Science",
    "institution": "Arizona State University"
  }'
```

### **Managing Professors**

#### **List All Professors**
```bash
node professor-manager.js list
```

#### **Reset Password**
```bash
node professor-manager.js reset-password PROF001 newpassword123
```

#### **Update Professor Info**
```javascript
// Via API
const response = await fetch('/api/professors/PROF001', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    full_name: 'Updated Name',
    department: 'New Department'
  })
});
```

## 🔑 Authentication Flow

### **Login Process**
1. Professor enters ID/email and password
2. System validates credentials against database
3. JWT token is generated and stored
4. Token is used for all subsequent API calls
5. Token expires after 24 hours

### **Security Features**
- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure, time-limited access
- **Email Validation**: Only .edu emails accepted
- **Professor ID System**: Custom ID for easy management
- **Admin Privileges**: Separate admin/user roles

## 🛠️ Configuration

### **Environment Variables**
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret (change in production!)
JWT_SECRET=your_secure_jwt_secret_key

# Server Configuration
PORT=5001
NODE_ENV=development
```

### **Database Schema**
The system uses these key tables:
- **`professors`**: Professor accounts and authentication
- **`students`**: Student information
- **`submissions`**: Student submission records
- **`error_logs`**: System error tracking

## 📱 User Interface

### **Login Page Features**
- **Professional Design**: University-grade interface
- **Demo Credentials**: Click to auto-fill default admin
- **Error Handling**: Clear error messages
- **Responsive**: Works on all devices
- **Security**: Password masking and validation

### **Dashboard Features**
- **User Info**: Shows logged-in professor details
- **Logout**: Secure session termination
- **Auto-redirect**: Redirects to login if not authenticated
- **Token Validation**: Automatic token verification

## 🔧 Troubleshooting

### **Common Issues**

#### **"Invalid token" Error**
```bash
# Clear browser storage and login again
# Or reset the professor's password
node professor-manager.js reset-password PROF001 newpassword
```

#### **"Professor not found" Error**
```bash
# Check if professor exists
node professor-manager.js list

# Create the professor if missing
node professor-manager.js add "Name" "email@edu" "ID" "password"
```

#### **"Supabase connection failed"**
- Check your `.env` file
- Verify Supabase project is active
- Ensure API keys are correct

#### **"Password too weak" Error**
- Password must be at least 6 characters
- Use a combination of letters and numbers

### **Reset Everything**
```bash
# Reset all professors (use with caution!)
node professor-manager.js reset-all

# Recreate default admin
node professor-manager.js init
```

## 🎯 Best Practices

### **Security**
1. **Change Default Password**: Update admin password immediately
2. **Strong Passwords**: Use complex passwords for all professors
3. **Regular Updates**: Update professor passwords periodically
4. **Monitor Access**: Check login logs regularly

### **Management**
1. **Professor IDs**: Use consistent naming (PROF001, PROF002, etc.)
2. **Email Validation**: Ensure all emails are .edu addresses
3. **Department Codes**: Use standard department names
4. **Regular Cleanup**: Deactivate unused accounts

### **Production Deployment**
1. **Environment Variables**: Use secure, unique values
2. **HTTPS**: Always use HTTPS in production
3. **Database Security**: Enable Row Level Security (RLS)
4. **Monitoring**: Set up error monitoring and logging

## 📊 API Endpoints

### **Authentication**
- `POST /api/auth/login` - Professor login
- `POST /api/auth/register` - Professor registration
- `GET /api/auth/me` - Get current professor info

### **Professor Management**
- `GET /api/professors` - List all professors
- `PUT /api/professors/:id` - Update professor
- `DELETE /api/professors/:id` - Deactivate professor

### **Dashboard Data**
- `GET /api/dashboard/overview` - Dashboard statistics
- `GET /api/students/performance` - Student performance data
- `GET /api/analytics/*` - Analytics endpoints

## 🎓 Educational Use

This authentication system is designed for educational institutions:

- **FERPA Compliant**: Secure student data handling
- **Academic Standards**: University-grade security
- **Easy Management**: Simple professor onboarding
- **Scalable**: Handles multiple professors and students
- **Audit Trail**: Complete access logging

## 🆘 Support

### **Getting Help**
1. Check this guide for common solutions
2. Review server logs for error details
3. Verify Supabase configuration
4. Test with default admin credentials

### **System Requirements**
- Node.js 16+
- Supabase account
- Modern web browser
- Network connectivity

---

**🔐 Secure • 🎓 Educational • 🚀 Professional**

*This authentication system provides enterprise-level security for the Java Grader Admin Dashboard, designed specifically for educational institutions.*
