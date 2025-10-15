# Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### 1. **Connect to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository: `Rikinshah787/javaautograding`

### 2. **Configure Project Settings**
- **Framework Preset**: `Other`
- **Root Directory**: `./` (leave empty)
- **Build Command**: `npm run vercel-build`
- **Output Directory**: Leave empty
- **Install Command**: `npm install`

### 3. **Environment Variables**
Add these in Vercel dashboard:
- `NODE_ENV`: `production`
- `VERCEL`: `1`

### 4. **Deploy**
Click "Deploy" and wait for deployment to complete.

## ⚠️ Important Notes

### **Java Runtime Requirements**
Vercel doesn't include Java by default. You have two options:

#### **Option A: Use External Java Service (Recommended)**
- Deploy Java compilation to a separate service (Railway, Heroku)
- Modify the grading logic to call external API
- This is more reliable for production

#### **Option B: Custom Runtime (Advanced)**
- Use Vercel's custom runtime with Java
- Requires Docker configuration
- More complex but keeps everything in one place

### **File System Limitations**
- Vercel uses `/tmp` directory for temporary files
- Files are cleaned up after each request
- Data persistence uses `/tmp/data.json`

### **Timeout Considerations**
- Vercel functions have a 30-second timeout
- Java compilation + execution might exceed this
- Consider breaking into smaller functions

## 🔧 Configuration Files

### `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "simple-grader.js",
      "use": "@vercel/node",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "simple-grader.js"
    }
  ],
  "functions": {
    "simple-grader.js": {
      "maxDuration": 30
    }
  }
}
```

### `package.json` Scripts
```json
{
  "scripts": {
    "vercel-build": "echo 'Build completed'"
  }
}
```

## 🌐 Access Your Deployed App

After deployment, you'll get a URL like:
- `https://javaautograding.vercel.app`
- **Student Interface**: `https://javaautograding.vercel.app`
- **Admin Login**: `https://javaautograding.vercel.app/login`
- **Admin Dashboard**: `https://javaautograding.vercel.app/admin`

## 🔑 Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

## 🐛 Troubleshooting

### **Java Not Found Error**
- Vercel doesn't include Java runtime
- Consider using external Java compilation service
- Or implement client-side Java validation

### **File Upload Issues**
- Check file size limits (10MB max)
- Ensure proper MIME types
- Verify multer configuration

### **Timeout Errors**
- Reduce Java compilation complexity
- Implement async processing
- Use external services for heavy operations

## 📈 Performance Tips

1. **Optimize Java Compilation**
   - Pre-compile common patterns
   - Use faster compilation flags
   - Cache compilation results

2. **Database Integration**
   - Consider using Vercel's database integrations
   - PostgreSQL, MongoDB, or Supabase
   - Better than file-based storage

3. **CDN Usage**
   - Static assets served via Vercel's CDN
   - Faster loading times globally
   - Automatic HTTPS

## 🔄 Updates and Maintenance

### **Automatic Deployments**
- Every push to `main` branch triggers deployment
- Preview deployments for pull requests
- Easy rollback to previous versions

### **Monitoring**
- Vercel Analytics included
- Function logs available
- Performance metrics tracked

## 💡 Alternative Recommendations

For better Java support, consider:
- **Railway**: Native Java support
- **Heroku**: Full control over runtime
- **DigitalOcean App Platform**: Container support
- **AWS Lambda**: Custom runtime with Java

## 🎯 Success Metrics

After deployment, verify:
- ✅ Student interface loads correctly
- ✅ File upload works
- ✅ Admin login functions
- ✅ Grading system processes submissions
- ✅ Results display properly

---

**Need help?** Check Vercel's documentation or create an issue in the repository.
