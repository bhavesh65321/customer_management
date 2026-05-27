# 🏗️ Production Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION DEPLOYMENT                           │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────┐
│                  │         │                  │         │              │
│     USERS        │────────▶│    VERCEL CDN    │────────▶│   RAILWAY    │
│  (Web Browser)   │  HTTPS  │  (React Frontend)│  HTTPS  │  (FastAPI)   │
│                  │◀────────│                  │◀────────│              │
└──────────────────┘         └──────────────────┘         └──────┬───────┘
                                                                  │
                                                                  │
                                                          ┌───────▼───────┐
                                                          │               │
                                                          │  MySQL DB     │
                                                          │  (Railway)    │
                                                          │               │
                                                          └───────────────┘
```

---

## Component Details

### 🎨 Frontend (Vercel)

**Technology Stack:**
- React 19.1.0
- Create React App
- React Router v7
- Tailwind CSS
- React Hot Toast

**Configuration:**
```json
{
  "framework": "create-react-app",
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rootDirectory": "frontend"
}
```

**Environment Variables:**
```bash
REACT_APP_API_URL=https://customermanagement-production.up.railway.app
```

**Features:**
- JWT Authentication
- Protected Routes
- SPA Routing (no 404 on refresh)
- Responsive Design
- Toast Notifications
- Error Boundaries
- Offline Detection

**URLs:**
- Production: `https://your-app.vercel.app`
- Preview: `https://your-app-git-branch-user.vercel.app`

---

### ⚙️ Backend (Railway)

**Technology Stack:**
- FastAPI (Python)
- SQLAlchemy ORM
- Pydantic validation
- JWT authentication
- APScheduler (background jobs)

**Configuration:**
```python
ENV=production
DATABASE_URL=mysql://...
SECRET_KEY=...
CORS_ORIGINS=https://your-app.vercel.app,...
```

**Features:**
- RESTful API
- JWT-based auth
- Role-based access control (RBAC)
- Rate limiting
- Security headers
- Health checks
- API documentation (Swagger)
- Background job scheduling

**Endpoints:**
- API: `/api/*`
- Health: `/health`
- Docs: `/api/docs`
- OpenAPI: `/api/openapi.json`

**URL:**
- Production: `https://customermanagement-production.up.railway.app`

---

### 🗄️ Database (Railway MySQL)

**Configuration:**
- MySQL 8.0+
- Hosted on Railway
- Automatic backups
- Connection pooling via SQLAlchemy

**Schema Management:**
- Alembic migrations
- Automatic schema updates
- Idempotent migrations

---

## 🔐 Security Architecture

### Authentication Flow

```
┌──────────┐                                    ┌──────────┐
│          │  1. POST /api/auth/login          │          │
│  Client  │───────────────────────────────────▶│  Backend │
│ (Vercel) │  {username, password}             │ (Railway)│
│          │                                    │          │
│          │  2. JWT Token                     │          │
│          │◀───────────────────────────────────│          │
│          │  {access_token, refresh_token}    │          │
│          │                                    │          │
│          │  3. Store in localStorage         │          │
│          │                                    │          │
│          │  4. API Request                   │          │
│          │───────────────────────────────────▶│          │
│          │  Authorization: Bearer <token>    │          │
│          │                                    │          │
│          │  5. Verify Token + Response       │          │
│          │◀───────────────────────────────────│          │
│          │  {data}                           │          │
└──────────┘                                    └──────────┘
```

### Security Features

**Frontend (Vercel):**
- ✅ Automatic HTTPS
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ XSS protection
- ✅ Token stored in localStorage
- ✅ Auto-redirect on 401
- ✅ CORS-compliant requests

**Backend (Railway):**
- ✅ JWT token validation
- ✅ Password hashing (bcrypt)
- ✅ CORS configuration
- ✅ Rate limiting (SlowAPI)
- ✅ Request validation (Pydantic)
- ✅ SQL injection protection (SQLAlchemy)
- ✅ Security headers middleware
- ✅ Role-based access control

---

## 🌐 Request Flow

### Typical API Request

