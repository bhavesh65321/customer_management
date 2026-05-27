# 🚀 Production Deployment Guide
## React (Create React App) → Vercel + FastAPI → Railway

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Configuration (Railway)](#backend-configuration-railway)
3. [Frontend Configuration (Vercel)](#frontend-configuration-vercel)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Environment Variables](#environment-variables)
6. [Testing Checklist](#testing-checklist)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Accounts Required
- ✓ [Vercel Account](https://vercel.com) (free tier available)
- ✓ [Railway Account](https://railway.app) (backend already deployed)
- ✓ GitHub account (recommended for auto-deployments)

### Backend Information
- **Railway Backend URL**: `https://customermanagement-production.up.railway.app`
- **API Prefix**: `/api`
- **Authentication**: JWT Bearer token

---

## 🔧 Backend Configuration (Railway)

### 1. Update CORS Settings

Your backend needs to allow requests from your Vercel domain.

**File**: `backend/config/settings.py`

```python
# Add your Vercel domain to CORS_ORIGINS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://your-app.vercel.app",  # Add your Vercel domain
    "https://your-app-*.vercel.app",  # For preview deployments
]
```

### 2. Set Railway Environment Variables

Go to Railway Dashboard → Your Backend Service → Variables:

```bash
# Required
DATABASE_URL=mysql://user:password@host:port/database
SECRET_KEY=your-secret-key-here
ENV=production

# CORS Configuration - ADD YOUR VERCEL DOMAINS
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main-username.vercel.app,http://localhost:3000

# Optional
ALLOWED_HOSTS=*
```

**Important**: Replace `your-app.vercel.app` with your actual Vercel domain after deployment.

### 3. Verify Backend Health

Test your Railway backend:

```bash
curl https://customermanagement-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "db": "connected",
  "latency_ms": 50
}
```

---

## 🎨 Frontend Configuration (Vercel)

### Files Created

✅ **`.env.production`** - Production environment variables  
✅ **`.env.development`** - Development environment variables  
✅ **`.env.example`** - Template for environment variables  
✅ **`vercel.json`** - Vercel configuration (SPA routing, headers)  
✅ **`public/_redirects`** - Fallback for SPA routing  

### Environment Variables

**Local Development** (`.env.development`):
```bash
REACT_APP_API_URL=http://127.0.0.1:8000
```

**Production** (`.env.production`):
```bash
REACT_APP_API_URL=https://customermanagement-production.up.railway.app
```

---

## 🚀 Step-by-Step Deployment

### Option A: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Push Code to GitHub

```bash
cd frontend

# Initialize git if not already done
git init
git add .
git commit -m "Prepare for Vercel deployment"

# Create GitHub repository and push
git remote add origin https://github.com/your-username/your-repo.git
git branch -M main
git push -u origin main
```

#### Step 2: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

#### Step 3: Add Environment Variables in Vercel

In Vercel Dashboard → Your Project → Settings → Environment Variables:

| Name | Value | Environment |
|------|-------|-------------|
| `REACT_APP_API_URL` | `https://customermanagement-production.up.railway.app` | Production |
| `REACT_APP_API_URL` | `https://customermanagement-production.up.railway.app` | Preview |
| `REACT_APP_API_URL` | `http://127.0.0.1:8000` | Development |

#### Step 4: Deploy

Click **"Deploy"** button. Vercel will:
- Install dependencies
- Build the React app
- Deploy to CDN
- Provide a live URL (e.g., `https://your-app.vercel.app`)

---

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from frontend directory
cd frontend
vercel

# Follow prompts:
# - Link to existing project or create new
# - Confirm settings
# - Deploy!

# For production deployment
vercel --prod
```

---

## 🔐 Update Backend CORS After Deployment

After getting your Vercel URL (e.g., `https://your-app.vercel.app`):

### 1. Update Railway Environment Variables

Railway Dashboard → Backend Service → Variables:

```bash
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main-username.vercel.app,https://your-app-*.vercel.app,http://localhost:3000
```

### 2. Alternative: Update Code Directly

**File**: `backend/config/settings.py`

```python
CORS_ORIGINS = [
    "https://your-app.vercel.app",           # Production
    "https://your-app-git-main-*.vercel.app", # Preview deployments
    "https://your-app-*.vercel.app",         # All Vercel previews
    "http://localhost:3000",                  # Local development
    "http://127.0.0.1:3000",
]
```

Redeploy backend after changes.

---

## 🧪 Testing Checklist

### 1. Backend API Test

```bash
# Health check
curl https://customermanagement-production.up.railway.app/health

# Test login endpoint
curl -X POST https://customermanagement-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

### 2. Frontend Deployment Test

1. **Visit your Vercel URL**: `https://your-app.vercel.app`
2. **Check browser console**: Look for any CORS errors
3. **Test login flow**:
   - Navigate to `/login`
   - Enter credentials
   - Verify JWT token is stored in localStorage
   - Check API calls succeed

### 3. Full Integration Test

- [ ] Login with valid credentials
- [ ] Register new user
- [ ] Forgot password flow
- [ ] Dashboard loads correctly
- [ ] API calls succeed (check Network tab)
- [ ] Token refresh works
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Customer portal works (`/customer/login`)

### 4. SPA Routing Test

- [ ] Navigate to `/home`
- [ ] Refresh page (should not show 404)
- [ ] Direct URL navigation works
- [ ] Browser back/forward buttons work

---

## 🐛 Troubleshooting

### Issue 1: CORS Errors

**Symptom**: 
```
Access to fetch at 'https://customermanagement-production.up.railway.app/api/...' 
from origin 'https://your-app.vercel.app' has been blocked by CORS policy
```

**Solution**:
1. Check Railway environment variables include your Vercel domain in `CORS_ORIGINS`
2. Restart Railway backend service
3. Clear browser cache and test again

---

### Issue 2: 404 on Page Refresh

**Symptom**: Refreshing any route except `/` shows 404

**Solution**:
✅ Already fixed! The `vercel.json` file includes rewrite rules.

Verify `vercel.json` exists:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

### Issue 3: Environment Variables Not Working

**Symptom**: API calls go to `http://127.0.0.1:8000` in production

**Solution**:
1. Verify environment variables are set in Vercel Dashboard
2. Environment variables MUST start with `REACT_APP_`
3. Redeploy after adding environment variables
4. Check build logs for confirmation

---

### Issue 4: Login Fails (401 Unauthorized)

**Symptom**: Login returns 401 even with correct credentials

**Checklist**:
- [ ] Backend is running (check `/health` endpoint)
- [ ] Database connection is active
- [ ] User exists in database
- [ ] Password is correct
- [ ] Backend logs show the request

**Test**:
```bash
# Direct backend test
curl -X POST https://customermanagement-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"yourusername","password":"yourpassword"}'
```

---

### Issue 5: Build Fails on Vercel

**Common Causes**:
1. **Missing dependencies**: Check `package.json`
2. **Build warnings as errors**: 
   ```bash
   # Add to package.json scripts
   "build": "CI=false react-scripts build"
   ```
3. **Node version mismatch**: Specify in `package.json`:
   ```json
   "engines": {
     "node": ">=18.0.0"
   }
   ```

---

### Issue 6: White Screen / Blank Page

**Debugging Steps**:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Verify `REACT_APP_API_URL` is set correctly:
   ```javascript
   console.log('API URL:', process.env.REACT_APP_API_URL);
   ```

---

## 📊 Verify Deployment

### Frontend Check

```bash
# Check if site is live
curl -I https://your-app.vercel.app

# Should return:
# HTTP/2 200
# content-type: text/html
```

### API Connection Check

Open browser console on your Vercel site:
```javascript
// Check API URL
console.log(process.env.REACT_APP_API_URL);
// Should output: https://customermanagement-production.up.railway.app

// Test API call
fetch(`${process.env.REACT_APP_API_URL}/health`)
  .then(r => r.json())
  .then(console.log);
// Should output: {status: "ok", db: "connected"}
```

---

## 🔄 Continuous Deployment

### Automatic Deployments (Recommended)

Once connected to GitHub:
- Push to `main` branch → Auto-deploy to production
- Push to other branches → Create preview deployments
- Pull requests → Automatic preview URLs

### Manual Deployments

```bash
cd frontend
vercel --prod
```

---

## 🎯 Production Checklist

Before going live:
- [ ] Backend CORS includes Vercel domain
- [ ] Environment variables set in Vercel
- [ ] Test all authentication flows
- [ ] Test protected routes
- [ ] Test SPA routing (refresh pages)
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Set up custom domain (optional)
- [ ] Enable Vercel Analytics (optional)
- [ ] Set up error monitoring (Sentry, etc.)

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain to Vercel

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `myapp.com`)
3. Follow DNS configuration instructions
4. Update backend CORS to include custom domain

---

## 📞 Support

If you encounter issues:

1. **Check Vercel build logs**: Dashboard → Deployments → Click deployment → View logs
2. **Check Railway logs**: Dashboard → Backend Service → Deployments → Logs
3. **Browser DevTools**: F12 → Console + Network tabs
4. **Test API directly**: Use curl or Postman

---

## 🎉 Success!

Your app should now be live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://customermanagement-production.up.railway.app`

Test the full flow:
1. Visit your Vercel URL
2. Login with credentials
3. Verify dashboard loads
4. Check all features work

---

## 📝 Quick Command Reference

```bash
# Build locally
npm run build

# Test production build locally
npx serve -s build

# Deploy to Vercel
vercel --prod

# Check Vercel deployment status
vercel ls

# View deployment logs
vercel logs

# Check backend health
curl https://customermanagement-production.up.railway.app/health
```

---

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Create React App Deployment](https://create-react-app.dev/docs/deployment/)
- [Railway Documentation](https://docs.railway.app)
- [FastAPI CORS Guide](https://fastapi.tiangolo.com/tutorial/cors/)

---

**Last Updated**: 2026-05-27  
**Backend**: FastAPI on Railway  
**Frontend**: Create React App on Vercel  
**Database**: MySQL on Railway
