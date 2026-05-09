import express from 'express';
import { authMiddleware, adminMiddleware, optionalUserMiddleware } from '../middleware/auth.js';
import {
  getAllGames,
  getGameById,
  getRecentlyPlayed,
  addGame,
  importGamesFromFeed,
  removeGame,
  recordGamePlay,
  recordGameResult,
} from '../controllers/games.js';

const router = express.Router();

router.get('/', optionalUserMiddleware, getAllGames);
router.get('/recently-played', authMiddleware, getRecentlyPlayed);
router.post('/import-feed', authMiddleware, adminMiddleware, importGamesFromFeed);
router.get('/:id', getGameById);
router.post('/:id/play', optionalUserMiddleware, recordGamePlay);
router.post('/:id/result', optionalUserMiddleware, recordGameResult);
router.post('/', authMiddleware, adminMiddleware, addGame);
router.delete('/:id', authMiddleware, adminMiddleware, removeGame);

export default router;
