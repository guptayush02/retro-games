# PostgreSQL to MongoDB Migration Guide

## Overview

This guide explains the migration from PostgreSQL (SQL database) to MongoDB (NoSQL document database) including the new 30-minute guest mode feature.

## Why MongoDB?

| Feature | PostgreSQL | MongoDB |
|---------|-----------|---------|
| Schema | Rigid tables | Flexible documents |
| Guest Sessions | Difficult (no native types) | Natural (anonymous docs) |
| Performance | Vertical scaling | Horizontal sharding |
| Real-time | Works with Socket.IO | Optimized for real-time |
| Developer Experience | SQL learning curve | JSON-like syntax |

## Technology Changes

### Dependencies Changed

**Removed:**
```json
"pg": "^8.11.0"
```

**Added:**
```json
"mongoose": "^7.3.0",
"uuid": "^9.0.0"
```

### Database Connection

**Before (PostgreSQL):**
```javascript
// server/src/db.js
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
```

**After (MongoDB):**
```javascript
// server/src/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/retro_games';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};
```

## Schema Migration

### Users Table → User Collection

**PostgreSQL:**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  avatar VARCHAR(255),
  xp INT DEFAULT 0,
  coins INT DEFAULT 0,
  role VARCHAR(50) DEFAULT 'player',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**MongoDB (Mongoose):**
```javascript
const userSchema = new Schema({
  email: { type: String, unique: true, sparse: true },
  username: { type: String, unique: true },
  passwordHash: String,
  avatar: String,
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  role: { type: String, default: 'player' },
  // NEW: Guest session fields
  isAnonymous: { type: Boolean, default: false },
  anonymousSessionToken: String,
  anonymousSessionExpires: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

**Key Changes:**
- `id` → `_id` (auto-generated ObjectId)
- Column names: `password_hash` → `passwordHash` (camelCase)
- New fields for guest sessions: `isAnonymous`, `anonymousSessionToken`, `anonymousSessionExpires`
- Timestamps: auto-managed by Mongoose

### Other Collections

| PostgreSQL | MongoDB | Changes |
|-----------|---------|---------|
| games | games | Renamed columns to camelCase, added soft delete (isActive) |
| player_stats | playerStats | Compound unique index on (userId, gameId) |
| game_sessions | gameSessions | Renamed to camelCase |
| session_players | sessionPlayers | Renamed to camelCase |
| leaderboard | leaderboard | Same structure, added indexes |
| recently_played | recentlyPlayed | Renamed to camelCase |

## Query Migration

### SELECT → find()

**PostgreSQL:**
```sql
SELECT * FROM games WHERE is_active = true;
```

**MongoDB:**
```javascript
const games = await Game.find({ isActive: true });
```

### SELECT with JOIN → populate()

**PostgreSQL:**
```sql
SELECT ps.*, u.username, g.title 
FROM player_stats ps
JOIN users u ON ps.user_id = u.id
JOIN games g ON ps.game_id = g.id
WHERE ps.user_id = $1;
```

**MongoDB:**
```javascript
const stats = await PlayerStats.find({ userId })
  .populate('userId')
  .populate('gameId');
```

### INSERT → create()

**PostgreSQL:**
```sql
INSERT INTO users (email, username, password_hash)
VALUES ($1, $2, $3)
RETURNING *;
```

**MongoDB:**
```javascript
const user = await User.create({
  email,
  username,
  passwordHash
});
```

### UPDATE → findByIdAndUpdate()

**PostgreSQL:**
```sql
UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING *;
```

**MongoDB:**
```javascript
const user = await User.findByIdAndUpdate(
  userId,
  { $inc: { xp: points } },
  { new: true }
);
```

### DELETE → soft delete with isActive

**PostgreSQL:**
```sql
DELETE FROM games WHERE id = $1;
```

**MongoDB:**
```javascript
const game = await Game.findByIdAndUpdate(
  gameId,
  { isActive: false },
  { new: true }
);
```

## Middleware Changes

### Authentication Middleware

**Before (PostgreSQL + JWT only):**
```javascript
// server/src/middleware/auth.js
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    req.user = result.rows[0];
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

**After (MongoDB + Guest Sessions):**
```javascript
// server/src/middleware/auth.js
async function guestSessionMiddleware(req, res, next) {
  const guestToken = req.headers['x-guest-token'];
  
  if (!guestToken) {
    // Create new guest
    const sessionToken = uuidv4();
    const sessionExpires = new Date(Date.now() + 1800000);
    const guestUser = await User.create({
      username: `guest_${sessionToken.slice(0, 8)}`,
      isAnonymous: true,
      anonymousSessionToken: sessionToken,
      anonymousSessionExpires: sessionExpires
    });
    req.user = guestUser;
    req.isGuest = true;
    return next();
  }
  
  // Validate existing guest token
  const user = await User.findOne({
    anonymousSessionToken: guestToken,
    anonymousSessionExpires: { $gt: new Date() }
  });
  
  if (!user) return res.status(401).json({ error: 'Guest session expired' });
  
  req.user = user;
  req.isGuest = true;
  next();
}
```

