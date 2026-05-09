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

      const guestUserId = localStorage.getItem('guestUserId');

      if (guestUserId) {
        try {
          const res = await authAPI.refreshGuestSession(guestUserId);
          setGuestToken(res.data.guestToken, res.data.expiresIn, res.data.user.id);
          setUser(res.data.user);
          return;
        } catch (err) {
          console.error('Failed to refresh guest session, creating new one:', err);
          localStorage.removeItem('guestUserId');
        }
      }

      try {
        const res = await authAPI.guestLogin();
        setGuestToken(res.data.guestToken, res.data.expiresIn, res.data.user.id);
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to auto-create guest session:', err);
        guestSessionInitializing = false; // allow retry on error
      }
    };

    createGuestIfNeeded();
  }, [token, setGuestToken, setUser]);

  // Check if guest session has expired
  useEffect(() => {
    if (isGuest) {
      const checkInterval = setInterval(() => {
        const isValid = useGuestStore.getState().isGuestSessionValid();
        if (!isValid) {
          clearGuest();
        }
      }, 60000); // Check every minute

      return () => clearInterval(checkInterval);
    }
  }, [isGuest, clearGuest]);

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
