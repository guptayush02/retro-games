
import express from 'express';
import cors from 'cors';
import path from 'path';


const app = express();
const PORT = process.env.PORT || 4000;
const __dirname = path.resolve();


app.use(cors());
app.use(express.json());

// Serve static files from public

// Serve 2048 static files before React catch-all
app.use('/2048', express.static(path.join(__dirname, 'public/2048')));
// Serve other static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory high scores (for demo)
const highScores = {
  snake: [],
  tetris: [],
  pong: []
};

app.get('/api/games', (req, res) => {
  res.json([
    { id: 'snake', name: 'Snake' },
    { id: 'tetris', name: 'Tetris' },
    // { id: 'pong', name: 'Pong' }
  ]);
});

app.get('/api/scores/:game', (req, res) => {
  const { game } = req.params;
  res.json(highScores[game] || []);
});

app.post('/api/scores/:game', (req, res) => {
  const { game } = req.params;
  const { name, score } = req.body;
  if (!highScores[game]) highScores[game] = [];
  highScores[game].push({ name, score });
  highScores[game].sort((a, b) => b.score - a.score);
  highScores[game] = highScores[game].slice(0, 10);
  res.json(highScores[game]);
});


// Serve index.html for any non-API route

// React app catch-all (should be last)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
