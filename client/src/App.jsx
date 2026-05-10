import { Routes, Route, Navigate, useLocation, useMatch } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAuthStore } from './store/authStore';
import { useGuestStore } from './store/guestStore';
import { activityAPI, authAPI } from './api/endpoints';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminAuthPage from './pages/AdminAuthPage';
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

function useWebsiteActivityTracker({ enabled }) {
  const location = useLocation();
  const gameMatch = useMatch('/game/:gameId');
  const lastTickRef = useRef(Date.now());
  const contextRef = useRef({ path: location.pathname, gameId: gameMatch?.params?.gameId || null });
  const isVisibleRef = useRef(!document.hidden);
  const sendingRef = useRef(false);

  useEffect(() => {
    contextRef.current = { path: location.pathname, gameId: gameMatch?.params?.gameId || null };
  }, [location.pathname, gameMatch?.params?.gameId]);

  useEffect(() => {
    if (!enabled) return undefined;

    const flush = async () => {
      if (sendingRef.current) return;
      if (!isVisibleRef.current) return;

      const now = Date.now();
      const durationMs = now - lastTickRef.current;
      if (durationMs < 1000) return;

      const { gameId } = contextRef.current;
      sendingRef.current = true;
      lastTickRef.current = now;

      try {
        await activityAPI.track({
          durationMs,
          pageType: gameId ? 'game' : 'website',
          gameId: gameId || undefined,
          path: location.pathname,
        });
      } catch {
        // ignore transient analytics failures
      } finally {
        sendingRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (document.hidden) {
        flush();
      } else {
        lastTickRef.current = Date.now();
      }
    };

    const handlePageHide = () => {
      flush();
    };

    const interval = setInterval(flush, 60000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      flush();
    };
  }, [enabled, location.pathname]);
}

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isGuest = useGuestStore((state) => state.isGuest);
  const isGuestValid = useGuestStore((state) => state.isGuestSessionValid)();

  if (isAuthenticated || (isGuest && isGuestValid)) {
    return children;
  }
  
  return <Navigate to="/" />;
}

function AdminRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" />;
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading admin access...</div>;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/home" />;
  }

  return children;
}

function App() {
  const setUser = useAuthStore((state) => state.setUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const isGuest = useGuestStore((state) => state.isGuest);
  const clearGuest = useGuestStore((state) => state.clearGuest);
  const setGuestToken = useGuestStore((state) => state.setGuestToken);
  const isGuestSessionValid = useGuestStore((state) => state.isGuestSessionValid);
  useWebsiteActivityTracker({ enabled: isAuthenticated || isGuest || !!token });

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
        const guestUserId = localStorage.getItem('guestUserId');

        if (guestUserId) {
          const res = await authAPI.refreshGuestSession(guestUserId);
          setGuestToken(res.data.guestToken, res.data.expiresIn, res.data.user.id);
          setUser(res.data.user);
          return;
        }

        const res = await authAPI.guestLogin();
        setGuestToken(res.data.guestToken, res.data.expiresIn, res.data.user.id);
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to auto-create guest session:', err);
      } finally {
        guestSessionInitializing = false; // allow retry and future refreshes
      }
    };

    createGuestIfNeeded();
  }, [token, setGuestToken, setUser]);

  // Keep the same guest user id and refresh the timer before/after expiry.
  useEffect(() => {
    if (isGuest) {
      const checkInterval = setInterval(() => {
        const state = useGuestStore.getState();
        const guestUserId = state.guestUserId || localStorage.getItem('guestUserId');
        if (!guestUserId) {
          clearGuest();
          return;
        }

        const expiresAt = Number(state.guestExpires || localStorage.getItem('guestExpires') || 0);
        const remainingMs = expiresAt - Date.now();

        // Refresh when there is less than 5 minutes left, or if already expired.
        if (!guestSessionRefreshing && remainingMs <= 5 * 60 * 1000) {
          guestSessionRefreshing = true;
          authAPI
            .refreshGuestSession(guestUserId)
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
  }, [isGuest, clearGuest, setGuestToken, setUser]);

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
          <Route path="/admin/login" element={<AdminAuthPage />} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
