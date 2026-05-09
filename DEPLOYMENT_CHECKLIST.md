# Deployment & Launch Checklist

## Pre-Launch Testing (Development)

### Guest Mode Testing
- [ ] Start backend: `cd server && npm run dev`
- [ ] Start frontend: `cd client && npm run dev`
- [ ] Navigate to http://localhost:5173
- [ ] Click "Play as Guest (30 min)" button
- [ ] Verify guest token appears in localStorage
- [ ] Check navbar shows "👤 Guest (30m Remaining)"
- [ ] View a game (scores shouldn't be recorded)
- [ ] Wait 5 minutes and verify countdown updated
- [ ] Logout and check localStorage is cleared
- [ ] Try guest again to verify multiple sessions work

### Authentication Testing
- [ ] Sign up with new account (email + password)
- [ ] Login with created account
- [ ] Verify JWT token in localStorage
- [ ] Update profile information
- [ ] Logout and verify cleared
- [ ] Login again with same credentials
- [ ] Play game and verify score IS recorded
- [ ] Check leaderboard includes registered user, excludes guests

### API Testing
```bash
# Test guest creation
curl -X POST http://localhost:5000/api/auth/guest-login

# Test get games (should work for guests)
curl http://localhost:5000/api/games

# Test with guest token
curl http://localhost:5000/api/games \
  -H "x-guest-token: YOUR_TOKEN_HERE"

# Test with JWT
curl http://localhost:5000/api/games \
  -H "Authorization: Bearer YOUR_JWT_HERE"
```

### Browser DevTools Verification
- [ ] localStorage contains: `guestToken`, `guestExpires`, `authToken`
- [ ] Network requests include either `Authorization` or `x-guest-token` header
- [ ] Console shows no errors during guest login
- [ ] Console shows no CORS errors

### Database Verification
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/retro_games

# Check guest users exist
db.users.find({ isAnonymous: true }).limit(5)

# Check guest has expiration date
db.users.findOne({ isAnonymous: true })

# Check indexes exist
db.users.getIndexes()
```

## Staging Environment Setup

### Backend Staging

**1. Database Setup**
```bash
# MongoDB Atlas
- Create staging cluster
- Create staging database user
- Whitelist staging server IP
- Get connection string
```

**2. Backend Deployment**
```bash
# Option A: Heroku
heroku create retro-games-staging
git push heroku main

# Option B: Railway
railway link
railway up

# Option C: Render
- Connect GitHub repo
- Auto-deploy on push
```

**3. Environment Variables**
```bash
MONGODB_URI=mongodb+srv://staging_user:pass@cluster-staging.mongodb.net/retro_games_staging
JWT_SECRET=staging_secret_key_change_before_production
GUEST_SESSION_DURATION=1800000
NODE_ENV=staging
CLIENT_URL=https://staging.retrogames.com
```

**4. Verify Deployment**
```bash
curl https://staging-api.retrogames.com/api/auth/guest-login
# Should return guest token + expiration
```

### Frontend Staging

**1. Build**
```bash
cd client
npm run build  # Creates dist/ folder
```

**2. Deploy to Vercel/Netlify**
```bash
# Vercel
vercel --prod --env VITE_API_URL=https://staging-api.retrogames.com

# Netlify
netlify deploy --prod --dir=dist
```

**3. Environment**
```bash
VITE_API_URL=https://staging-api.retrogames.com/api
```

**4. Test Staging Site**
- [ ] Visit https://staging.retrogames.com
- [ ] Test guest login flow
- [ ] Test registered user flow
- [ ] Test all game pages load
- [ ] Test leaderboards display
- [ ] Check navbar countdown updates

## Production Environment Setup

### Backend Production

**1. MongoDB Atlas Production**
```bash
- Create production cluster (replicated)
- Create production database user (strong password)
- Whitelist only production servers
- Enable backup snapshots
- Enable monitoring
```

**2. Backend Production Deployment**

**Heroku:**
```bash
heroku create retro-games-prod
heroku config:set MONGODB_URI="mongodb+srv://prod_user:password@cluster-prod.mongodb.net/retro_games"
heroku config:set JWT_SECRET="[GENERATE_STRONG_SECRET]"
heroku config:set NODE_ENV="production"
git push heroku main
heroku logs -t  # Watch logs
```

**Railway/Render:**
- Same as staging but connect to production MongoDB
- Enable auto-scaling if needed
- Set resource limits

**3. Production Environment Variables**
```bash
# CRITICAL: Use strong random values
MONGODB_URI=mongodb+srv://prod_user:STRONG_PASSWORD@cluster-prod.mongodb.net/retro_games
JWT_SECRET=[32-character-random-string]
JWT_EXPIRY=7d
GUEST_SESSION_DURATION=1800000
NODE_ENV=production
CLIENT_URL=https://retrogames.com
PORT=5000
```

**4. Initial Data**
```bash
# Seed production database with games
npm run seed

# Verify games were created
curl https://api.retrogames.com/api/games
```

### Frontend Production

**1. Production Build**
```bash
cd client
VITE_API_URL=https://api.retrogames.com npm run build
```

**2. Deploy to CDN**

**Vercel:**
```bash
vercel --prod --env VITE_API_URL=https://api.retrogames.com
```

**Netlify:**
```bash
netlify deploy --prod --dir=dist
```

**AWS CloudFront/S3:**
- Upload dist/ to S3 bucket
- Create CloudFront distribution
- Set origin to S3 bucket

**3. Production Configuration**
```bash
VITE_API_URL=https://api.retrogames.com
NODE_ENV=production
```

**4. Domain Setup**
```bash
# Point domain to frontend CDN
retrogames.com → Vercel/Netlify/CloudFront

# Point API subdomain to backend
api.retrogames.com → Heroku/Railway/Render
```

## Production Testing Checklist

### Load Testing
```bash
# Install loadtest
npm install -g loadtest

# Test guest login endpoint
loadtest -n 100 -c 10 https://api.retrogames.com/api/auth/guest-login
# Should handle 100 requests in ~10 concurrent

# Test games endpoint
loadtest -n 1000 -c 50 https://api.retrogames.com/api/games
# Should maintain <200ms response time
```

### Security Testing
- [ ] HTTPS enabled on all domains
- [ ] CORS properly configured (CLIENT_URL)
- [ ] JWT_SECRET is cryptographically secure
- [ ] Password hashing uses bcryptjs (10+ rounds)
- [ ] Database connections encrypted (SSL)
- [ ] No sensitive data in logs
- [ ] Rate limiting implemented on auth endpoints

### Monitoring Setup

**Backend Monitoring:**
```bash
# Heroku/Railway built-in logs
heroku logs -t

# MongoDB Atlas monitoring
- Check connection count
- Monitor query performance
- Alert on high CPU/memory
```

**Frontend Monitoring:**
```bash
# Sentry setup (error tracking)
npm install @sentry/react
# Configure in main.jsx

# Analytics (optional)
npm install posthog-js
```

### Performance Verification
- [ ] API response time < 200ms (p95)
- [ ] Frontend load time < 3s (p95)
- [ ] Guest session creation < 100ms
- [ ] Leaderboard queries < 500ms
- [ ] Database connections pooled efficiently

## Post-Launch Monitoring

### Daily Checks (First Week)
```
6:00 AM
- Check error logs (backend/frontend)
- Verify database is operational
- Check API response times
- Monitor guest session creation rate

12:00 PM
- Review error trends
- Check leaderboard calculations
- Verify JWT token generation
- Monitor active user count

6:00 PM
- Full system health check
- Database backup verification
- Review performance metrics
- Check for any security alerts
```

### Weekly Checks (Ongoing)
- [ ] Database backup completed successfully
- [ ] No failed guest token validations
- [ ] Leaderboard calculations accurate
- [ ] Zero unhandled errors in past 7 days
- [ ] API availability > 99.9%
- [ ] Average response time stable
- [ ] Database size growing reasonably
- [ ] No security alerts

### Monthly Review (Ongoing)
- [ ] User growth metrics
- [ ] Guest vs registered user ratio
- [ ] Most played games
- [ ] Feature usage statistics
- [ ] Cost analysis (compute, database)
- [ ] Performance trends
- [ ] Error rate trends
- [ ] Plan for next month's improvements

## Rollback Plan

If critical issues occur:

### Immediate Rollback (< 5 min downtime)
```bash
# Revert to previous version
git revert HEAD
git push production

# Or deploy previous stable version
# With both Heroku and Netlify: simple redeploy from git history
```

### Database Rollback (if needed)
```bash
# MongoDB Atlas backup restore
- Navigate to: Cluster → Backup → Restore
- Select previous snapshot
- Restore to new cluster first
- Test, then switch if needed
```

### Partial Rollback (frontend only)
```bash
# Keep old API running, revert frontend
netlify deploy --prod --dir=previous-dist-backup
```

## Success Criteria

### User Experience
- [ ] Guest login works in < 1 second
- [ ] Countdown timer displays correctly
- [ ] No 401 errors for valid guests
- [ ] Smooth game experience (no lag)
- [ ] Leaderboard updates in real-time

### Performance
- [ ] API response time < 200ms (p95)
- [ ] Frontend load time < 3s
- [ ] Database queries < 500ms (p95)
- [ ] WebSocket latency < 100ms
- [ ] Zero 5xx errors

### Reliability
- [ ] 99.9% uptime (measured monthly)
- [ ] Zero data loss incidents
- [ ] Automatic backup working
- [ ] No failed guest sessions
- [ ] No duplicate sessions

### Security
- [ ] All HTTPS endpoints
- [ ] CORS properly configured
- [ ] No sensitive data in logs
- [ ] Rate limiting on auth
- [ ] Guest tokens expire after 30 min
- [ ] No guest data persists after logout

## Launch Timeline

### T-7 Days: Final Testing
- Complete staging environment testing
- Load testing (verify capacity)
- Security audit
- Documentation review

### T-3 Days: Backup & Monitoring
- Configure production backups
- Set up error alerting
- Configure performance monitoring
- Brief team on launch day

### T-1 Day: Final Checks
- Verify all environment variables
- Test database connection
- Test API endpoints
- Test frontend deployment
- Brief QA team

### T-0 (Launch Day)
```
08:00 - Team standup, go/no-go decision
09:00 - Deploy backend to production
09:15 - Verify backend is operational
09:30 - Deploy frontend to production
09:45 - Full smoke test
10:00 - Announce launch
10:00-12:00 - Monitor actively (team on standby)
12:00+ - Normal monitoring (alerting active)
```

### T+1 Hour: Post-Launch
- [ ] Monitor error rates (should be < 0.1%)
- [ ] Check guest session creation rate
- [ ] Verify leaderboard updates
- [ ] Monitor database performance
- [ ] Check API response times

### T+24 Hours: First Day Review
- [ ] Total users who visited
- [ ] Total guest sessions created
- [ ] Average session duration
- [ ] Any errors or issues
- [ ] User feedback (if available)

### T+7 Days: First Week Review
- [ ] User retention rate
- [ ] Guest conversion rate (to registered)
- [ ] Most popular games
- [ ] Performance stability
- [ ] Any needed hotfixes

## Communication

### Before Launch
- [ ] Notify team: "Launch in 24 hours"
- [ ] Send environment details to team
- [ ] Confirm monitoring is set up
- [ ] Test communication channels

### During Launch
- [ ] Team ready on chat/call
- [ ] Deploy backend → Monitor 15 min
- [ ] Deploy frontend → Monitor 15 min
- [ ] Full system test → Monitor
- [ ] Public announcement

### After Launch
- [ ] Daily standup first week
- [ ] Weekly review first month
- [ ] Monthly metrics review ongoing

## Contact & Emergency

### On-Call
- Backend: [Contact info]
- Frontend: [Contact info]
- Database: [Contact info]
- All: [Emergency channel]

### Critical Issues (during launch)
1. Page alerts go to on-call
2. If no response in 5 min → page manager
3. If no response in 5 min → escalate to director
4. After 30 min with no fix → decide on rollback

## Maintenance Windows (Post-Launch)

### Scheduled Maintenance
- Database backups: Daily 2-4 AM UTC
- SSL certificate renewal: Auto via Let's Encrypt
- Dependencies updates: Monthly
- Database cleanup: Weekly (delete expired guests)

### No-Downtime Maintenance
- Guest cleanup (runs in background)
- Index optimization (MongoDB handles)
- Log rotation (handled by platform)

---

**Last Updated**: [TODAY]
**Version**: 1.0
**Status**: Ready for Production Deployment
