import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { getAnalytics } from '../controllers/admin.js';

const router = express.Router();

router.get('/analytics', authMiddleware, adminMiddleware, getAnalytics);

export default router;
