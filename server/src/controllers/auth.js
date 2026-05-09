import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';

const GUEST_DURATION = () => parseInt(process.env.GUEST_SESSION_DURATION || 1800000);

export const signup = async (req, res) => {
  const { email, password, username, guestUserId } = req.body;

  try {
    // Check if email or username already taken by a DIFFERENT user
    const userExists = await User.findOne({
      $or: [{ email }, { username }],
      ...(guestUserId ? { _id: { $ne: guestUserId } } : {}),
    });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    if (guestUserId) {
      // Upgrade the existing guest record — keeps XP, coins, stats, visitCount
      user = await User.findByIdAndUpdate(
        guestUserId,
        {
          email,
          username,
          passwordHash,
          isAnonymous: false,
          anonymousSessionToken: null,
          anonymousSessionExpires: null,
        },
        { new: true }
      );
    }

    if (!user) {
      // No guest to upgrade — create fresh user
      user = await User.create({ email, username, passwordHash, isAnonymous: false });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        xp: user.xp,
        coins: user.coins,
        role: user.role,
        visitCount: user.visitCount,
        isAnonymous: false,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const user = await User.findOne({ email });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        xp: user.xp,
        coins: user.coins,
        role: user.role,
        isAnonymous: false,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Guest/anonymous login - 30 minute session
export const guestLogin = async (req, res) => {
  try {
    const guestUsername = `guest_${uuidv4().slice(0, 8)}`;
    const sessionToken = uuidv4();
    const duration = GUEST_DURATION();
    const sessionExpires = new Date(Date.now() + duration);

    const guestUser = await User.create({
      username: guestUsername,
      isAnonymous: true,
      anonymousSessionToken: sessionToken,
      anonymousSessionExpires: sessionExpires,
      visitCount: 1,
    });

    res.json({
      guestToken: sessionToken,
      expiresIn: duration,
      user: {
        id: guestUser._id,
        username: guestUser.username,
        xp: guestUser.xp,
        coins: guestUser.coins,
        visitCount: guestUser.visitCount,
        isAnonymous: true,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'id email username avatar xp coins role isAnonymous'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Track visit for a logged-in (non-anonymous) user
export const trackVisit = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { visitCount: 1 } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ visitCount: user.visitCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const validateGuestToken = async (req, res) => {
  const { guestToken } = req.body;

  try {
    const user = await User.findOne({
      anonymousSessionToken: guestToken,
      anonymousSessionExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(401).json({ valid: false, message: 'Session expired' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        username: user.username,
        xp: user.xp,
        coins: user.coins,
        isAnonymous: true,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh guest session - extend expiration and increment visit count
export const refreshGuestSession = async (req, res) => {
  const { guestUserId } = req.body;

  if (!guestUserId) {
    return res.status(400).json({ message: 'Guest user ID required' });
  }

  try {
    const user = await User.findById(guestUserId);

    if (!user || !user.isAnonymous) {
      return res.status(401).json({ message: 'Invalid guest user' });
    }

    // Always allow refresh regardless of expiry — this resets the 30-min timer
    // Generate new session token
    const duration = GUEST_DURATION();
    const newSessionToken = uuidv4();
    const newSessionExpires = new Date(Date.now() + duration);

    // Update user: new token, extended expiration, increment visit count
    const updatedUser = await User.findByIdAndUpdate(
      guestUserId,
      {
        anonymousSessionToken: newSessionToken,
        anonymousSessionExpires: newSessionExpires,
        $inc: { visitCount: 1 },
      },
      { new: true }
    );

    res.json({
      guestToken: newSessionToken,
      expiresIn: duration,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        xp: updatedUser.xp,
        coins: updatedUser.coins,
        isAnonymous: true,
        visitCount: updatedUser.visitCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
