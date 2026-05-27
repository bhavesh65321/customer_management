# 🚀 Frontend Deployment to Vercel

This guide covers deploying the Customer Management React frontend to Vercel and connecting it with the FastAPI backend on Railway.

---

## 📋 Quick Links

- **Backend (Railway)**: https://customermanagement-production.up.railway.app
- **API Docs**: https://customermanagement-production.up.railway.app/api/docs
- **Health Check**: https://customermanagement-production.up.railway.app/health

---

## 🎯 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Backend is running on Railway (check `/health` endpoint)
- [ ] Database is connected and accessible
- [ ] Environment variables are created (`.env.production`)
- [ ] Code is committed to Git/GitHub
- [ ] All tests pass locally

---

## 🔧 Configuration Files

### Environment Variables

**`.env.production`** (Production - Vercel)
```bash
REACT_APP_API_URL=https://customermanagement-production.up.railway.app
```

**`.env.development`** (Local Development)
```bash
REACT_APP_API_URL=http://127.0.0.1:8000
```

### Vercel Configuration

**`vercel.json`**
- Handles SPA routing (prevents 404 on refresh)
- Sets security headers
- Configures caching for static assets

---

## 🚀 Deployment Methods

### Method 1: Vercel Dashboard (Recommended)

#### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

#### Step 2: Import to Vercel
1. Go to https://vercel.com/new
2. Click "Import Project"
3. Select your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

#### Step 3: Add Environment Variables
In Vercel project settings → Environment Variables:

| Variable | Value | Environments |
|----------|-------|--------------|
| `REACT_APP_API_URL` | `https://customermanagement-production.up.railway.app` | Production, Preview, Development |

#### Step 4: Deploy
Click "Deploy" and wait for build to complete (~2-3 minutes)

---

### Method 2: Vercel CLI (Fastest)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from frontend directory
cd frontend
vercel

# Follow prompts and deploy to production
vercel --prod
```

---

## 🔐 Backend CORS Configuration

After deploying to Vercel, update your Railway backend CORS settings.

### Update Railway Environment Variables

Go to Railway Dashboard → Backend Service → Variables:

```bash
CORS_ORIGINS=https://your-actual-vercel-url.vercel.app,https://your-actual-vercel-url-*.vercel.app,http://localhost:3000,http://127.0.0.1:3000
```

**Replace** `your-actual-vercel-url` with your real Vercel domain!

### Alternative: Update Code Directly

Edit `backend/config/settings.py`:

```python
CORS_ORIGINS = [
    "https://your-app.vercel.app",              # Production
    "https://your-app-git-*.vercel.app",        # Git branch previews
    "https://your-app-*.vercel.app",            # All preview deployments
    "http://localhost:3000",                     # Local dev
    "http://127.0.0.1:3000",                    # Local dev alternative
]
```

Then redeploy the backend on Railway.

---

## ✅ Verification Steps

### 1. Test Production Build Locally

```bash
cd frontend

# Run verification script
./verify-deployment.sh

# Or manually:
npm run build
npx serve -s build
```

Visit http://localhost:5000 and test:
- Login flow
- Dashboard loads
- API calls work
- No console errors

### 2. Test Deployed App

After Vercel deployment:

```bash
# Run automated tests
node ../test-deployment.js https://your-app.vercel.app
```

Or manually test:
1. Visit your Vercel URL
2. Open browser DevTools (F12)
3. Check Console tab (should be no errors)
4. Check Network tab (API calls should succeed)
5. Test login with real credentials
6. Verify JWT token is stored in localStorage
7. Test protected routes

### 3. Verify Backend Connection

In browser console on your Vercel site:

```javascript
// Check API URL
console.log('API URL:', process.env.REACT_APP_API_URL);
// Expected: https://customermanagement-production.up.railway.app

// Test health endpoint
fetch('https://customermanagement-production.up.railway.app/health')
  .then(r => r.json())
  .then(data => console.log('Backend Health:', data));
// Expected: {status: "ok", db: "connected", latency_ms: ...}

// Test CORS (from your Vercel domain)
fetch('https://customermanagement-production.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'test', password: 'test123' })
})
  .then(r => r.json())
  .then(console.log)
  .catch(err => console.error('CORS Error:', err));
```

---

## 🐛 Troubleshooting

### Issue: CORS Error

**Symptom**:
```
Access to fetch at 'https://customermanagement-production.up.railway.app/api/...'
from origin 'https://your-app.vercel.app' has been blocked by CORS policy
```

**Solution**:
1. Verify `CORS_ORIGINS` in Railway includes your Vercel domain
2. Restart Railway backend service
3. Clear browser cache
4. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

---

### Issue: 404 on Page Refresh

**Symptom**: Refreshing `/dashboard` or any route shows 404

**Solution**:
✅ Already fixed! Check that `vercel.json` exists and contains:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

### Issue: Environment Variables Not Working

**Symptom**: API calls go to `http://127.0.0.1:8000` in production

