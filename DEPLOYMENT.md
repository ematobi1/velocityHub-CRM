# Deployment Guide

Complete guide for deploying VelocityHub CRM to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Frontend Deployment (Netlify)](#frontend-deployment-netlify)
- [Backend Deployment (Render/Railway)](#backend-deployment)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)

---

## Prerequisites

### Required Accounts

1. **Netlify** - Frontend hosting (free tier available)
2. **Render** or **Railway** - Backend hosting
3. **MongoDB Atlas** - Database (free tier: 512MB)
4. **Redis Cloud** or **Upstash** - Caching (free tier available)
5. **Sentry** (optional) - Error monitoring

### Required Tools

- Node.js 18+
- Git
- npm or yarn

---

## Frontend Deployment (Netlify)

### Option 1: Deploy via Netlify UI

1. **Connect Repository**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account
   - Select `velocityHub-CRM` repository

2. **Configure Build Settings**
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/build
   ```

3. **Add Environment Variables**
   - Go to Site settings → Environment variables
   - Add `REACT_APP_API_URL` with your backend URL

4. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Navigate to frontend
cd frontend

# Build the app
npm run build

# Deploy
netlify deploy --prod
```

### Custom Domain Setup

1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS:
   ```
   Type: A
   Name: @
   Value: 75.2.60.5

   Type: CNAME
   Name: www
   Value: your-site.netlify.app
   ```

### Netlify Configuration

The repository includes `netlify.toml` with:
- ✅ SPA routing (redirects to index.html)
- ✅ API proxy (redirects /api/* to backend)
- ✅ Security headers
- ✅ Cache optimization

---

## Backend Deployment

### Option 1: Render

#### Via Render Dashboard

1. **Create Web Service**
   - Go to https://dashboard.render.com
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   ```
   Name: velocityhub-backend
   Root Directory: backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Environment Variables**
   Add all required env vars (see [Environment Variables](#environment-variables))

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

#### Via render.yaml

Create `render.yaml` in root:

```yaml
services:
  - type: web
    name: velocityhub-backend
    env: node
    region: oregon
    plan: free
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: REDIS_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      # Add other env vars
```

### Option 2: Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Initialize**
   ```bash
   railway login
   cd backend
   railway init
   ```

3. **Add Environment Variables**
   ```bash
   railway variables set MONGODB_URI="your-mongodb-uri"
   railway variables set JWT_SECRET="your-secret"
   # Add other variables
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Option 3: Docker Deployment

The repo includes Dockerfiles. Deploy to any Docker-compatible platform:

```bash
# Build images
docker build -t velocityhub-backend ./backend
docker build -t velocityhub-frontend ./frontend

# Run with docker-compose
docker-compose up -d
```

---

## Database Setup

### MongoDB Atlas

1. **Create Cluster**
   - Go to https://cloud.mongodb.com
   - Create new project "VelocityHub"
   - Create free M0 cluster

2. **Configure Access**
   - Database Access → Add new user
   - Network Access → Add IP (0.0.0.0/0 for dev, specific IPs for prod)

3. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password

4. **Run Migrations**
   ```bash
   cd backend
   MONGODB_URI="your-connection-string" npm run migrate:up
   ```

### Redis Setup

#### Option 1: Redis Cloud

1. Go to https://redis.com/try-free/
2. Create free database (30MB)
3. Copy connection details
4. Set `REDIS_URL` environment variable

#### Option 2: Upstash

1. Go to https://upstash.com
2. Create database
3. Copy Redis URL
4. Set `REDIS_URL` environment variable

---

## Environment Variables

### Backend (.env)

#### Required

```bash
# Core
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/velocityhub

# Cache
REDIS_URL=redis://default:password@redis-hostname:port

# Security
JWT_SECRET=your-super-secure-secret-at-least-32-characters-long

# Frontend
FRONTEND_URL=https://your-app.netlify.app
```

#### Optional but Recommended

```bash
# Error Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# AI Services
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GROQ_API_KEY=gsk_xxx

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=AKIAxxxx
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=velocityhub-uploads
```

### Frontend (.env.production.local)

```bash
REACT_APP_API_URL=https://your-backend-url.com
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Check backend health
curl https://your-backend-url.com/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":123,"environment":"production"}

# Check API docs
open https://your-backend-url.com/api-docs

# Check frontend
open https://your-app.netlify.app
```

### 2. Run Database Migrations

```bash
# SSH into backend or run locally
cd backend
npm run migrate:up
```

### 3. Create Admin User

```bash
# Using MongoDB shell or create via API
POST https://your-backend-url.com/api/auth/register
{
  "email": "admin@yourdomain.com",
  "password": "secure-password",
  "companyName": "Your Company",
  "role": "admin"
}
```

### 4. Test Core Features

- ✅ User registration/login
- ✅ Create leads
- ✅ Create deals
- ✅ Email workflows (if configured)
- ✅ API documentation access
- ✅ Error tracking (check Sentry)

---

## Monitoring

### Sentry Error Tracking

1. **Create Project**
   - Go to https://sentry.io
   - Create new project (Node.js for backend, React for frontend)

2. **Add DSN to Environment**
   ```bash
   # Backend
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

   # Frontend
   REACT_APP_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

3. **Configure Alerts**
   - Set up email/Slack notifications
   - Configure error thresholds

### Performance Monitoring

**Backend:**
- Sentry Performance (already integrated)
- Check `/health` endpoint regularly
- Monitor response times

**Frontend:**
- Netlify Analytics (built-in)
- Google Analytics (optional)

### Uptime Monitoring

Use services like:
- **UptimeRobot** - https://uptimerobot.com (free)
- **Pingdom** - https://pingdom.com
- **StatusCake** - https://statuscake.com

Monitor URLs:
- Frontend: https://your-app.netlify.app
- Backend: https://your-backend-url.com/health

---

## Troubleshooting

### Frontend Issues

**Build Fails**
```bash
# Check Node version
node --version  # Should be 18+

# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

**API Calls Fail**
- Check `REACT_APP_API_URL` is set correctly
- Verify CORS settings in backend
- Check browser console for errors

### Backend Issues

**Cannot Connect to Database**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas network access
- Ensure database user has proper permissions

**Redis Connection Fails**
- Verify `REDIS_URL` format
- Check Redis instance is running
- Caching will be disabled if Redis fails (app continues working)

**500 Errors**
- Check Sentry for error details
- Review application logs
- Verify all required env vars are set

### Database Issues

**Migrations Fail**
```bash
# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:down

# Re-run migrations
npm run migrate:up
```

---

## Scaling Considerations

### When to Scale

- Frontend: Netlify auto-scales
- Backend: Upgrade when CPU > 80% or memory > 90%
- Database: Upgrade when storage > 80% of limit

### Upgrade Paths

**Free → Paid**
- **Netlify Pro**: $19/month - Better performance, more builds
- **Render Starter**: $7/month - Better resources, less cold starts
- **MongoDB Atlas M10**: $57/month - Dedicated cluster, auto-scaling
- **Redis Cloud**: $7/month - More memory, better performance

---

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] JWT_SECRET is strong and unique
- [ ] MongoDB has authentication enabled
- [ ] Network access restricted to specific IPs
- [ ] HTTPS enabled everywhere
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Sentry error tracking configured
- [ ] Regular backups enabled

---

## Cost Estimation

### Free Tier (Development/MVP)

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| Netlify | Free | $0 | 100GB bandwidth |
| Render | Free | $0 | 750 hours/month |
| MongoDB Atlas | M0 | $0 | 512MB storage |
| Redis Cloud | Free | $0 | 30MB memory |
| Sentry | Developer | $0 | 5K errors/month |
| **TOTAL** | | **$0/month** | |

### Production (Small Business)

| Service | Plan | Cost | Specs |
|---------|------|------|-------|
| Netlify | Pro | $19 | 400GB bandwidth |
| Render | Starter | $7 | Always-on instance |
| MongoDB Atlas | M10 | $57 | 10GB storage |
| Redis Cloud | 250MB | $7 | 250MB memory |
| Sentry | Team | $26 | 50K errors/month |
| **TOTAL** | | **$116/month** | |

---

## Support

- **Documentation**: Check `/api-docs` for API reference
- **Issues**: Create GitHub issue
- **Email**: support@velocityhub.com

---

**Last Updated**: 2025-11-17
**Version**: 3.0
