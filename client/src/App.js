// To add a new game (e.g. Mario):
// 1. Create Mario.js in src/games/ with a React component for the game.
// 2. Import Mario in this file: import Mario from './games/Mario';
// 3. Add it to GAME_COMPONENTS: { mario: Mario, ... }
// 4. Add { id: 'mario', name: 'Mario' } to the backend /api/games response.
// 5. The game will appear in the UI for selection.
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Snake from './games/Snake';
import Tetris from './games/Tetris';
import Pong from './games/Pong';
import Mario from './games/Mario';
import Game2048 from './games/iframes/Game2048';
import FlappyBird from './games/iframes/FlappyBird';
import SpaceShooter from './games/iframes/SpaceShooter';
import Chess from './games/iframes/Chess';

const GAME_COMPONENTS = {
  snake: Snake,
  tetris: Tetris,
  pong: Pong,
  mario: Mario,
  game2048: Game2048,
  // pacman: PacMan,
  // breakout: Breakout,
  // spaceinvaders: SpaceInvaders,
  flappybird: FlappyBird,
  spaceshooter: SpaceShooter,
  chess: Chess
};

function App() {
  const [games, setGames] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    axios.get(`${baseUrl}/api/games`).then(res => {
      // Add new games if not present in backend
      let list = res.data;
      const extraGames = [
        { id: 'mario', name: 'Super Mario' },
        { id: 'game2048', name: '2048' },
        // { id: 'pacman', name: 'Pac-Man' },
        // { id: 'breakout', name: 'Breakout' },
        // { id: 'spaceinvaders', name: 'Space Invaders' },
        { id: 'flappybird', name: 'Flappy Bird' },
        // { id: 'spaceshooter', name: 'Space Shooter' },
        // { id: 'chess', name: 'Chess' }
      ];
      extraGames.forEach(g => {
        if (!list.find(x => x.id === g.id)) list = [...list, g];
      });
      setGames(list);
    });
  }, []);

  const GameComponent = selected ? GAME_COMPONENTS[selected] : null;

  return (
    <div className="app-container">
      <h1>Retro Game Library</h1>
      <div className="game-list">
        {games.map(game => (
          <button key={game.id} onClick={() => setSelected(game.id)}>
            {game.name}
          </button>
        ))}
      </div>
      <div className="game-area">
        {!selected && <div style={{color:'#888',fontSize:'1.2rem',marginTop:'2rem'}}>Select a game to play</div>}
        {GameComponent && <GameComponent />}
      </div>
    </div>
  );
}

export default App;
