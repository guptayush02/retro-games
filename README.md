# Retro Games Portal

A browser gaming platform with multiplayer support, user authentication, guest mode, leaderboards, and game management. Built with React, Node.js, Express, MongoDB, and Socket.IO.

## ✨ Features

- **👤 Guest Mode (NEW!)**: Play games for 30 minutes without signup or login
- **User Authentication**: Email/password signup and login with JWT tokens
- **Game Catalog**: Browse and play single-player and multiplayer games
- **Player Profiles**: Track XP, coins, achievements, and match history
- **Leaderboards**: Global and per-game leaderboards (excludes guest scores)
- **Multiplayer Support**: Real-time multiplayer games using Socket.IO
- **Admin Panel**: Add/remove games and moderate users
- **Game Sessions**: Create rooms, join rooms, spectate games

## Guest Mode Overview

Click **"Play as Guest (30 min)"** to:
- Play all available games instantly
- View leaderboards and game details
- No account creation required
- Session automatically expires after 30 minutes
- See countdown timer in navbar: 👤 Guest (25m Remaining)

**Guest limitations:**
- Scores not recorded on leaderboards
- No profile or progress saved
- Session expires after 30 minutes

## 📦 Project Structure

```
retro-games/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/           # API client with guest token handling
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Zustand (auth + guest stores)
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── models/        # Mongoose schemas
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth + guest session middleware
│   │   ├── routes/        # API routes
│   │   ├── db.js          # MongoDB connection
│   │   └── index.js       # Main server file
│   └── package.json
├── games/                  # Game modules
│   ├── tic-tac-toe/       # Tic-Tac-Toe game
│   └── snake/             # Snake game
└── docs/                   # Documentation
    ├── QUICK_START.md     # 5-minute setup guide
    ├── ARCHITECTURE.md    # System design & guest flow
    ├── DATABASE.md        # MongoDB schema documentation
    └── MIGRATION_GUIDE.md # PostgreSQL → MongoDB migration
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management (auth + guest stores)
- **Socket.IO Client** - Real-time communication
### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - NoSQL Database
- **Mongoose** - MongoDB ODM
- **Socket.IO** - WebSocket communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **UUID** - Guest token generation

## 🚀 Quick Start

### 5-Minute Setup

1. **Prerequisites**
   ```bash
   # Check versions
   node --version  # v18+
   npm --version
   mongod --version
   ```

2. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd retro-games
   ```

3. **Start MongoDB**
   ```bash
   # macOS with Homebrew
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongodb
   ```

4. **Backend Setup**
   ```bash
   cd server
   cp .env.example .env
   npm install
   npm run seed
   npm run dev
   ```

5. **Frontend Setup** (new terminal)
   ```bash
   cd client
   npm install
   npm run dev
   ```

6. **Open Browser**
   - Frontend: http://localhost:5173
   - Click **"Play as Guest (30 min)"** to start playing immediately

For detailed instructions, see [QUICK_START.md](./docs/QUICK_START.md)

## 🎮 Using the Application

### As a Guest (30-Minute Session)

1. Open frontend at http://localhost:5173
2. Click **"Play as Guest (30 min)"**
3. Browse available games
4. Select a game and start playing
5. Watch the countdown timer: 👤 Guest (25m Remaining)
6. Session automatically expires after 30 minutes

### As a Registered User

1. Click **"Sign Up"** or **"Login"**
2. Create account with email/password
3. Browse games and compete on leaderboards
4. Your scores and progress are saved
5. XP and coins accumulate with each game

## 📚 Documentation

- [QUICK_START.md](./docs/QUICK_START.md) - 5-minute setup guide
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design & guest session flow
- [DATABASE.md](./docs/DATABASE.md) - MongoDB schema documentation
- [MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) - PostgreSQL to MongoDB migration
- [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) - All API endpoints

## 🔐 Authentication & Authorization

### JWT Authentication (Registered Users)
- Email/password login generates JWT token
- Token stored in localStorage
- Included in Authorization header for API requests
- Expires after 7 days

### Guest Sessions (New!)
- Click "Play as Guest" to create 30-minute session
- UUID token stored in localStorage
- Included in x-guest-token header for API requests
- Automatically expires after 30 minutes
- Frontend checks expiration every 60 seconds

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md#-guest-session-architecture-new) for detailed guest flow.

