# Adding New Games

This guide explains how to add new games to the Retro Games Portal.

## Game Module Structure

Each game should follow this structure:

```
games/my-game/
├── package.json
└── src/
    ├── MyGame.js       # Game logic class
    └── index.js        # Game initialization and Socket.IO handlers
```

## Step-by-Step Guide

### 1. Create Game Folder

```bash
mkdir games/my-game
cd games/my-game
```

### 2. Create package.json

```json
{
  "name": "game-my-game",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js"
}
```

### 3. Implement Game Logic

Create `src/MyGame.js`:

```javascript
class MyGame {
  constructor(io, roomName) {
    this.io = io;
    this.roomName = roomName;
    this.players = {};
    this.gameState = {
      // Your game state here
    };
  }

  addPlayer(socketId, userId, username) {
    this.players[socketId] = { userId, username };
  }

  makeMove(socketId, move) {
    // Process move and update game state
    // Emit updates to all players in room
  }

  getGameState() {
    return this.gameState;
  }
}

export default MyGame;
```

### 4. Create Handlers

Create `src/index.js`:

```javascript
import MyGame from './MyGame.js';

const games = new Map();

export const initMyGameRoom = (io, roomName) => {
  const game = new MyGame(io, roomName);
  games.set(roomName, game);

  io.to(roomName).emit('game_initialized', {
    game: 'my-game',
    state: game.getGameState(),
  });
};

export const handleMyGameMove = (io, roomName, socketId, moveData) => {
  const game = games.get(roomName);
  if (!game) return;

  game.makeMove(socketId, moveData);

  io.to(roomName).emit('state_updated', game.getGameState());
};

export const getGameState = (roomName) => {
  const game = games.get(roomName);
  return game ? game.getGameState() : null;
};
```

### 5. Register Game on Backend

Update `server/src/index.js` to import and handle your game:

```javascript
import { initMyGameRoom, handleMyGameMove } from '../games/my-game/src/index.js';

// In Socket.IO connection handler:
socket.on('init_game_my-game', (data) => {
  initMyGameRoom(io, data.roomName);
});

socket.on('my_game_move', (data) => {
  handleMyGameMove(io, data.roomName, socket.id, data.move);
});
```

### 6. Add Game to Database

Create a migration or add to your seeding script:

```javascript
await pool.query(
  `INSERT INTO games (title, description, genre, game_type, max_players)
   VALUES ($1, $2, $3, $4, $5)`,
  ['My Game', 'Description of my game', 'Puzzle', 'multiplayer', 2]
);
```

### 7. Create Frontend Component

Create `client/src/components/MyGameClient.jsx`:

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function MyGameClient({ roomName, onGameEnd }) {
  const [gameState, setGameState] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_WS_URL);

    newSocket.emit('join_room', { roomName });

    newSocket.on('game_initialized', (data) => {
      setGameState(data.state);
    });

    newSocket.on('state_updated', (state) => {
      setGameState(state);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [roomName]);

  const makeMove = (move) => {
    socket?.emit('my_game_move', { roomName, move });
  };

  if (!gameState) return <div>Loading game...</div>;

  return (
    <div className="my-game-container">
      {/* Render your game UI here */}
    </div>
  );
}

export default MyGameClient;
```

## Game Best Practices

1. **Authoritative Server**: For multiplayer games, always validate moves on the server
2. **State Sync**: Send complete state updates for consistency
3. **Error Handling**: Handle disconnections and invalid moves gracefully
4. **Performance**: Optimize frequent updates (throttle position updates, compress data)
5. **Testing**: Test with multiple players and network latency

## Example: Multiplayer Game

For real-time multiplayer games:

1. Keep authoritative state on server
2. Validate all moves on server
3. Emit state changes to all players
4. Handle player disconnections
5. Clean up resources when game ends

## Example: Single-Player Game

For single-player games:

1. Game logic can run on client
2. Report final score to server
3. Update player stats and leaderboard
4. Store in recently_played table

## Testing Your Game

1. Start both client and server
2. Create a game room
3. Join with multiple tabs/users
4. Test moves and state synchronization
5. Check leaderboard updates

## Troubleshooting

- **Game not initializing**: Check Socket.IO connection and room name
- **Moves not syncing**: Verify move data structure matches handler
- **Performance issues**: Throttle frequent updates, use delta changes
- **Memory leaks**: Clean up games map when room is destroyed

For more details on game architecture, see [SERVER.md](SERVER.md).
