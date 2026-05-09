# Project Architecture & Implementation Guide

## 🎯 Project Overview

Retro Games Portal is a full-stack gaming platform enabling users to play classic games, compete on leaderboards, and engage in multiplayer sessions. The platform separates concerns between the main portal (auth, profiles, leaderboards) and individual game modules.

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vite)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Login/Signup → Home → Games → Play → Leaderboard      │ │
│  │ Profile Management, Game Sessions, Real-time Updates  │ │
│  │ Guest Mode: Click "Play as Guest (30 min)" 👤         │ │
│  └────────────────────────────────────────────────────────┘ │
│                    Zustand State Store:                      │
│                   • authStore (JWT)                          │
│                   • guestStore (UUID token, localStorage)    │
└───────────────────────┬──────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        │ HTTP REST API                 │ WebSocket (Socket.IO)
        │ Headers:                      │ (Port 5000)
        │ • Authorization: JWT          │
        │ • x-guest-token: UUID         │
        │ (Port 5000)                   │
        │                               │
┌───────▼────────────────────────────────▼──────────────────┐
│               BACKEND (Node.js/Express)                   │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Middleware:                                          │ │
│ │  • authMiddleware (JWT)                              │ │
│ │  • guestSessionMiddleware (UUID, expiration check)   │ │
│ │  • optionalAuthMiddleware                            │ │
│ │ Routes: Auth, Games, Profile, Leaderboard           │ │
│ │ Controllers: Business Logic                          │ │
│ │ Socket.IO: Game Sessions, Real-time Updates         │ │
│ └──────────────────────────────────────────────────────┘ │
└───────┬────────────────────────────────────────────────────┘
        │
        │ Mongoose ODM
        │ (Port 27017)
        │
┌───────▼────────────────────────────────────────────────────┐
│              DATABASE (MongoDB)                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Collections:                                         │ │
│ │  • users (registered + anonymous guest accounts)    │ │
│ │  • games                                             │ │
│ │  • playerStats                                       │ │
│ │  • gameSessions                                      │ │
│ │  • sessionPlayers                                    │ │
│ │  • leaderboard                                       │ │
│ │  • recentlyPlayed                                    │ │
│ └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Separation of Concerns

1. **Portal Core** (`server/src/`)
   - User authentication and authorization
   - Game catalog management
   - Leaderboard calculations
   - Admin functionality

2. **Game Modules** (`games/*/`)
   - Game-specific logic
   - Player interaction handling
   - Score calculation
   - Game state management

3. **Frontend** (`client/src/`)
   - UI/UX rendering
   - State management (Zustand)
   - API communication
   - WebSocket connection

## 📊 Database Design

### Entity Relationships

```
Users ─────→ PlayerStats ←───── Games
  │                                │
  │                                │
  ├─→ GameSessions ←──────────────┤
  │       │
  │       └─→ SessionPlayers
  │
  ├─→ RecentlyPlayed ──────────────→ Games
  │
  └─→ Leaderboard ←────────────────┘
```

### Key Tables

- **users**: Core user data, XP, coins, roles
- **games**: Game definitions and metadata
- **player_stats**: Win/loss records per user per game
- **game_sessions**: Active game rooms
- **session_players**: Player participation in sessions
- **leaderboard**: Ranking data
- **recently_played**: User game history

## 🔐 Authentication Flow

```
1. User Signup
   └─→ Hash password with bcrypt
   └─→ Store in users table
   └─→ Generate JWT token
   └─→ Return token + user data

2. User Login
   └─→ Verify email exists
   └─→ Compare password hash
   └─→ Generate JWT token
   └─→ Return token + user data

3. Guest Session (NEW!)
   └─→ Generate UUID token
   └─→ Create anonymous user document
   └─→ Set expiration (30 minutes)
   └─→ Return token + expiration time
   └─→ Frontend stores in localStorage

4. Subsequent Requests
   └─→ Extract Authorization header OR x-guest-token header
   └─→ If JWT: Verify signature with JWT_SECRET
   └─→ If guest token: Check expiration and validity
   └─→ Attach user data to request
   └─→ Check permissions based on role/auth status
```

## 👤 Guest Session Architecture (NEW!)

### Overview
Users can play games for 30 minutes without creating an account. Guest sessions are:
- Temporary (30-minute duration)
- Token-based (UUID v4)
- Stored in MongoDB User collection
- Validated on every request

### Guest Session Lifecycle

