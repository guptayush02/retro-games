import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, gamesAPI } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useGuestStore } from '../store/guestStore';

function IndexPage() {
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [startingGuest, setStartingGuest] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const isGuest = useGuestStore((state) => state.isGuest);
  const isGuestSessionValid = useGuestStore((state) => state.isGuestSessionValid);
  const setGuestToken = useGuestStore((state) => state.setGuestToken);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const res = await gamesAPI.getAllGames({ page: 1, limit: 24 });
        setGames(res.data?.items || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load games');
      } finally {
        setLoadingGames(false);
      }
    };

    loadGames();
  }, []);

  const handleGuestPlay = async () => {
    setError('');

    if (isGuest && isGuestSessionValid()) {
      navigate('/games');
      return;
    }

    setStartingGuest(true);
    try {
      const res = await authAPI.guestLogin();
      setGuestToken(res.data.guestToken, res.data.expiresIn);
      setUser(res.data.user);
      navigate('/games');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start guest session');
    } finally {
      setStartingGuest(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 p-6 flex flex-col gap-4">
        <Link to="/" className="text-2xl font-bold text-purple-400 mb-2">
          🎮 Retro Games
        </Link>
        <p className="text-sm text-gray-300 mb-4">Play instantly. No login required for guest mode.</p>

        <Link
          to="/login"
          className="w-full text-center bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-semibold"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="w-full text-center bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-semibold"
        >
          Sign Up
        </Link>

        <button
          onClick={handleGuestPlay}
          disabled={startingGuest}
          className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold disabled:opacity-50 mt-2"
        >
          {startingGuest ? 'Starting...' : 'Play as Guest (30 min free)'}
        </button>

        {isAuthenticated && (
          <button
            onClick={() => navigate('/home')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded font-semibold"
          >
            Go to Dashboard
          </button>
        )}
      </aside>

      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Game Index</h1>
          <p className="text-gray-300">Browse all games and start a free 30-minute guest session anytime.</p>
          {error && <p className="mt-3 text-red-400">{error}</p>}
        </div>

        {loadingGames ? (
          <p className="text-gray-300">Loading games...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {games.map((game) => (
              <div key={game._id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                <img
                  src={game.thumbnail || 'https://via.placeholder.com/600x300?text=Retro+Game'}
                  alt={game.title}
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-1">{game.title}</h2>
                  <p className="text-sm text-gray-400 mb-3">{game.genre || 'Arcade'} • {game.gameType || 'single-player'}</p>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">{game.description || 'Jump in and play this classic retro game.'}</p>

                  <button
                    onClick={handleGuestPlay}
                    disabled={startingGuest}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold disabled:opacity-50"
                  >
                    Play Free as Guest
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default IndexPage;