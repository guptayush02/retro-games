import express from 'express';
import { optionalUserMiddleware } from '../middleware/auth.js';
import { trackActivity } from '../controllers/activity.js';

const router = express.Router();

router.post('/track', optionalUserMiddleware, trackActivity);

export default router;
