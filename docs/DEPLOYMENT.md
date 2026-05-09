# Deployment Guide

## Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured

## Deployment Options

### Option 1: Heroku

1. **Install Heroku CLI**
   ```bash
   brew tap heroku/brew && brew install heroku
   ```

2. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**
   ```bash
   heroku config:set BACKEND_PORT=5000
   heroku config:set JWT_SECRET=your_secret_key
   heroku config:set DATABASE_URL=your_postgres_url
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 2: AWS

1. **EC2 Instance**
   - Ubuntu 20.04 LTS
   - Node.js 18+
   - PostgreSQL

2. **RDS Database**
   - PostgreSQL 12+
   - Multi-AZ for production

3. **S3 for Images**
   - Cloudinary integration for avatars/thumbnails

### Option 3: DigitalOcean

1. **App Platform**
   - Deploy frontend React app
   - Deploy backend Node.js app

2. **Database**
   - Managed PostgreSQL database

3. **Storage**
   - Spaces for image storage

## Production Checklist

- [ ] Enable HTTPS/SSL
- [ ] Set secure JWT secrets
- [ ] Configure CORS for production domains
- [ ] Set up database backups
- [ ] Configure monitoring/logging
- [ ] Set rate limiting
- [ ] Enable CSRF protection
- [ ] Configure security headers
- [ ] Set up CDN for static assets
- [ ] Enable database connection pooling

## Environment Variables

```bash
# Backend
BACKEND_PORT=5000
NODE_ENV=production
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=retro_games
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=another_long_random_secret
FRONTEND_URL=https://yourdomain.com

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Performance Tips

1. **Database**
   - Add indexes on frequently queried columns
   - Use connection pooling
   - Regular maintenance and vacuuming

2. **API**
   - Implement caching with Redis
   - Use pagination for large datasets
   - Compress responses with gzip

3. **Frontend**
   - Code splitting with dynamic imports
   - Lazy load routes
   - Cache static assets
   - Use CDN for distribution

4. **WebSockets**
   - Use Socket.IO adapters for scaling (Redis)
   - Implement heartbeat/ping-pong
   - Clean up disconnected sockets

## Monitoring

- Set up error tracking (Sentry)
- Monitor performance (New Relic, DataDog)
- Set up logging (Winston, Bunyan)
- Monitor database health
- Set up alerts for critical issues

## Scaling

For production scaling:

1. **Load Balancing**
   - Use Nginx or HAProxy
   - Sticky sessions for WebSockets

2. **Database**
   - Read replicas for scaling reads
   - Connection pooling (pgBouncer)
   - Database sharding if needed

3. **WebSocket Scaling**
   - Redis adapter for Socket.IO
   - Multiple server instances

4. **CDN**
   - CloudFront or similar
   - Cache game assets

## Backup Strategy

- Daily database backups
- Point-in-time recovery setup
- Test backup restoration regularly
- Archive old backups