## 🎮 Game Architecture

### WebSocket Events

**Connection Events:**
```javascript
socket.on('connection') → New player connected
socket.on('disconnect') → Player left

socket.emit('join_room', {roomName, userId, username})
socket.emit('leave_room', {roomName})
```

**Game Events:**
```javascript
socket.emit('game_action', {roomName, action, payload})
socket.on('board_updated', gameState)
socket.on('game_over', {score, winner})
```

### Single-Player Flow
1. User selects game
2. Frontend initializes game instance
3. User makes moves (validated server-side)
4. Score calculated and displayed
5. Results can be saved to leaderboard (registered users only)

### Multiplayer Flow
1. Player creates room or joins existing room
2. Server creates GameSession record
3. Players exchange moves in real-time via WebSocket
4. Server validates all moves
5. Final scores recorded after game ends

## 🛠️ Development

### Backend Structure
```
server/src/
├── models/        # Mongoose schemas (User, Game, PlayerStats, etc.)
├── controllers/   # Business logic and API handlers
├── middleware/    # Auth + guest session validation
├── routes/        # Route definitions
├── db.js          # MongoDB connection
└── index.js       # Express app setup
```

### Frontend Structure
```
client/src/
├── api/           # Axios client + endpoints + guest token handling
├── components/    # Reusable React components
├── pages/         # Page components (Login, Home, Games, etc.)
├── store/         # Zustand stores (authStore + guestStore)
├── App.jsx        # Main app with routing
└── main.jsx       # Entry point
```

### Adding New Games

1. Create folder under `games/`
2. Implement game logic with initialization and update functions
3. Emit Socket.IO events following the pattern
4. Register Socket.IO handlers in server
5. Create frontend component for game

See `games/tic-tac-toe/` or `games/snake/` for examples.

## 📊 Database Schema (MongoDB)

**Collections:**
- `users` - Registered + anonymous guest users
- `games` - Game catalog
- `playerStats` - Per-player, per-game statistics
- `gameSessions` - Active game rooms
- `sessionPlayers` - Player participation records
- `leaderboard` - Cached rankings
- `recentlyPlayed` - User game history

**Key Fields in Users Collection:**
- `email` - User email (unique, nullable for guests)
- `username` - Display name
- `isAnonymous` - Guest flag
- `anonymousSessionToken` - UUID for guest sessions
- `anonymousSessionExpires` - Guest session expiration date
- `xp` - Experience points
- `coins` - In-game currency
- `role` - 'player' or 'admin'

See [DATABASE.md](./docs/DATABASE.md) for complete schema.

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Check MongoDB is running
brew services list | grep mongodb

# Start MongoDB
brew services start mongodb-community
```

### Port Already in Use
```bash
# Kill port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill port 5173 (frontend)  
lsof -ti:5173 | xargs kill -9
```

### Module Not Found
```bash
# Reinstall dependencies
cd server && rm -rf node_modules && npm install
cd ../client && rm -rf node_modules && npm install
```

### Guest Token Not Working
- Clear browser localStorage: DevTools > Application > Storage > Clear All
- Try guest login again
- Check browser console for errors

## 🚀 Deployment

### Backend
- Deploy to Heroku, Railway, or Vercel
- Set MONGODB_URI to MongoDB Atlas connection string
- Set JWT_SECRET and other env variables
- Enable CORS for production domain

### Frontend
- Deploy to Vercel, Netlify, or any static hosting
- Set VITE_API_URL to production backend URL
- Build with `npm run build`

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/guest-login` - Create 30-minute guest session ⭐
- `POST /api/auth/validate-guest-token` - Verify guest token ⭐
- `GET /api/auth/me` - Get current user

### Games
- `GET /api/games` - List all games
- `GET /api/games/:id` - Get game details
- `GET /api/games/recently-played` - User's recently played games
- `POST /api/games` - Create game (admin)
- `DELETE /api/games/:id` - Remove game (admin)

See [docs/ADDING_GAMES.md](docs/ADDING_GAMES.md) for detailed instructions.

## Roadmap

- [ ] OAuth login (Google, GitHub)
- [ ] Achievements and badges
- [ ] Chat and friend system
- [ ] Game tournaments
- [ ] Payment integration for premium features
- [ ] Mobile app
- [ ] More game templates (Chess, Quiz Battle, Ludo)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
