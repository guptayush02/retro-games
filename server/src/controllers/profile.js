import User from '../models/User.js';
import PlayerStats from '../models/PlayerStats.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      'id email username avatar xp coins isAnonymous visitCount totalWebsiteTimeMs lastActivityAt createdAt'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const stats = await PlayerStats.find({ userId: req.params.userId }).populate('gameId');

    res.json({
      user,
      stats: stats
        .filter((s) => s.gameId) // guard against deleted games
        .map((s) => ({
          gameName: s.gameId.title,
          wins: s.wins,
          losses: s.losses,
          highestScore: s.highestScore,
          totalPlays: s.totalPlays,
          totalPlayTimeMs: s.totalPlayTimeMs || 0,
          lastPlayedAt: s.lastPlayedAt || s.updatedAt || null,
        })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  const { username, avatar } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(username && { username }),
        ...(avatar && { avatar }),
      },
      { new: true }
    );

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
