import User from '../models/User.js';
import PlayerStats from '../models/PlayerStats.js';

const parsePagination = (query = {}, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawLimit = Number.parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const getGlobalLeaderboard = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  try {
    const users = await User.find({})
      .select('id username avatar xp coins isAnonymous')
      .lean();

    const stats = await PlayerStats.aggregate([
      {
        $group: {
          _id: '$userId',
          totalPlays: { $sum: '$totalPlays' },
          highestScore: { $sum: '$highestScore' },
          wins: { $sum: '$wins' },
          losses: { $sum: '$losses' },
          draws: { $sum: '$draws' },
        },
      },
    ]);

    const statsByUserId = new Map(
      stats.map((item) => [String(item._id), item])
    );

    const sorted = users
      .map((user) => {
        const userStats = statsByUserId.get(String(user._id)) || {};
        const score = (user.xp || 0) + (userStats.highestScore || 0);

        return {
          ...user,
          score,
          totalPlays: userStats.totalPlays || 0,
          highestScore: userStats.highestScore || 0,
          wins: userStats.wins || 0,
          losses: userStats.losses || 0,
          draws: userStats.draws || 0,
        };
      })
      .sort((a, b) => b.score - a.score);

    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const items = sorted.slice(skip, skip + limit).map((entry, index) => ({
      rank: skip + index + 1,
      ...entry,
    }));

    res.json({
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getGameLeaderboard = async (req, res) => {
  const { gameId } = req.params;
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  try {
    const totalItems = await PlayerStats.countDocuments({ gameId });
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const stats = await PlayerStats.find({ gameId })
      .populate('userId', 'id username avatar')
      .sort({ highestScore: -1 })
      .skip(skip)
      .limit(limit);

    const result = stats.map((stat, index) => ({
      rank: skip + index + 1,
      userId: stat.userId._id,
      username: stat.userId.username,
      avatar: stat.userId.avatar,
      wins: stat.wins,
      highestScore: stat.highestScore,
      totalPlays: stat.totalPlays,
    }));

    res.json({
      items: result,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
