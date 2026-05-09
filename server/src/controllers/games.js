import Game from '../models/Game.js';
import RecentlyPlayed from '../models/RecentlyPlayed.js';
import PlayerStats from '../models/PlayerStats.js';

const parsePagination = (query = {}, defaultLimit = 12, maxLimit = 100) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawLimit = Number.parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const normalizeGamePayload = (item = {}) => ({
  title: item.title,
  description: item.description,
  genre: item.genre,
  thumbnail: item.thumbnail,
  gameType: item.gameType,
  maxPlayers: item.maxPlayers,
  sourceType: item.sourceType,
  launchUrl: item.launchUrl,
  provider: item.provider,
  licenseStatus: item.licenseStatus,
  isActive: item.isActive,
});

export const getAllGames = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 12, 100);
    const search = (req.query.search || '').trim();
    const genre = (req.query.genre || '').trim();

    const filter = { isActive: true };
    if (genre && genre !== 'All') {
      filter.genre = genre;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const totalItems = await Game.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const games = await Game.find(filter).lean();

    // Personalized sort: most played by current user first (descending)
    if (req.user?.id) {
      const stats = await PlayerStats.find({ userId: req.user.id })
        .select('gameId totalPlays')
        .lean();

      const playCountByGame = new Map(
        stats.map((s) => [String(s.gameId), s.totalPlays || 0])
      );

      games.sort((a, b) => {
        const aCount = playCountByGame.get(String(a._id)) || 0;
        const bCount = playCountByGame.get(String(b._id)) || 0;
        if (aCount !== bCount) return bCount - aCount;
        return (a.title || '').localeCompare(b.title || '');
      });

      const sorted = games
        .map((g) => ({
          ...g,
          playCount: playCountByGame.get(String(g._id)) || 0,
        }))
        .sort((a, b) => {
          const aCount = a.playCount || 0;
          const bCount = b.playCount || 0;
          if (aCount !== bCount) return bCount - aCount;
          return (a.title || '').localeCompare(b.title || '');
        });

      const items = sorted.slice(skip, skip + limit);
      return res.json({
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
    }

    const sorted = games.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const items = sorted.slice(skip, skip + limit);

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

export const getGameById = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRecentlyPlayed = async (req, res) => {
  try {
    const recentGames = await RecentlyPlayed.find({ userId: req.user.id })
      .populate('gameId')
      .sort({ playedAt: -1 })
      .limit(10);

    const games = recentGames.map((rp) => rp.gameId);
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addGame = async (req, res) => {
  try {
    const game = await Game.create(normalizeGamePayload(req.body || {}));
    res.status(201).json(game);
  } catch (err) {
    console.error(err);
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Game with same title/provider already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const importGamesFromFeed = async (req, res) => {
  try {
    const { feedUrl, provider = 'feed-import' } = req.body || {};
    if (!feedUrl) {
      return res.status(400).json({ message: 'feedUrl is required' });
    }

    const response = await fetch(feedUrl);
    if (!response.ok) {
      return res.status(400).json({ message: `Could not fetch feed (${response.status})` });
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : payload?.games;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Feed must return an array or { games: [...] }' });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const raw of items) {
      const normalized = normalizeGamePayload({
        ...raw,
        provider: raw.provider || provider,
      });

      if (!normalized.title) {
        skipped += 1;
        continue;
      }

      const result = await Game.updateOne(
        { title: normalized.title, provider: normalized.provider || 'feed-import' },
        { $set: normalized, $setOnInsert: { isActive: true } },
        { upsert: true }
      );

      if (result.upsertedCount > 0) created += 1;
      else if (result.modifiedCount > 0) updated += 1;
      else skipped += 1;
    }

    res.json({ success: true, created, updated, skipped, total: items.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeGame = async (req, res) => {
  try {
    await Game.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Game removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const recordGamePlay = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User required' });
    }

    const game = await Game.findOne({ _id: req.params.id, isActive: true });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    await RecentlyPlayed.create({
      userId: req.user.id,
      gameId: req.params.id,
      playedAt: new Date(),
    });

    const stats = await PlayerStats.findOneAndUpdate(
      { userId: req.user.id, gameId: req.params.id },
      { $inc: { totalPlays: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, totalPlays: stats.totalPlays });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const recordGameResult = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User required' });
    }

    const game = await Game.findOne({ _id: req.params.id, isActive: true });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const {
      score = 0,
      outcome = 'draw',
    } = req.body || {};

    const update = {
      $inc: { totalPlays: 1 },
      $max: { highestScore: Math.max(0, Number(score) || 0) },
    };

    if (outcome === 'win') update.$inc.wins = 1;
    if (outcome === 'loss') update.$inc.losses = 1;
    if (outcome === 'draw') update.$inc.draws = 1;

    const stats = await PlayerStats.findOneAndUpdate(
      { userId: req.user.id, gameId: req.params.id },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, totalPlays: stats.totalPlays, highestScore: stats.highestScore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
