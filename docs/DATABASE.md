# Database Schema - MongoDB

## Overview

The application uses **MongoDB** (NoSQL) instead of PostgreSQL for better flexibility and schema-less storage. Collections automatically store document IDs as `_id` fields.

## Collections

### users
```javascript
{
  _id: ObjectId,
  email: String (unique, sparse),          // null for anonymous users
  username: String (unique),
  passwordHash: String,
  avatar: String,
  xp: Number (default: 0),
  coins: Number (default: 0),
  role: String ('player' or 'admin'),
  isAnonymous: Boolean,
  anonymousSessionToken: String,           // UUID for guest sessions
  anonymousSessionExpires: Date,           // 30-minute expiry
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `anonymousSessionToken` + `anonymousSessionExpires` (for session validation)
- `email` (sparse, allows null)
- `username` (unique)

### games
```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String,
  genre: String,
  thumbnail: String,
  gameType: String ('single-player' or 'multiplayer'),
  maxPlayers: Number,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### playerStats
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  gameId: ObjectId (ref: Game),
  wins: Number (default: 0),
  losses: Number (default: 0),
  draws: Number (default: 0),
  highestScore: Number (default: 0),
  totalPlays: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `userId` + `gameId` (unique combination)

### gameSessions
```javascript
{
  _id: ObjectId,
  gameId: ObjectId (ref: Game),
  roomName: String,
  hostId: ObjectId (ref: User),
  status: String ('waiting', 'playing', 'finished'),
  maxPlayers: Number,
  currentPlayers: Number,
  endedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### sessionPlayers
```javascript
{
  _id: ObjectId,
  sessionId: ObjectId (ref: GameSession),
  userId: ObjectId (ref: User),
  score: Number (default: 0),
  position: Number,
  joinedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### leaderboard
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  gameId: ObjectId (ref: Game),              // null for global leaderboard
  score: Number,
  rank: Number,
  period: String ('daily', 'weekly', 'all-time'),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `rank` + `period` (for leaderboard queries)

### recentlyPlayed
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  gameId: ObjectId (ref: Game),
  playedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `userId` + `playedAt` (descending) - for efficient recent games queries

## Guest/Anonymous User Flow

When a user clicks "Play as Guest":

1. **Create Anonymous User:**
   ```javascript
   {
     username: 'guest_[UUID]',
     isAnonymous: true,
     anonymousSessionToken: '[UUID]',
     anonymousSessionExpires: new Date(now + 30 minutes)
   }
   ```

2. **Return Guest Token:**
   - Frontend stores token in `localStorage`
   - Token expires in 30 minutes (1,800,000ms)
   - Session automatically expires in MongoDB

3. **Guest Session Validation:**
   - Each request includes `x-guest-token` header
   - Backend validates token against stored session
   - Returns 401 if session expired

4. **Guest Access Restrictions:**
   - Can play games (scores not recorded)
   - Can browse leaderboards (as read-only)
   - Cannot create accounts or save progress
   - Cannot save profile data

## Differences from PostgreSQL

| Feature | MongoDB | PostgreSQL |
|---------|---------|-----------|
| Schema | Flexible, schema-less | Rigid schema |
| Joins | Population/aggregation | SQL joins |
| Transactions | ACID (recent versions) | Full ACID |
| Queries | Document-based | SQL |
| Indexing | Automatic + custom | Manual indexes |
| Scalability | Horizontal sharding | Vertical scaling |

## Connecting to MongoDB

### Local Development
```bash
# Using MongoDB locally
MONGODB_URI=mongodb://localhost:27017/retro_games
```

### Cloud (MongoDB Atlas)
```bash
# Using MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/retro_games
```

### Environment Setup
```bash
# .env file
MONGODB_URI=mongodb://localhost:27017/retro_games
```

## Database Initialization

Models are automatically initialized through Mongoose schemas when the server starts. No manual schema creation needed.

## Seeding Data

Run seeding script:
```bash
npm run seed
```

This populates the `games` collection with sample games.

## Advantages of MongoDB for This Project

1. **Guest Sessions**: Anonymous documents are natural in MongoDB
2. **Flexible Schema**: Easy to add custom game properties
3. **Real-time Updates**: Natural integration with Socket.IO
4. **Horizontal Scaling**: Built-in sharding for multi-server deployment
5. **Developer Experience**: Schema-less allows rapid iteration

