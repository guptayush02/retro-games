import express from 'express';
import { getGlobalLeaderboard, getGameLeaderboard } from '../controllers/leaderboard.js';

const router = express.Router();

router.get('/global', getGlobalLeaderboard);
router.get('/game/:gameId', getGameLeaderboard);

export default router;