**Checklist**:
- [ ] Variable name starts with `REACT_APP_`
- [ ] Variable is set in Vercel Dashboard (not just local `.env`)
- [ ] Redeploy after adding variables (Settings → Redeploy)
- [ ] Check build logs for confirmation

**Verify**:
```javascript
// In browser console on Vercel
console.log(process.env.REACT_APP_API_URL);
```

---

### Issue: Build Fails

**Common Causes**:

1. **ESLint warnings treated as errors**:
   ```json
   // package.json
   "scripts": {
     "build": "CI=false react-scripts build"
   }
   ```

2. **Missing dependencies**:
   ```bash
   npm install
   npm audit fix
   ```

3. **Node version mismatch**:
   ```json
   // package.json
   "engines": {
     "node": ">=18.0.0"
   }
   ```

---

### Issue: White Screen / Blank Page

**Debugging**:
1. Open DevTools → Console tab
2. Look for JavaScript errors
3. Check Network tab for failed requests
4. Verify `index.html` loads

**Common Causes**:
- JavaScript errors blocking render
- Wrong PUBLIC_URL
- Missing environment variables
- CORS blocking API calls

---

### Issue: Login Returns 401

**Checklist**:
- [ ] Backend is running (check `/health`)
- [ ] Database is connected
- [ ] User credentials are correct
- [ ] JWT tokens are being generated
- [ ] No CORS errors blocking response

**Test Backend Directly**:
```bash
curl -X POST https://customermanagement-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"yourusername","password":"yourpassword"}'
```

---

## 🔄 Continuous Deployment

### Automatic Deployments (Recommended)

Once connected to GitHub:
- **Push to `main`** → Auto-deploy to Production
- **Push to feature branch** → Create Preview Deployment
- **Open Pull Request** → Automatic preview URL in PR comments

### Preview Deployments

Every Git branch gets its own preview URL:
- `main` → `https://your-app.vercel.app`
- `develop` → `https://your-app-git-develop-username.vercel.app`
- `feature` → `https://your-app-git-feature-username.vercel.app`

**Update CORS** to allow all preview deployments:
```bash
CORS_ORIGINS=https://your-app-*.vercel.app
```

---

## 🎨 Custom Domain (Optional)

### Add Custom Domain

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `myapp.com`)
3. Follow DNS configuration instructions
4. Wait for DNS propagation (up to 48 hours)

### Update Backend CORS

Add custom domain to Railway `CORS_ORIGINS`:
```bash
CORS_ORIGINS=https://myapp.com,https://your-app.vercel.app
```

---

## 📊 Monitoring & Analytics

### Enable Vercel Analytics

1. Vercel Dashboard → Your Project → Analytics
2. Enable Web Analytics (free)
3. View real-time visitor data

### Error Tracking (Recommended)

Consider adding error monitoring:
- [Sentry](https://sentry.io) - Error tracking
- [LogRocket](https://logrocket.com) - Session replay
- [Datadog](https://www.datadoghq.com) - APM & logs

---

## 🔒 Security Best Practices

### Environment Variables
- ✅ Never commit `.env` files to Git
- ✅ Use Vercel Dashboard for sensitive variables
- ✅ Rotate secrets regularly

### HTTPS
- ✅ Vercel provides automatic HTTPS
- ✅ Force HTTPS redirects (automatic)

### Headers
- ✅ Security headers configured in `vercel.json`
- ✅ CSP headers added
- ✅ X-Frame-Options set to DENY

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Build succeeds locally
- [ ] Environment variables configured
- [ ] Code committed and pushed

### Deployment
- [ ] Project imported to Vercel
- [ ] Environment variables added
- [ ] Build and deploy succeeded
- [ ] Deployment URL accessible

### Post-Deployment
- [ ] Update Railway CORS with Vercel URL
- [ ] Test login flow
- [ ] Test protected routes
- [ ] Verify API calls work
- [ ] Check browser console (no errors)
- [ ] Test on mobile devices
- [ ] Set up custom domain (optional)
- [ ] Enable analytics (optional)

---

## 📞 Support & Resources

### Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Create React App Deployment](https://create-react-app.dev/docs/deployment/)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)

### Deployment Scripts
- `./verify-deployment.sh` - Test build before deploying
- `../test-deployment.js` - Automated post-deploy tests

### Useful Commands
```bash
# Build production bundle
npm run build

# Test build locally
npx serve -s build

# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Rollback deployment
vercel rollback
```

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ Vercel build completes without errors  
✅ Frontend is accessible at Vercel URL  
✅ Login works and returns JWT token  
✅ Dashboard and protected routes load  
✅ API calls succeed (check Network tab)  
✅ No CORS errors in browser console  
✅ Page refresh works (no 404)  
✅ Mobile responsive design works  

---

**Last Updated**: 2026-05-27  
**Stack**: React (CRA) + FastAPI  
**Deployment**: Vercel + Railway  
**Database**: MySQL on Railway
