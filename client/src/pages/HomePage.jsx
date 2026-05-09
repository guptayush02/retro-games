import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gamesAPI } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useGuestStore } from '../store/guestStore';
import { resolveGameImage, DEFAULT_GAME_IMAGE } from '../utils/gameImages';

function GameCard({ game, navigate }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(resolveGameImage(game));

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
          crossOrigin="anonymous"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent pointer-events-none" />
      </div>
      <div className="p-5">
        <h3 className="text-xl font-semibold mb-1">{game.title}</h3>
        <p className="text-sm text-gray-400 mb-3">
          {game.genre} &bull; {game.gameType}
        </p>
        <p className="text-gray-300 text-sm mb-4">{game.description}</p>
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

function HomePage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isGuest = useGuestStore((s) => s.isGuest);

  useEffect(() => {
    gamesAPI
      .getAllGames({ page: 1, limit: 3 })
      .then((res) => setGames(res.data?.items || []))
      .catch((err) => console.error('Failed to fetch games:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="text-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 px-10 py-20">
        <h1 className="text-6xl font-extrabold mb-4 leading-tight">
          Retro Games Portal
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-xl">
          Classic games, modern experience. Play instantly as a guest or log in to save your progress and climb the leaderboard.
        </p>
        <div className="flex gap-4">
          <Link
            to="/games"
            className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-bold text-lg transition-colors"
          >
            Browse All Games
          </Link>
          {!token && (
            <Link
              to="/signup"
              className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg font-bold text-lg transition-colors"
            >
              Create Account
            </Link>
          )}
        </div>
        {isGuest && (
          <p className="mt-6 text-yellow-400 text-sm">
            Playing as guest.{' '}
            <Link to="/signup" className="underline">
              Sign up
            </Link>{' '}
            to save progress.
          </p>
        )}
      </div>

      {/* Featured Games */}
      <div className="px-10 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Featured Games</h2>
          <Link
            to="/games"
            className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
          >
            View All &rarr;
          </Link>
        </div>

        {loading && <p className="text-gray-400">Loading games...</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard key={game._id} game={game} navigate={navigate} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mx-10 mb-12 bg-gray-800 border border-gray-700 rounded-xl px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold mb-1">Ready to compete?</h3>
          <p className="text-gray-400">
            Create a free account to track XP, earn coins, and top the leaderboard.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            to="/leaderboard"
            className="px-6 py-2 border border-gray-500 rounded-lg hover:bg-gray-700 font-semibold"
          >
            Leaderboard
          </Link>
          {!token && (
            <Link
              to="/signup"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
            >
              Sign Up Free
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