```
1. User Action (e.g., "Load Dashboard")
   │
   ▼
2. React Component calls API
   │
   ▼
3. api.js adds Authorization header
   │
   ▼
4. Fetch request to Railway backend
   │
   ▼
5. Railway receives request
   │
   ├─▶ CORS Middleware (validate origin)
   ├─▶ Rate Limiter (check limits)
   ├─▶ Auth Middleware (verify JWT)
   ├─▶ Route Handler (business logic)
   └─▶ Database Query (if needed)
   │
   ▼
6. Response sent back to client
   │
   ▼
7. api.js handles response
   │
   ├─▶ Success: Return data
   ├─▶ 401: Redirect to login
   ├─▶ 5xx: Show error toast
   └─▶ Other: Throw error
   │
   ▼
8. React component updates UI
```

---

## 🚀 Deployment Pipeline

### Continuous Deployment

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATED CI/CD PIPELINE                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│  Developer  │
│  git push   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   GitHub    │
│  Repository │
└──────┬──────┘
       │
       ├────────────────────┬────────────────────┐
       ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐     ┌─────────────┐
│   Vercel    │      │   Railway   │     │   Railway   │
│ (Frontend)  │      │  (Backend)  │     │  (Database) │
└──────┬──────┘      └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       │ 1. Install deps    │ 1. Install deps    │
       │ 2. npm run build   │ 2. Run migrations  │
       │ 3. Deploy to CDN   │ 3. Start FastAPI   │
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐     ┌─────────────┐
│    LIVE     │      │    LIVE     │     │    LIVE     │
│  Frontend   │◀────▶│   Backend   │◀────▶│  Database   │
└─────────────┘      └─────────────┘     └─────────────┘
```

### Deployment Triggers

| Action | Frontend (Vercel) | Backend (Railway) |
|--------|-------------------|-------------------|
| Push to `main` | ✅ Deploy to Production | ✅ Deploy to Production |
| Push to feature branch | ✅ Create Preview | ✅ Create Preview (optional) |
| Pull Request | ✅ Auto Preview URL | ❌ Manual deploy |
| Rollback | ✅ Via Dashboard | ✅ Via Dashboard |

---

## 📊 Environment Configuration

### Local Development

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │         │   Backend    │         │   Database   │
│ localhost:   │────────▶│ localhost:   │────────▶│ localhost:   │
│    3000      │  HTTP   │    8000      │  MySQL  │    3306      │
└──────────────┘         └──────────────┘         └──────────────┘

Environment:
  REACT_APP_API_URL=http://127.0.0.1:8000
  DATABASE_URL=mysql://root:password@localhost:3306/db
  ENV=development
```

### Production

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │         │   Backend    │         │   Database   │
│   Vercel     │────────▶│   Railway    │────────▶│   Railway    │
│   (Global)   │  HTTPS  │   (US/EU)    │  MySQL  │   (US/EU)    │
└──────────────┘         └──────────────┘         └──────────────┘

Environment:
  REACT_APP_API_URL=https://customermanagement-production.up.railway.app
  DATABASE_URL=mysql://user:pass@host:port/db
  ENV=production
  CORS_ORIGINS=https://your-app.vercel.app,...
```

---

## 🔄 Data Flow Examples

### User Login Flow

```
[Browser]                  [Vercel]                [Railway]           [Database]
    │                         │                        │                    │
    │ 1. Enter credentials    │                        │                    │
    ├────────────────────────▶│                        │                    │
    │                         │                        │                    │
    │                         │ 2. POST /api/auth/login│                    │
    │                         ├───────────────────────▶│                    │
    │                         │                        │ 3. Query user      │
    │                         │                        ├───────────────────▶│
    │                         │                        │                    │
    │                         │                        │ 4. User data       │
    │                         │                        │◀───────────────────┤
    │                         │                        │                    │
    │                         │                        │ 5. Verify password │
    │                         │                        │ 6. Generate JWT    │
    │                         │                        │                    │
    │                         │ 7. Return token        │                    │
    │                         │◀───────────────────────┤                    │
    │                         │                        │                    │
    │ 8. Store in localStorage│                        │                    │
    │◀────────────────────────┤                        │                    │
    │                         │                        │                    │
    │ 9. Redirect to dashboard│                        │                    │
    └────────────────────────▶│                        │                    │
