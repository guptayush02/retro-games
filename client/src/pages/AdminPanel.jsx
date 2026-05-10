import { useEffect, useMemo, useState } from 'react';
import { gamesAPI } from '../api/endpoints';
import { adminAPI } from '../api/endpoints';
import { resolveGameImage, DEFAULT_GAME_IMAGE } from '../utils/gameImages';

const SOURCE_TYPES = ['native', 'embed', 'external-link'];
const GENRES = ['Arcade', 'Puzzle', 'Racing', 'Sport', 'Strategy', 'Trivia', 'Cards', 'Match 3', 'Bubble Shooter', 'IO Games', 'Mahjong', 'Board', 'Creative', 'Action', 'Other'];
const GAME_TYPES = ['single-player', 'multiplayer'];

const emptyForm = {
  title: '',
  description: '',
  genre: 'Arcade',
  thumbnail: '',
  gameType: 'single-player',
  maxPlayers: 1,
  sourceType: 'embed',
  launchUrl: '',
  provider: 'famobi',
  licenseStatus: 'unknown',
};

function AdminPanel() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gamesPage, setGamesPage] = useState(1);
  const [gamesPagination, setGamesPagination] = useState(null);
  const [tab, setTab] = useState('catalog'); // catalog | add | import
  const [form, setForm] = useState(emptyForm);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedProvider, setFeedProvider] = useState('feed-import');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('All');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [playedGamesPage, setPlayedGamesPage] = useState(1);
  const [userGamePage, setUserGamePage] = useState(1);

  const GAMES_LIMIT = 12;
  const ANALYTICS_USERS_LIMIT = 10;
  const ANALYTICS_GAMES_LIMIT = 10;
  const ANALYTICS_USER_GAME_LIMIT = 10;

  const fetchGames = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gamesAPI.getAllGames({ page: gamesPage, limit: GAMES_LIMIT });
      setGames(res.data?.items || []);
      setGamesPagination(res.data?.pagination || null);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGames(); }, [gamesPage]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError('');
      try {
        const res = await adminAPI.getAnalytics({
          usersPage,
          usersLimit: ANALYTICS_USERS_LIMIT,
          gamesPage: playedGamesPage,
          gamesLimit: ANALYTICS_GAMES_LIMIT,
          userGamePage,
          userGameLimit: ANALYTICS_USER_GAME_LIMIT,
        });
        setAnalytics(res.data || null);
      } catch (e) {
        setAnalyticsError(e.response?.data?.message || 'Failed to load analytics');
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [usersPage, playedGamesPage, userGamePage]);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 4000); };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await gamesAPI.addGame({ ...form, maxPlayers: Number(form.maxPlayers) });
      flash('✅ Game added successfully');
      setForm(emptyForm);
      fetchGames();
      setTab('catalog');
    } catch (e) {
      flash('❌ ' + (e.response?.data?.message || 'Failed to add game'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await gamesAPI.importFeed(feedUrl, feedProvider);
      const { created, updated, skipped } = res.data;
      flash(`✅ Import done — ${created} created, ${updated} updated, ${skipped} skipped`);
      setFeedUrl('');
      fetchGames();
    } catch (e) {
      flash('❌ ' + (e.response?.data?.message || 'Import failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id, title) => {
    if (!confirm(`Disable "${title}"?`)) return;
    try {
      await gamesAPI.removeGame?.(id);
      flash(`🗑 "${title}" disabled`);
      fetchGames();
    } catch {
      flash('❌ Could not disable game');
    }
  };

  const providers = ['All', ...Array.from(new Set(games.map((g) => g.provider).filter(Boolean)))];

  const visible = games.filter((g) => {
    const matchProvider = filterProvider === 'All' || g.provider === filterProvider;
    const matchSearch = !search || g.title.toLowerCase().includes(search.toLowerCase());
    return matchProvider && matchSearch;
  });

  const formatDuration = (ms = 0) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    if (totalSeconds < 60) return `${totalSeconds}s`;

    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const analyticsCards = useMemo(() => {
    if (!analytics?.summary) return [];
    const { summary } = analytics;
    return [
      { label: 'Total Players', value: summary.totalUsers?.toLocaleString?.() || '0' },
      { label: 'Anonymous Users', value: summary.anonymousUsers?.toLocaleString?.() || '0' },
      { label: 'Active Users', value: summary.activeUsers?.toLocaleString?.() || '0' },
      { label: 'Website Time', value: formatDuration(summary.totalWebsiteTimeMs || 0) },
      { label: 'Game Play Time', value: formatDuration(summary.totalGamePlayTimeMs || 0) },
      { label: 'Game Plays', value: summary.totalGamePlays?.toLocaleString?.() || '0' },
    ];
  }, [analytics]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 text-white">
      <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
      <p className="text-gray-400 mb-6">Manage your game catalog, add games, or import from a JSON feed.</p>

      <div className="mb-10 bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold">Analytics</h2>
            <p className="text-sm text-gray-400">Website time, game time, and most played titles.</p>
          </div>
          <div className="text-xs text-gray-500">Real-time summary</div>
        </div>

        {analyticsLoading && <p className="text-gray-400">Loading analytics...</p>}
        {analyticsError && <p className="text-red-400 mb-3">{analyticsError}</p>}

        {!analyticsLoading && !analyticsError && analytics && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              {analyticsCards.map((card) => (
                <div key={card.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="font-semibold mb-3">Most Played Game</h3>
                {analytics.summary.topPlayedGame ? (
                  <div>
                    <p className="text-lg font-bold text-white">{analytics.summary.topPlayedGame.title}</p>
                    <p className="text-sm text-gray-400">{analytics.summary.topPlayedGame.genre} • {analytics.summary.topPlayedGame.provider}</p>
                    <div className="mt-3 flex gap-4 text-sm text-gray-300 flex-wrap">
                      <span>Plays: <span className="font-semibold text-cyan-300">{analytics.summary.topPlayedGame.totalPlays}</span></span>
                      <span>Time: <span className="font-semibold text-cyan-300">{formatDuration(analytics.summary.topPlayedGame?.totalPlayTimeMs ?? 0)}</span></span>
                      <span>Players: <span className="font-semibold text-cyan-300">{analytics.summary.topPlayedGame.uniquePlayers}</span></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">No play data yet.</p>
                )}
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 overflow-hidden">
                <h3 className="font-semibold mb-3">Top Website Users</h3>
                <div className="space-y-2 max-h-64 overflow-auto pr-1">
                  {analytics.topWebsiteUsers?.length ? analytics.topWebsiteUsers.map((user, index) => (
                    <div key={user.id || index} className="flex items-center justify-between text-sm bg-gray-900/60 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-gray-400 mr-2">#{((usersPage - 1) * ANALYTICS_USERS_LIMIT) + index + 1}</span>
                        <span className="font-medium">{user.username}</span>
                        {user.isAnonymous && <span className="text-yellow-300 ml-2">(Guest)</span>}
                      </div>
                      <span className="text-cyan-300 font-semibold">{formatDuration(user.totalWebsiteTimeMs)}</span>
                    </div>
                  )) : <p className="text-gray-400">No website activity yet.</p>}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <button
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    disabled={!analytics.pagination?.topWebsiteUsers?.hasPrevPage}
                    className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <span className="text-gray-400">
                    Page {analytics.pagination?.topWebsiteUsers?.page || 1} of {analytics.pagination?.topWebsiteUsers?.totalPages || 1}
                  </span>
                  <button
                    onClick={() => setUsersPage((p) => p + 1)}
                    disabled={!analytics.pagination?.topWebsiteUsers?.hasNextPage}
                    className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h3 className="font-semibold mb-3">Top Played Games</h3>
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {analytics.mostPlayedGames?.length ? analytics.mostPlayedGames.map((game, index) => (
                  <div key={game.gameId || index} className="flex items-center justify-between text-sm bg-gray-900/60 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-gray-400 mr-2">#{((playedGamesPage - 1) * ANALYTICS_GAMES_LIMIT) + index + 1}</span>
                      <span className="font-medium">{game.title}</span>
                      <span className="text-gray-500 ml-2">{game.genre}</span>
                    </div>
                    <div className="text-right text-gray-300">
                      <div><span className="text-cyan-300 font-semibold">{game.totalPlays}</span> plays</div>
                      <div>Time: <span className="text-cyan-300 font-semibold">{formatDuration(game?.totalPlayTimeMs ?? 0)}</span></div>
                    </div>
                  </div>
                )) : <p className="text-gray-400">No game analytics yet.</p>}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <button
                  onClick={() => setPlayedGamesPage((p) => Math.max(1, p - 1))}
                  disabled={!analytics.pagination?.mostPlayedGames?.hasPrevPage}
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-gray-400">
                  Page {analytics.pagination?.mostPlayedGames?.page || 1} of {analytics.pagination?.mostPlayedGames?.totalPages || 1}
                </span>
                <button
                  onClick={() => setPlayedGamesPage((p) => p + 1)}
                  disabled={!analytics.pagination?.mostPlayedGames?.hasNextPage}
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>

            <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-4 overflow-hidden">
              <h3 className="font-semibold mb-3">User Game Time (Who played what)</h3>
              <div className="overflow-auto">
                {analytics.userGameActivity?.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">User</th>
                        <th className="py-2 pr-3">Game</th>
                        <th className="py-2 pr-3">Plays</th>
                        <th className="py-2 pr-3">Time Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.userGameActivity.map((row, index) => (
                        <tr key={row.id || `${row.userId}-${row.gameId}-${index}`} className="border-b border-gray-800/80">
                          <td className="py-2 pr-3 text-gray-500">#{((userGamePage - 1) * ANALYTICS_USER_GAME_LIMIT) + index + 1}</td>
                          <td className="py-2 pr-3">
                            <span className="font-medium">{row.username}</span>
                            {row.isAnonymous && <span className="text-yellow-300 ml-2 text-xs">(Guest)</span>}
                          </td>
                          <td className="py-2 pr-3">
                            <span className="font-medium">{row.gameTitle}</span>
                            <span className="text-gray-500 ml-2">{row.gameGenre}</span>
                          </td>
                          <td className="py-2 pr-3 text-cyan-300 font-semibold">{row.totalPlays}</td>
                          <td className="py-2 pr-3 text-cyan-300 font-semibold">{formatDuration(row.totalPlayTimeMs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-400">No user-game activity yet.</p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <button
                  onClick={() => setUserGamePage((p) => Math.max(1, p - 1))}
                  disabled={!analytics.pagination?.userGameActivity?.hasPrevPage}
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-gray-400">
                  Page {analytics.pagination?.userGameActivity?.page || 1} of {analytics.pagination?.userGameActivity?.totalPages || 1}
                </span>
                <button
                  onClick={() => setUserGamePage((p) => p + 1)}
                  disabled={!analytics.pagination?.userGameActivity?.hasNextPage}
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${msg.startsWith('✅') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-700 pb-3">
        {['catalog', 'add', 'import'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-t font-semibold capitalize transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t === 'catalog' ? `📋 Catalog (${gamesPagination?.totalItems ?? games.length})` : t === 'add' ? '➕ Add Game' : '📥 Import Feed'}
          </button>
        ))}
      </div>

      {/* ── CATALOG TAB ── */}
      {tab === 'catalog' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none"
            >
              {providers.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {loading && <p className="text-gray-400">Loading...</p>}
          {error && <p className="text-red-400">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visible.map((game) => (
              <div key={game._id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
                <div className="relative">
                  <img
                    src={resolveGameImage(game)}
                    alt={game.title}
                    className="w-full h-36 object-cover"
                    onError={(e) => { e.currentTarget.src = DEFAULT_GAME_IMAGE; }}
                  />
                  <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    game.provider === 'internal' ? 'bg-purple-700' :
                    game.provider === 'famobi' ? 'bg-blue-700' : 'bg-gray-600'
                  }`}>
                    {game.provider || 'unknown'}
                  </span>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-base leading-snug">{game.title}</h3>
                    <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-300 whitespace-nowrap">{game.genre}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{game.sourceType} • {game.gameType}</p>
                  {game.launchUrl && (
                    <p className="text-xs text-gray-500 truncate mb-2">{game.launchUrl}</p>
                  )}
                  <div className="mt-auto flex gap-2 pt-2">
                    {game.launchUrl && (
                      <a
                        href={game.launchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 text-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded font-semibold"
                      >
                        Preview ↗
                      </a>
                    )}
                    <button
                      onClick={() => handleRemove(game._id, game.title)}
                      className="flex-1 text-xs px-3 py-1.5 bg-red-800 hover:bg-red-700 rounded font-semibold"
                    >
                      Disable
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {gamesPagination && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setGamesPage((p) => Math.max(1, p - 1))}
                disabled={!gamesPagination.hasPrevPage}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold"
              >
                ← Prev
              </button>
              <p className="text-sm text-gray-400">
                Page {gamesPagination.page} of {gamesPagination.totalPages}
              </p>
              <button
                onClick={() => setGamesPage((p) => p + 1)}
                disabled={!gamesPagination.hasNextPage}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ADD GAME TAB ── */}
      {tab === 'add' && (
        <form onSubmit={handleAdd} className="max-w-2xl space-y-4">
          <p className="text-sm text-gray-400 mb-2">
            Add any HTML5 game by paste its embed/play URL. For Famobi games use <code className="bg-gray-700 px-1 rounded">https://play.famobi.com/SLUG</code> as the Launch URL.
          </p>
          {[
            { label: 'Title *', key: 'title', type: 'text', required: true },
            { label: 'Description', key: 'description', type: 'text' },
            { label: 'Thumbnail URL', key: 'thumbnail', type: 'url' },
            { label: 'Launch URL (iframe / play URL)', key: 'launchUrl', type: 'url' },
            { label: 'Provider (e.g. famobi, internal)', key: 'provider', type: 'text' },
          ].map(({ label, key, type, required }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
              <input
                type={type}
                required={required}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
              <select value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none">
                {GENRES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Source Type</label>
              <select value={form.sourceType} onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none">
                {SOURCE_TYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Game Type</label>
              <select value={form.gameType} onChange={(e) => setForm((f) => ({ ...f, gameType: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none">
                {GAME_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Max Players</label>
              <input type="number" min={1} max={64} value={form.maxPlayers}
                onChange={(e) => setForm((f) => ({ ...f, maxPlayers: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none" />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-2.5 rounded-lg font-semibold transition-colors">
            {submitting ? 'Adding...' : '➕ Add Game to Catalog'}
          </button>
        </form>
      )}

      {/* ── IMPORT FEED TAB ── */}
      {tab === 'import' && (
        <form onSubmit={handleImport} className="max-w-2xl space-y-4">
          <p className="text-sm text-gray-400 mb-2">
            Import games in bulk from a JSON feed URL. The feed must return an array of game objects (or <code className="bg-gray-700 px-1 rounded">{`{ games: [...] }`}</code>).
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Feed URL *</label>
            <input
              type="url"
              required
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://your-feed.example.com/games.json"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Provider Label</label>
            <input
              type="text"
              value={feedProvider}
              onChange={(e) => setFeedProvider(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2.5 rounded-lg font-semibold transition-colors">
            {submitting ? 'Importing...' : '📥 Import Games'}
          </button>

          <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold mb-3">Expected feed JSON format</h3>
            <pre className="text-xs text-gray-300 overflow-auto">{`[
  {
    "title": "Game Name",
    "description": "Short description",
    "genre": "Arcade",
    "thumbnail": "https://...",
    "gameType": "single-player",
    "maxPlayers": 1,
    "sourceType": "embed",
    "launchUrl": "https://play.famobi.com/your-slug",
    "provider": "famobi",
    "licenseStatus": "licensed"
  }
]`}</pre>
          </div>
        </form>
      )}
    </div>
  );
}

export default AdminPanel;
