import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/profile.js';

const router = express.Router();

router.get('/:userId', getProfile);
router.put('/', authMiddleware, updateProfile);

export default router;