```
1. User clicks "Play as Guest"
   └─→ Frontend calls /api/auth/guest-login
   └─→ Backend generates UUID token
   └─→ Creates anonymous User document:
       {
         username: 'guest_[UUID]',
         isAnonymous: true,
         anonymousSessionToken: '[UUID]',
         anonymousSessionExpires: Date(now + 30min)
       }
   └─→ Returns { guestToken, expiresIn: 1800000 }

2. Frontend stores guest token
   └─→ localStorage.setItem('guestToken', token)
   └─→ localStorage.setItem('guestExpires', timestamp)
   └─→ Sets Zustand store: { isGuest: true, guestToken, guestExpires }
   └─→ Shows "👤 Guest (30m Remaining)" in navbar

3. Guest plays games
   └─→ Every API request includes x-guest-token header
   └─→ Axios interceptor adds header automatically
   └─→ Backend validates guest session:
       - Find User with matching token
       - Check anonymousSessionExpires > now()
       - Return 401 if expired
   └─→ Guest can play but scores not recorded

4. Session expires
   └─→ Frontend checks expiration every 60 seconds
   └─→ Timer in navbar reaches 0:00
   └─→ Auto-logout clears localStorage
   └─→ Redirects to login page
   └─→ User can create account or guest again

5. Guest logs out manually
   └─→ Clears localStorage (guestToken, guestExpires)
   └─→ Clears Zustand guest store
   └─→ Redirects to login
```

### Guest Session Data Flow

```
BROWSER (localStorage)
    ↓
    ├─ guestToken: "550e8400-e29b-41d4-a716-446655440000"
    ├─ guestExpires: 1691234567890
    │
    ↓ (Axios interceptor adds header)
    
API REQUEST
    ├─ Headers: { "x-guest-token": "[UUID]" }
    │
    ↓
    
BACKEND (guestSessionMiddleware)
    ├─ Extracts x-guest-token from headers
    ├─ Queries User collection:
    │  WHERE anonymousSessionToken = token
    │  AND anonymousSessionExpires > now()
    ├─ If valid: Sets req.user, req.isGuest = true
    ├─ If invalid: Returns 401 Unauthorized
    │
    ↓
    
CONTROLLER
    ├─ Receives req.isGuest = true
    ├─ Allows game play (no score recording)
    ├─ Prevents profile saves
    └─ Returns data for display
```

### Guest Restrictions

| Feature | Registered | Guest |
|---------|-----------|-------|
| Play Games | ✅ Yes | ✅ Yes |
| View Leaderboards | ✅ Yes | ✅ Yes (read-only) |
| Save Scores | ✅ Yes | ❌ No |
| Create Profile | ✅ Yes | ❌ No |
| Save Avatar | ✅ Yes | ❌ No |
| Play History | ✅ Yes | ❌ No |
| Session Duration | Forever | 30 minutes |

### Guest Middleware Implementation

```javascript
// server/src/middleware/auth.js
async function guestSessionMiddleware(req, res, next) {
  const guestToken = req.headers['x-guest-token'];
  
  if (!guestToken) {
    // Create new guest session
    const sessionToken = uuidv4();
    const sessionExpires = new Date(Date.now() + 1800000); // 30 min
    
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
  
  if (!user) {
    return res.status(401).json({ error: 'Guest session expired' });
  }
  
  req.user = user;
  req.isGuest = true;
  next();
}
```

### Frontend Guest Store

```javascript
// client/src/store/guestStore.js
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

## 🎮 Game Architecture

### Single-Player Game Flow

```
1. User starts game
   └─→ Initialize game instance
   └─→ Send initial state to frontend

2. User makes move
   └─→ Send move to backend
   └─→ Validate move on server
   └─→ Update game state
   └─→ Calculate score

3. Game ends
   └─→ Calculate final score
   └─→ Update player_stats
   └─→ Update leaderboard
   └─→ Add to recently_played
```

### Multiplayer Game Flow

```
1. Player A creates room
   └─→ Emit 'join_room' event
   └─→ Create GameSession record
   └─→ Initialize game instance

2. Player B joins room
   └─→ Emit 'join_room' event
   └─→ Update SessionPlayers table
   └─→ Broadcast room_updated event
   └─→ Send game state to all players

3. Players take turns
   └─→ Each move emitted to server
   └─→ Server validates move
   └─→ Updates game state on server
   └─→ Broadcasts state to all players

4. Game ends
   └─→ Calculate final scores
   └─→ Update player_stats
   └─→ Update leaderboard
   └─→ Clean up game instance
```

## 🔌 WebSocket Events

### Connection Events
```javascript
socket.on('connection') → New player connected
socket.on('disconnect') → Player left

socket.emit('join_room', {roomName, userId, username})
socket.emit('leave_room', {roomName})

socket.on('room_updated', {users, message})
socket.on('room_left', {message})
```

### Game Events
```javascript
socket.emit('game_action', {roomName, action, payload})
socket.on('game_action', {action, payload})

socket.on('board_updated', gameState)
socket.on('game_over', {score, winner})
```

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/guest-login` - Create 30-minute guest session (NEW!)
- `POST /api/auth/validate-guest-token` - Verify guest token validity (NEW!)
- `GET /api/auth/me` - Current user (protected)
- `POST /api/auth/logout` - Logout

**Guest Login Request:**
```javascript
POST /api/auth/guest-login
Response: {
  guestToken: "550e8400-e29b-41d4-a716-446655440000",
  expiresIn: 1800000,
  user: {
    _id: "...",
    username: "guest_e29b41d4",
    isAnonymous: true
  }
}
```

**Guest Token Validation:**
```javascript
POST /api/auth/validate-guest-token
Body: { token: "..." }
Response: {
  valid: true,
  user: { ... },
  expiresAt: 1691234567890
}
```

