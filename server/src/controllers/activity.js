import User from '../models/User.js';
import PlayerStats from '../models/PlayerStats.js';
import Game from '../models/Game.js';

const MIN_TRACK_MS = 1000;

export const trackActivity = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User required' });
    }

    const durationMs = Math.max(0, Number(req.body?.durationMs) || 0);
    const gameId = req.body?.gameId || null;

    if (durationMs < MIN_TRACK_MS) {
      return res.json({ success: true, ignored: true });
    }

    const updateUser = {
      $inc: { totalWebsiteTimeMs: durationMs },
      $set: { lastActivityAt: new Date() },
    };

    await User.findByIdAndUpdate(req.user.id, updateUser);

    let gameStats = null;
    if (gameId) {
      const game = await Game.findById(gameId).select('_id');
      if (game) {
        gameStats = await PlayerStats.findOneAndUpdate(
          { userId: req.user.id, gameId },
          {
            $inc: { totalPlayTimeMs: durationMs },
            $set: { lastPlayedAt: new Date() },
            $setOnInsert: { totalPlays: 0 },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    res.json({
      success: true,
      durationMs,
      gameId,
      totalPlayTimeMs: gameStats?.totalPlayTimeMs ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
