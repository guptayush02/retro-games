import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useGuestStore } from './store/guestStore';
import { authAPI } from './api/endpoints';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import GameCatalogPage from './pages/GameCatalogPage';
import GamePlayPage from './pages/GamePlayPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPanel from './pages/AdminPanel';

// Layout
import Navbar from './components/Navbar';

// Module-level flag — survives StrictMode double-mount, prevents duplicate guest creation
let guestSessionInitializing = false;
let guestSessionRefreshing = false;

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isGuest = useGuestStore((state) => state.isGuest);
  const isGuestValid = useGuestStore((state) => state.isGuestSessionValid)();

  if (isAuthenticated || (isGuest && isGuestValid)) {
    return children;
  }
  
  return <Navigate to="/" />;
}

function App() {
  const setUser = useAuthStore((state) => state.setUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const isGuest = useGuestStore((state) => state.isGuest);
  const clearGuest = useGuestStore((state) => state.clearGuest);
  const setGuestToken = useGuestStore((state) => state.setGuestToken);
  const isGuestSessionValid = useGuestStore((state) => state.isGuestSessionValid);
  const guestUserId = useGuestStore((state) => state.guestUserId);

  useEffect(() => {
    if (isAuthenticated) {
      authAPI
        .getCurrentUser()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          useAuthStore.getState().logout();
        });
      // Track visit for logged-in user
      authAPI.trackVisit().catch(() => {});
    }
  }, [isAuthenticated, setUser]);

  // Auto-create guest session when website opens (if not logged in)
  useEffect(() => {
    const createGuestIfNeeded = async () => {
      if (token) return;
      // Prevent double-execution from React StrictMode double-mount
      if (guestSessionInitializing) return;
      guestSessionInitializing = true;

      try {
        const persistedGuestUserId = localStorage.getItem('guestUserId');

        if (persistedGuestUserId) {
          try {
            const res = await authAPI.refreshGuestSession(persistedGuestUserId);
            setGuestToken(res.data.guestToken, res.data.expiresIn, res.data.user.id);
            setUser(res.data.user);
            return;
          } catch (err) {
            console.error('Failed to refresh guest session, creating new one:', err);
            localStorage.removeItem('guestUserId');
          }
        }

        const res = await authAPI.guestLogin();
        setGuestToken(res.data.guestToken, res.data.expiresIn, res.data.user.id);
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to auto-create guest session:', err);
      } finally {
        guestSessionInitializing = false;
      }
    };

    createGuestIfNeeded();
  }, [token, setGuestToken, setUser]);

  // Keep same guest ID and extend session before expiry (sliding 30-minute window)
  useEffect(() => {
    if (isGuest) {
      const checkInterval = setInterval(() => {
        const state = useGuestStore.getState();
        const expiresAt = Number(state.guestExpires || 0);
        const remainingMs = expiresAt - Date.now();

        // If token already expired, clear and let init flow recreate only if no guestUserId exists.
        if (remainingMs <= 0) {
          clearGuest();
          return;
        }

        // Refresh with same guest user id when less than 5 minutes remain
        if (remainingMs <= 5 * 60 * 1000 && !guestSessionRefreshing) {
          const persistedGuestUserId = state.guestUserId || localStorage.getItem('guestUserId');
          if (!persistedGuestUserId) return;

          guestSessionRefreshing = true;
          authAPI
            .refreshGuestSession(persistedGuestUserId)
            .then((res) => {
              setGuestToken(res.data.guestToken, res.data.expiresIn, res.data.user.id);
              setUser(res.data.user);
            })
            .catch((err) => {
              console.error('Failed to refresh guest session:', err);
            })
            .finally(() => {
              guestSessionRefreshing = false;
            });
        }
      }, 60000); // Check every minute

      return () => clearInterval(checkInterval);
    }
  }, [isGuest, guestUserId, clearGuest, setGuestToken, setUser]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Navbar />
      <main className="flex-1 ml-64 transition-all duration-300 md:ml-20 lg:ml-64">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/games" element={<GameCatalogPage />} />
          <Route path="/game/:gameId" element={<GamePlayPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