```

### Protected Route Access

```
[Browser]                  [Vercel]                [Railway]           [Database]
    │                         │                        │                    │
    │ 1. Navigate to /home    │                        │                    │
    ├────────────────────────▶│                        │                    │
    │                         │                        │                    │
    │                         │ 2. Check localStorage  │                    │
    │                         │    for token           │                    │
    │                         │                        │                    │
    │                         │ 3. GET /api/dashboard  │                    │
    │                         │    Authorization: Bearer│                   │
    │                         ├───────────────────────▶│                    │
    │                         │                        │ 4. Verify JWT      │
    │                         │                        │                    │
    │                         │                        │ 5. Query data      │
    │                         │                        ├───────────────────▶│
    │                         │                        │                    │
    │                         │                        │ 6. Results         │
    │                         │                        │◀───────────────────┤
    │                         │                        │                    │
    │                         │ 7. Return data         │                    │
    │                         │◀───────────────────────┤                    │
    │                         │                        │                    │
    │ 8. Render dashboard     │                        │                    │
    │◀────────────────────────┤                        │                    │
```

---

## 🛠️ Technology Stack Summary

### Frontend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 19.1.0 |
| React Router | Routing | 7.5.2 |
| Tailwind CSS | Styling | 3.4.17 |
| React Hot Toast | Notifications | 2.6.0 |
| Recharts | Data Visualization | 3.8.0 |
| Headless UI | Accessible Components | 2.2.2 |

### Backend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| FastAPI | Web Framework | Latest |
| SQLAlchemy | ORM | Latest |
| Pydantic | Validation | Latest |
| PyJWT | JWT Auth | Latest |
| APScheduler | Background Jobs | Latest |
| PyMySQL | MySQL Driver | Latest |

### Infrastructure

| Service | Purpose | Provider |
|---------|---------|----------|
| Frontend Hosting | Static Site CDN | Vercel |
| Backend Hosting | API Server | Railway |
| Database | MySQL DB | Railway |
| DNS | Domain Management | Your DNS Provider |
| HTTPS | SSL/TLS | Automatic (Vercel/Railway) |

---

## 📈 Performance Characteristics

### Frontend (Vercel)

- **CDN**: Global edge network (300+ locations)
- **TTFB**: < 50ms (first byte)
- **Load Time**: < 2s (initial page load)
- **Caching**: Static assets cached for 1 year
- **Compression**: Automatic Gzip/Brotli

### Backend (Railway)

- **Response Time**: ~100-300ms (API calls)
- **Database Latency**: ~10-50ms (internal network)
- **Rate Limit**: Configurable per endpoint
- **Concurrent Requests**: Auto-scaling

---

## 🔍 Monitoring & Observability

### Health Checks

```bash
# Frontend health
curl https://your-app.vercel.app
# Returns: 200 OK

# Backend health
curl https://customermanagement-production.up.railway.app/health
# Returns: {"status":"ok","db":"connected","latency_ms":50}
```

### Logs

- **Vercel**: Dashboard → Deployments → Logs
- **Railway**: Dashboard → Service → Deployments → Logs

### Metrics (Built-in)

- Request count
- Response time
- Error rate
- Build time
- Deployment frequency

---

## 🚨 Disaster Recovery

### Backups

- **Database**: Railway automatic daily backups
- **Code**: Git repository (GitHub)
- **Deployments**: Vercel/Railway maintain deployment history

### Rollback Procedure

**Frontend (Vercel):**
```bash
vercel rollback
# Or via Dashboard → Deployments → Rollback
```

**Backend (Railway):**
- Dashboard → Deployments → Select previous version → Restore

---

## 🌟 Scaling Strategy

### Horizontal Scaling

- **Frontend**: Auto-scaled via Vercel CDN
- **Backend**: Railway auto-scaling (Pro plan)
- **Database**: Vertical scaling + read replicas

### Vertical Scaling

Upgrade Railway plan:
- Starter: 512MB RAM
- Pro: 8GB RAM
- Enterprise: Custom

---

## 📞 Support & Maintenance

### Regular Tasks

- [ ] Monitor error logs weekly
- [ ] Check API response times
- [ ] Review database size
- [ ] Update dependencies monthly
- [ ] Rotate JWT secrets quarterly
- [ ] Review and update CORS origins

### Emergency Contacts

- **Vercel Status**: https://vercel-status.com
- **Railway Status**: https://status.railway.app
- **Support**: Check respective dashboards

---

**Last Updated**: 2026-05-27  
**Version**: 1.0  
**Architecture Type**: Jamstack (Decoupled Frontend/Backend)  
**Deployment Status**: Ready for Production 🚀
