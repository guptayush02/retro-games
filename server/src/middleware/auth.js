import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware for optional authentication (allows both logged-in and guest users)
export const optionalAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.isGuest = false;
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }
  // If no token, user can still proceed as guest

  next();
};

// Resolve current user from either JWT auth token or guest token (if present).
// Does not auto-create users; it only enriches req.user when credentials are valid.
export const optionalUserMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const guestToken = req.headers['x-guest-token'];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.isGuest = false;
      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }

  if (guestToken) {
    try {
      const user = await User.findOne({
        anonymousSessionToken: guestToken,
      });

      if (user) {
        req.user = {
          id: user._id,
          username: user.username,
          isAnonymous: !!user.isAnonymous,
        };
        req.isGuest = !!user.isAnonymous;
      }
    } catch (err) {
      console.error('Error validating guest token:', err);
    }
  }

  next();
};

// Create or validate guest session
export const guestSessionMiddleware = async (req, res, next) => {
  const guestToken = req.headers['x-guest-token'];

  if (guestToken) {
    try {
      const user = await User.findOne({
        anonymousSessionToken: guestToken,
        anonymousSessionExpires: { $gt: new Date() },
      });

      if (user) {
        req.user = {
          id: user._id,
          username: user.username,
          isAnonymous: true,
        };
        req.isGuest = true;
        return next();
      }
    } catch (err) {
      console.error('Error validating guest token:', err);
    }
  }

  // Create new guest session if none provided
  if (!req.user) {
    try {
      const guestUsername = `guest_${uuidv4().slice(0, 8)}`;
      const sessionToken = uuidv4();
      const sessionExpires = new Date(Date.now() + (process.env.GUEST_SESSION_DURATION || 1800000));

      const guestUser = await User.create({
        username: guestUsername,
        isAnonymous: true,
        anonymousSessionToken: sessionToken,
        anonymousSessionExpires: sessionExpires,
      });

      req.user = {
        id: guestUser._id,
        username: guestUsername,
        isAnonymous: true,
      };
      req.guestToken = sessionToken;
      req.isGuest = true;
    } catch (err) {
      console.error('Error creating guest session:', err);
      return res.status(500).json({ message: 'Error creating guest session' });
    }
  }

  next();
};

export const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
