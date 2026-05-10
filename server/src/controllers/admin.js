import User from '../models/User.js';
import PlayerStats from '../models/PlayerStats.js';

const parsePagination = (value, fallback, max = 100) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return Math.min(n, max);
};

export const getAnalytics = async (req, res) => {
  try {
    const usersPage = parsePagination(req.query.usersPage, 1);
    const usersLimit = parsePagination(req.query.usersLimit, 10);
    const gamesPage = parsePagination(req.query.gamesPage, 1);
    const gamesLimit = parsePagination(req.query.gamesLimit, 10);
    const userGamePage = parsePagination(req.query.userGamePage, 1);
    const userGameLimit = parsePagination(req.query.userGameLimit, 10);
    const nonAdminFilter = { role: { $ne: 'admin' } };

    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [users, playerStats, userGameStats, totalUsers, activeUsers, anonymousUsers] = await Promise.all([
      User.find(nonAdminFilter)
        .select('username avatar role isAnonymous visitCount totalWebsiteTimeMs createdAt')
        .lean(),
      PlayerStats.aggregate([
        {
          $group: {
            _id: '$gameId',
            totalPlays: { $sum: '$totalPlays' },
            totalPlayTimeMs: { $sum: '$totalPlayTimeMs' },
            highestScore: { $max: '$highestScore' },
            uniquePlayers: { $sum: 1 },
          },
        },
        {
          $addFields: {
            gameObjectId: {
              $convert: {
                input: '$_id',
                to: 'objectId',
                onError: null,
                onNull: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: 'games',
            localField: 'gameObjectId',
            foreignField: '_id',
            as: 'game',
          },
        },
        {
          $unwind: {
            path: '$game',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: 1,
            totalPlays: 1,
            totalPlayTimeMs: 1,
            highestScore: 1,
            uniquePlayers: 1,
            title: '$game.title',
            genre: '$game.genre',
            provider: '$game.provider',
          },
        },
        { $sort: { totalPlays: -1, totalPlayTimeMs: -1 } },
      ]),
      PlayerStats.aggregate([
        {
          $match: {
            $or: [{ totalPlayTimeMs: { $gt: 0 } }, { totalPlays: { $gt: 0 } }],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            'user.role': { $ne: 'admin' },
          },
        },
        {
          $lookup: {
            from: 'games',
            localField: 'gameId',
            foreignField: '_id',
            as: 'game',
          },
        },
        {
          $unwind: {
            path: '$game',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: 1,
            userId: '$user._id',
            username: '$user.username',
            isAnonymous: { $ifNull: ['$user.isAnonymous', false] },
            gameId: '$game._id',
            gameTitle: '$game.title',
            gameGenre: '$game.genre',
            gameProvider: '$game.provider',
            totalPlays: { $ifNull: ['$totalPlays', 0] },
            totalPlayTimeMs: { $ifNull: ['$totalPlayTimeMs', 0] },
            lastPlayedAt: 1,
          },
        },
        { $sort: { totalPlayTimeMs: -1, totalPlays: -1, lastPlayedAt: -1 } },
      ]),
      User.countDocuments(nonAdminFilter),
      User.countDocuments({ ...nonAdminFilter, lastActivityAt: { $gte: activeSince } }),
      User.countDocuments({ ...nonAdminFilter, isAnonymous: true }),
    ]);

    const mostPlayedGames = playerStats.map((entry) => ({
      gameId: entry._id,
      title: entry.title,
      genre: entry.genre,
      provider: entry.provider,
      totalPlays: entry.totalPlays || 0,
      totalPlayTimeMs: entry.totalPlayTimeMs || 0,
      highestScore: entry.highestScore || 0,
      uniquePlayers: entry.uniquePlayers || 0,
    }));

    const topWebsiteUsersAll = [...users]
      .sort((a, b) => (b.totalWebsiteTimeMs || 0) - (a.totalWebsiteTimeMs || 0))
      .map((user) => ({
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        isAnonymous: !!user.isAnonymous,
        visitCount: user.visitCount || 0,
        totalWebsiteTimeMs: user.totalWebsiteTimeMs || 0,
        createdAt: user.createdAt,
      }));

    const topWebsiteUsersTotalItems = topWebsiteUsersAll.length;
    const topWebsiteUsersTotalPages = Math.max(1, Math.ceil(topWebsiteUsersTotalItems / usersLimit));
    const topWebsiteUsersSkip = (usersPage - 1) * usersLimit;
    const topWebsiteUsers = topWebsiteUsersAll.slice(topWebsiteUsersSkip, topWebsiteUsersSkip + usersLimit);

    const mostPlayedGamesTotalItems = mostPlayedGames.length;
    const mostPlayedGamesTotalPages = Math.max(1, Math.ceil(mostPlayedGamesTotalItems / gamesLimit));
    const mostPlayedGamesSkip = (gamesPage - 1) * gamesLimit;
    const mostPlayedGamesItems = mostPlayedGames.slice(mostPlayedGamesSkip, mostPlayedGamesSkip + gamesLimit);

    const userGameActivityTotalItems = userGameStats.length;
    const userGameActivityTotalPages = Math.max(1, Math.ceil(userGameActivityTotalItems / userGameLimit));
    const userGameActivitySkip = (userGamePage - 1) * userGameLimit;
    const userGameActivity = userGameStats
      .slice(userGameActivitySkip, userGameActivitySkip + userGameLimit)
      .map((entry) => ({
        id: entry._id,
        userId: entry.userId,
        username: entry.username,
        isAnonymous: !!entry.isAnonymous,
        gameId: entry.gameId,
        gameTitle: entry.gameTitle,
        gameGenre: entry.gameGenre,
        gameProvider: entry.gameProvider,
        totalPlays: entry.totalPlays || 0,
        totalPlayTimeMs: entry.totalPlayTimeMs || 0,
        lastPlayedAt: entry.lastPlayedAt || null,
      }));

    const totalWebsiteTimeMs = users.reduce((sum, user) => sum + (user.totalWebsiteTimeMs || 0), 0);
    const totalGamePlayTimeMs = playerStats.reduce((sum, entry) => sum + (entry.totalPlayTimeMs || 0), 0);
    const totalGamePlays = playerStats.reduce((sum, entry) => sum + (entry.totalPlays || 0), 0);

    res.json({
      summary: {
        totalUsers,
        anonymousUsers,
        activeUsers,
        totalWebsiteTimeMs,
        totalGamePlayTimeMs,
        totalGamePlays,
        topPlayedGame: mostPlayedGames[0] || null,
      },
      topWebsiteUsers,
      mostPlayedGames: mostPlayedGamesItems,
      userGameActivity,
      pagination: {
        topWebsiteUsers: {
          page: usersPage,
          limit: usersLimit,
          totalItems: topWebsiteUsersTotalItems,
          totalPages: topWebsiteUsersTotalPages,
          hasNextPage: usersPage < topWebsiteUsersTotalPages,
          hasPrevPage: usersPage > 1,
        },
        mostPlayedGames: {
          page: gamesPage,
          limit: gamesLimit,
          totalItems: mostPlayedGamesTotalItems,
          totalPages: mostPlayedGamesTotalPages,
          hasNextPage: gamesPage < mostPlayedGamesTotalPages,
          hasPrevPage: gamesPage > 1,
        },
        userGameActivity: {
          page: userGamePage,
          limit: userGameLimit,
          totalItems: userGameActivityTotalItems,
          totalPages: userGameActivityTotalPages,
          hasNextPage: userGamePage < userGameActivityTotalPages,
          hasPrevPage: userGamePage > 1,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
