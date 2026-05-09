import express from 'express';
import { signup, login, getCurrentUser, guestLogin, validateGuestToken, refreshGuestSession, trackVisit } from '../controllers/auth.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/guest-login', guestLogin);
router.post('/guest-refresh', refreshGuestSession);
router.post('/validate-guest-token', validateGuestToken);
router.get('/me', authMiddleware, getCurrentUser);
router.post('/track-visit', authMiddleware, trackVisit);

export default router;
