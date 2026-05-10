import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesAPI } from '../api/endpoints';
import { resolveGameImage, DEFAULT_GAME_IMAGE } from '../utils/gameImages';

const PAGE_SIZE = 12;
const GENRES = ['All', 'Arcade', 'Puzzle', 'Racing', 'Sport', 'Strategy', 'Trivia', 'Cards', 'Match 3', 'Bubble Shooter', 'IO Games', 'Mahjong', 'Board', 'Creative', 'Action', 'Other'];

function GameCard({ game, navigate }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(resolveGameImage(game));

  useEffect(() => {
    setImageSrc(resolveGameImage(game));
    setImageLoaded(false);
  }, [game]);

  const handleImageError = () => {
    if (imageSrc !== DEFAULT_GAME_IMAGE) {
      setImageSrc(DEFAULT_GAME_IMAGE);
      return;
    }
    setImageLoaded(true);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-purple-500 transition-colors">
      <div className="relative w-full h-44 bg-gray-900 overflow-hidden">
        <img
          src={imageSrc}
          alt={game.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-50'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent pointer-events-none" />
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold">{game.title}</h2>
          <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
            {game.genre || 'Arcade'}
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-3">
          {game.gameType || 'single-player'} &bull; up to {game.maxPlayers || 1} player(s)
        </p>
        <p className="text-gray-300 text-sm mb-4">{game.description || 'Play this retro game now.'}</p>
        <button
          onClick={() => navigate(`/game/${game._id}`)}
          className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          Play Now
        </button>
      </div>
    </div>
  );
}

function GameCatalogPage() {
  const [games, setGames] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, hasNextPage: false, hasPrevPage: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const res = await gamesAPI.getAllGames({
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          genre: genre !== 'All' ? genre : undefined,
        });
        setGames(res.data?.items || []);
        setPagination(res.data?.pagination || { page: 1, totalPages: 1, totalItems: 0, hasNextPage: false, hasPrevPage: false });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch games');
        console.error('Error fetching games:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [page, search, genre]);

  useEffect(() => {
    setPage(1);
  }, [search, genre]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 text-white">
      <h1 className="text-4xl font-bold mb-2">Game Catalog</h1>
      <p className="text-gray-400 mb-8">Browse and play all available retro games.</p>

      {/* Search + Genre Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <div className="flex gap-2 flex-wrap">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                genre === g
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-gray-300">Loading games...</p>}
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!loading && !error && games.length === 0 && (
        <p className="text-gray-400">
          No games found.{' '}
          {search || genre !== 'All' ? 'Try a different filter.' : 'Please run seed data.'}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {games.map((game) => (
          <GameCard key={game._id} game={game} navigate={navigate} />
        ))}
      </div>

      {!loading && !error && pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            Page {pagination.page} of {pagination.totalPages} • {pagination.totalItems} games
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameCatalogPage;