### Games
- `GET /api/games` - All games (guest accessible)
- `GET /api/games/:id` - Game details (guest accessible)
- `GET /api/games/recently-played` - User's recently played (authenticated only)
- `POST /api/games` - Add game (admin only)
- `DELETE /api/games/:id` - Remove game (admin only)

### Profile
- `GET /api/profile/:userId` - User profile (authenticated only)
- `PUT /api/profile` - Update profile (authenticated only)

### Leaderboard
- `GET /api/leaderboard/global` - Global rankings (guest readable)
- `GET /api/leaderboard/game/:gameId` - Game-specific rankings (guest readable)

**Note:** Leaderboard queries exclude anonymous users

## 🎨 Frontend State Management

### Zustand Stores

```javascript
// Auth Store
useAuthStore = {
  user: User | null,
  token: string | null,
  isAuthenticated: boolean,
  setUser(user),
  setToken(token),
  logout()
}

// Guest Store (NEW!)
useGuestStore = {
  guestToken: string | null,
  isGuest: boolean,
  guestExpires: number | null,  // timestamp
  setGuestToken(token, expiresIn),
  clearGuest(),
  isGuestSessionValid() → boolean
}

// Game Store
useGameStore = {
  currentGame: Game,
  gameSession: GameSession,
  players: Player[],
  joinGame(gameId),
  playMove(move)
}

useLeaderboardStore = {
  leaderboard: Player[],
  selectedGame: Game | null,
  fetchLeaderboard(gameId?),
  filter()
}
```

### Guest Session in Frontend

```javascript
// components/LoginPage.jsx
const handleGuestLogin = async () => {
  const response = await api.guestLogin();
  useGuestStore.setGuestToken(response.guestToken, response.expiresIn);
  navigate('/home');
}

// components/Navbar.jsx
{isGuest && (
  <span>👤 Guest ({formatTimeRemaining(guestExpires)})</span>
)}

// App.jsx (Protected route)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const { isGuest, isGuestSessionValid } = useGuestStore();
  
  const isAuthorized = isAuthenticated || (isGuest && isGuestSessionValid());
  
  return isAuthorized ? children : <Navigate to="/login" />;
}
```

## 🔄 Data Flow Example: Playing Tic-Tac-Toe

```
1. User clicks "Play" on Tic-Tac-Toe
   Frontend → GET /api/games/tic-tac-toe
   
2. Displays game selection (create/join room)
   User chooses "Create Room" with name "game-123"
   
3. Socket connection established
   Frontend → emit 'join_room' 
   Backend → Create GameSession, Initialize TicTacToe instance
   Backend → emit 'room_updated' with gameState
   
4. Player B joins room
   Frontend → emit 'join_room'
   Backend → Add to SessionPlayers
   Backend → emit 'room_updated' with both players
   
5. Player A makes move (click cell 0)
   Frontend → emit 'game_action' {action: 'move', position: 0}
   Backend → Validate move in TicTacToe instance
   Backend → Update game state
   Backend → emit 'board_updated' to both players
   
6. Game ends (Player A wins)
   Backend → Calculate scores
   Backend → emit 'game_over' with winner
   Backend → Update player_stats in database
   Backend → Update leaderboard
```

## 📈 Scaling Considerations

### Current (Single Server)
- Single Node.js process
- Single PostgreSQL connection
- Single Socket.IO instance

### Production (Multiple Servers)
- Load balancer (Nginx, HAProxy)
- Multiple Node.js instances
- Redis adapter for Socket.IO
- Database connection pooling (pgBouncer)
- Read replicas for database scaling
- CDN for static assets

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] HTTPS/SSL certificates installed
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Error tracking (Sentry) configured
- [ ] Monitoring set up
- [ ] Database indexes optimized
- [ ] Connection pooling configured
- [ ] Static asset caching configured

## 🔗 Key Technologies & Why

| Tech | Purpose | Why Chosen |
|------|---------|-----------|
| React 18 | UI Framework | Component-based, large ecosystem |
| Vite | Build Tool | Fast development, optimized builds |
| Node.js + Express | Backend | JavaScript, rich ecosystem |
| PostgreSQL | Database | Robust, ACID compliance, JSON support |
| Socket.IO | WebSockets | Real-time communication, fallbacks |
| JWT | Authentication | Stateless, scalable |
| Zustand | State Management | Lightweight, simple API |
| Tailwind CSS | Styling | Utility-first, rapid development |

## 📝 Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Changes**
   - Update backend (`server/src/`)
   - Update frontend (`client/src/`)
   - Update database schema if needed

3. **Test Changes**
   - API: Test with cURL or Postman
   - Frontend: Manual testing in browser
   - WebSocket: Test with multiple connections

4. **Commit & Push**
   ```bash
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

5. **Create Pull Request**
   - Describe changes
   - Link any related issues

## 🎓 Learning Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Documentation](https://react.dev/)
- [JWT Tutorial](https://jwt.io/introduction)

---

**Last Updated**: May 2026
**Status**: Initial Setup Complete