## Frontend Changes

### API Client

**Before (PostgreSQL, JWT only):**
```javascript
// client/src/api/client.js
const api = axios.create({ baseURL: process.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**After (MongoDB, JWT + Guest Token):**
```javascript
// client/src/api/client.js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  const guestToken = localStorage.getItem('guestToken');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (guestToken) {
    config.headers['x-guest-token'] = guestToken;
  }
  return config;
});
```

### State Management

**New Guest Store:**
```javascript
// client/src/store/guestStore.js
import { create } from 'zustand';

const useGuestStore = create((set, get) => ({
  guestToken: localStorage.getItem('guestToken') || null,
  isGuest: !!localStorage.getItem('guestToken'),
  guestExpires: localStorage.getItem('guestExpires') 
    ? parseInt(localStorage.getItem('guestExpires'))
    : null,
  
  setGuestToken: (token, expiresIn) => {
    const expiresAt = Date.now() + expiresIn;
    localStorage.setItem('guestToken', token);
    localStorage.setItem('guestExpires', expiresAt);
    set({ guestToken: token, isGuest: true, guestExpires: expiresAt });
  },
  
  clearGuest: () => {
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestExpires');
    set({ guestToken: null, isGuest: false, guestExpires: null });
  },
  
  isGuestSessionValid: () => {
    const { guestExpires } = get();
    return guestExpires && Date.now() < guestExpires;
  }
}));
```

### Protected Routes

**Before:**
```javascript
// client/src/App.jsx
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
};
```

**After:**
```javascript
// client/src/App.jsx
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const { isGuest, isGuestSessionValid } = useGuestStore();
  
  const isAuthorized = isAuthenticated || (isGuest && isGuestSessionValid());
  return isAuthorized ? children : <Navigate to="/login" />;
};
```

## Environment Variables

**Before (.env for PostgreSQL):**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=retro_games
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret
```

**After (.env for MongoDB):**
```
MONGODB_URI=mongodb://localhost:27017/retro_games
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/retro_games

JWT_SECRET=your_secret
JWT_EXPIRY=7d
GUEST_SESSION_DURATION=1800000
```

## Migration Steps for Existing Projects

### 1. Install New Dependencies

```bash
cd server
npm uninstall pg
npm install mongoose uuid
```

### 2. Create MongoDB Connection

Replace `server/src/db.js` with MongoDB connection code (see above).

### 3. Create Mongoose Models

Create `server/src/models/` directory with all schema files:
- User.js
- Game.js
- PlayerStats.js
- GameSession.js
- SessionPlayer.js
- Leaderboard.js
- RecentlyPlayed.js

### 4. Update Controllers

Replace all `pool.query()` calls with Mongoose query methods:
- `User.find()`, `User.findById()`, `User.create()`
- `Game.find()`, `Game.findByIdAndUpdate()`
- etc.

### 5. Update Middleware

Add new guest session middleware to `server/src/middleware/auth.js`.

### 6. Update Frontend

Create `client/src/store/guestStore.js` with guest state management.

### 7. Update Routes

Add new routes:
- `POST /api/auth/guest-login`
- `POST /api/auth/validate-guest-token`

### 8. Update UI

Add guest login button to `client/src/pages/LoginPage.jsx`.

### 9. Seed Data

Update `server/src/seeds/seedDb.js` to use Mongoose models.

### 10. Test Everything

```bash
# Start MongoDB
mongod

# In another terminal
cd server && npm run seed
npm run dev

# In another terminal
cd client && npm run dev
```

## Performance Considerations

### Indexes

MongoDB creates indexes automatically on:
- `_id` (always)
- `email` (unique, sparse)
- `username` (unique)

Add compound indexes for frequently queried combinations:
```javascript
userSchema.index({ anonymousSessionToken: 1, anonymousSessionExpires: 1 });
playerStatsSchema.index({ userId: 1, gameId: 1 }, { unique: true });
recentlyPlayedSchema.index({ userId: 1, playedAt: -1 });
```

### Query Optimization

**Avoid N+1 Queries:**
```javascript
// ❌ Bad: N queries
const users = await User.find();
for (const user of users) {
  user.stats = await PlayerStats.find({ userId: user._id });
}

// ✅ Good: 1 query
const stats = await PlayerStats.find().populate('userId');
```

## Rollback Plan

If you need to return to PostgreSQL:

1. Keep PostgreSQL data synchronized initially
2. Run parallel reads from both databases
3. Compare results for validation
4. Once confident, switch fully to MongoDB
5. Archive PostgreSQL data for audit trail

## Support

For issues or questions:
- Check [DATABASE.md](./DATABASE.md) for schema details
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design patterns
- See [QUICK_START.md](./QUICK_START.md) for setup instructions
