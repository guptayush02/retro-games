import { useEffect, useState } from 'react';
import { gamesAPI } from '../api/endpoints';
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
  const [tab, setTab] = useState('catalog'); // catalog | add | import
  const [form, setForm] = useState(emptyForm);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedProvider, setFeedProvider] = useState('feed-import');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('All');

  const fetchGames = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gamesAPI.getAllGames({ page: 1, limit: 100 });
      setGames(res.data?.items || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGames(); }, []);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 text-white">
      <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
      <p className="text-gray-400 mb-6">Manage your game catalog, add games, or import from a JSON feed.</p>

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
            {t === 'catalog' ? `📋 Catalog (${games.length})` : t === 'add' ? '➕ Add Game' : '📥 Import Feed'}
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
