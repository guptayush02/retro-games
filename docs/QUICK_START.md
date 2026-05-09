# Quick Start Guide

Get your Retro Games Portal with guest mode up and running in minutes!

## 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** (local or cloud) ([Download](https://www.mongodb.com/try/download/community))
- **npm** or **yarn** (comes with Node.js)

Verify installations:
```bash
node --version
npm --version
mongod --version
```

## 🚀 5-Minute Setup

### Step 1: Navigate to Project
```bash
cd /Users/ayushgupta/Documents/projects/retro-games
```

### Step 2: Start MongoDB

**Option A: Local MongoDB** (Recommended for development)
```bash
# macOS with Homebrew
brew services start mongodb-community

# Linux with systemctl
sudo systemctl start mongodb

# Docker (if installed)
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: MongoDB Atlas** (Cloud - no local setup needed)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account and cluster
3. Get connection string
4. Use in `.env` as shown below

### Step 3: Set Environment Variables
```bash
cp .env.example .env
```

Edit `server/.env` with your values:
```
# MongoDB connection (local)
MONGODB_URI=mongodb://localhost:27017/retro_games

# OR MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/retro_games

JWT_SECRET=your_random_secret_key_here
JWT_EXPIRY=7d
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
GUEST_SESSION_DURATION=1800000
```

Create `client/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

### Step 4: Install Dependencies
```bash
# Install backend dependencies
cd server && npm install && cd ..

# Install frontend dependencies
cd client && npm install && cd ..
```

### Step 5: Seed Initial Data
```bash
cd server
npm run seed
cd ..
```

### Step 6: Start Development Servers
```bash
# Terminal 1 - Backend (from project root)
cd server && npm run dev

# Terminal 2 - Frontend (from project root)
cd client && npm run dev
```

This will start:
- 🌐 **Frontend**: http://localhost:5173
- 🖥️ **Backend**: http://localhost:5000

## 🎮 First Run Walkthrough

1. **Open Frontend**
   Navigate to http://localhost:5173

2. **Try Guest Mode** (NEW!)
   - Click "Play as Guest (30 min)"
   - Instantly access games without signup
   - Guest session expires after 30 minutes
   - See "👤 Guest (XmRemaining)" in navbar

3. **Create Account**
   - Click "Sign Up"
   - Enter email, username, password
   - Click "Sign Up"

4. **Login**
   - Enter your credentials
   - Click "Login"

5. **Browse Games**
   - Click "Games" in navbar
   - View all available games

6. **Play a Game**
   - Click on any game card
   - Enter game room
   - Single-player: Play immediately
   - Multiplayer: Invite others to room

## 👤 Guest Mode Features

### How It Works
- Click **"Play as Guest (30 min)"** button
- No account or password needed
- 30-minute session starts immediately
- All game access included

### Guest Session
- Expires after 30 minutes
- Token stored in browser (localStorage)
- See countdown in navbar: "👤 Guest (25m Remaining)"
- Logout clears guest session

### Guest Limitations
- ✅ Can play all games
- ✅ Can view leaderboards  
- ❌ Scores not recorded
- ❌ No profile saves
- ❌ No persistent history

## 📁 Project Structure Overview

```
retro-games/
├── client/                    ← React frontend (port 5173)
│   ├── src/
│   │   ├── api/              ← Axios client + guest endpoints
│   │   ├── store/            ← Zustand stores (auth + guest)
│   │   ├── pages/            ← React pages
│   │   └── components/       ← Reusable components
│   └── package.json
├── server/                    ← Node.js backend (port 5000)
│   ├── src/
│   │   ├── models/           ← Mongoose schemas (MongoDB)
│   │   ├── controllers/      ← API logic
│   │   ├── middleware/       ← Auth + guest session middleware
│   │   ├── routes/           ← API route definitions
│   │   └── index.js          ← Express app setup
│   └── package.json
├── games/                     ← Game modules
│   ├── tic-tac-toe/
│   └── snake/
└── docs/                      ← Documentation
```

## 🔧 Common Commands

### Development
```bash
# Backend only (from server directory)
npm run dev

# Frontend only (from client directory)
npm run dev

# Seed database with sample games (from server directory)
npm run seed
```

### Database
```bash
# Connect to MongoDB
mongosh  # If installed locally

# View MongoDB Atlas connection string
# From MongoDB Atlas Dashboard > Connect > Connection String

# Seed database with sample games
cd server && npm run seed
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check MongoDB is running
# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongodb

# Start MongoDB if not running
brew services start mongodb-community

# Verify connection
mongosh mongodb://localhost:27017/retro_games
```

### Port Already in Use
```bash
# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9

# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9
```

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
cd server && rm -rf node_modules package-lock.json && npm install && cd ..
cd client && rm -rf node_modules package-lock.json && npm install && cd ..
```

### CORS or Connection Errors
1. Check `CLIENT_URL` in `server/.env` matches frontend URL
2. Verify `VITE_API_URL` in `client/.env` matches backend URL
3. Ensure backend server is running on port 5000

### Guest Token Not Working
1. Clear browser localStorage: DevTools > Application > Storage > Clear All
2. Logout and try "Play as Guest" again
3. Check browser console for errors

## 📚 Next Steps

1. **Explore the Codebase**
   - Frontend: `client/src/` for React components
   - Backend: `server/src/` for API endpoints
   - Games: `games/` for game implementations
   - Database: See [DATABASE.md](./DATABASE.md) for schema details

2. **Understand Authentication**
   - JWT tokens for registered users
   - UUID tokens for 30-minute guest sessions
   - See [docs/ARCHITECTURE.md](./ARCHITECTURE.md) for auth flow

3. **Add Your First Game**
   - Check [docs/GAME_DEVELOPMENT.md](./GAME_DEVELOPMENT.md)
   - Look at `games/tic-tac-toe` or `games/snake` examples
   - Create Socket.IO listeners for multiplayer

4. **Customize Frontend**
   - Edit components in `client/src/components/`
   - Modify Tailwind styles in `client/src/index.css`
   - Update pages in `client/src/pages/`

5. **Deploy to Production**
   - See [docs/DEPLOYMENT.md](./DEPLOYMENT.md)
   - Use MongoDB Atlas for cloud database
   - Deploy backend to Heroku, Railway, or Vercel
   - Deploy frontend to Vercel or Netlify

## 💡 Tips & Best Practices

- **Hot Reload**: Changes auto-reload in both frontend and backend
- **API Debugging**: Use browser DevTools Network tab
- **Guest Sessions**: Test with multiple browsers to see different guests
- **WebSocket**: Socket.IO debug logs in browser console
- **Database**: Use MongoDB Compass for visual database management
- **State Management**: Guest store uses Zustand for simple state

## 🆘 Getting Help

- Read [README.md](../README.md) for project overview
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for endpoints
- See [DATABASE.md](./DATABASE.md) for data schema
- Look at game examples in `games/` folder
- Check error logs in terminal

## 🎯 Key Features

### ✅ Complete Features
- User authentication with JWT
- 30-minute guest mode (no signup required!)
- Game browsing and catalog
- Multiplayer rooms with Socket.IO
- Real-time leaderboards
- Player statistics tracking
- User profiles and avatars
- Admin controls

### 🚀 Coming Soon
- More games (Chess, Connect4, etc.)
- Achievement system
- Social features (friends, messaging)
- Mobile app
- Tournament support

## ✅ Quick Checklist

Before diving into development:
- ✅ Node.js and MongoDB installed
- ✅ `.env` files configured (server + client)
- ✅ Dependencies installed (`npm install`)
- ✅ Sample data seeded (`npm run seed`)
- ✅ Backend running on port 5000
- ✅ Frontend accessible at http://localhost:5173
- ✅ Can see "Play as Guest" button on login page
- ✅ Guest session shows "👤 Guest (30m Remaining)" in navbar

## 🎉 Ready to Go!

Your gaming portal is now running with guest mode enabled. Start playing!

### Quick Test
1. Frontend: http://localhost:5173
2. Click "Play as Guest (30 min)"
3. Browse and play any game
4. Watch timer count down in navbar
5. Session expires after 30 minutes

Happy coding! 🚀
