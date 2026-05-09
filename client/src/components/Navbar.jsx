import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGuestStore } from '../store/guestStore';
import { useEffect, useState } from 'react';

function Navbar() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const isGuest = useGuestStore((state) => state.isGuest);
  const clearGuest = useGuestStore((state) => state.clearGuest);
  const guestExpires = useGuestStore((state) => state.guestExpires);
  const guestUserId = useGuestStore((state) => state.guestUserId);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  // Live countdown ticker
  useEffect(() => {
    if (!isGuest || !guestExpires) return;
    const tick = () => {
      const remaining = parseInt(guestExpires) - Date.now();
      if (remaining <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${m}m ${s < 10 ? '0' : ''}${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isGuest, guestExpires]);

  const shortGuestId = guestUserId ? guestUserId.slice(-8) : '';

  const handleLogout = () => {
    if (isGuest) {
      clearGuest();
    } else {
      logout();
    }
  };

  const NavLink = ({ to, icon, label, isAdmin }) => (
    <Link
      to={to}
      className={`px-3 py-2.5 rounded hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 ${
        isAdmin ? 'text-orange-400' : ''
      }`}
      title={!isExpanded ? label : ''}
    >
      <span className="text-lg min-w-[1.5rem]">{icon}</span>
      {isExpanded && <span className="text-sm">{label}</span>}
    </Link>
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gray-800 border-r border-gray-700 py-6 flex flex-col justify-between transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64 px-4' : 'w-20 px-2'
      }`}
    >
      <div>
        {/* Toggle Button */}
        <div className="flex items-center justify-between mb-8">
          {isExpanded && (
            <Link to="/" className="text-2xl font-bold text-purple-500">
              🎮 Retro Games
            </Link>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-gray-700 rounded transition-colors ml-auto"
            title={isExpanded ? 'Collapse menu' : 'Expand menu'}
          >
            {isExpanded ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 mb-6">
          <NavLink to="/" icon="🏠" label="Home" />
          <NavLink to="/games" icon="🎮" label="Games" />
          <NavLink to="/leaderboard" icon="🏆" label="Leaderboard" />
          {user?.role === 'admin' && (
            <NavLink to="/admin" icon="⚙️" label="Admin" isAdmin />
          )}
          {(user?._id || user?.id) && (
            <NavLink to={`/profile/${user?._id || user?.id}`} icon="👤" label={isGuest ? 'Guest' : 'Profile'} />
          )}
        </nav>

        {/* Guest Info - Collapsed Version */}
        {isGuest && !isExpanded && (
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-2 mb-4 flex justify-center">
            <span className="text-lg" title="30 minute free session">🎮</span>
          </div>
        )}

        {/* Guest Info - Expanded Version */}
        {isGuest && isExpanded && (
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg px-3 py-3 mb-4 text-xs">
            <p className="text-yellow-300 font-bold text-sm mb-1">🎮 30 Min Free</p>
            <p className="text-yellow-500 mb-2 text-xs">Resets on refresh</p>
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400">Time:</span>
              <span className="text-yellow-300 font-mono font-bold text-xs">{timeLeft}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">ID:</span>
              <span className="text-gray-300 font-mono text-xs">#{shortGuestId}</span>
            </div>
            <p className="text-yellow-600 mt-2 text-center text-xs">Sign up to save!</p>
          </div>
        )}

        {/* Auth Buttons - Expanded */}
        {!token && isExpanded && (
          <div className="flex flex-col gap-2">
            <Link to="/login" className="text-center bg-purple-600 px-4 py-2 rounded hover:bg-purple-700 font-semibold text-sm">
              Login
            </Link>
            <Link to="/signup" className="text-center bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700 font-semibold text-sm">
              Sign Up
            </Link>
          </div>
        )}

        {/* Auth Buttons - Collapsed */}
        {!token && !isExpanded && (
          <div className="flex flex-col gap-2">
            <Link to="/login" className="text-center bg-purple-600 p-2 rounded hover:bg-purple-700" title="Login">
              📝
            </Link>
            <Link to="/signup" className="text-center bg-indigo-600 p-2 rounded hover:bg-indigo-700" title="Sign Up">
              ➕
            </Link>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div>
        {(token || isGuest) && (
          <button
            onClick={handleLogout}
            className={`w-full bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-all duration-300 font-semibold text-sm ${
              !isExpanded ? 'px-2' : ''
            }`}
            title={!isExpanded ? 'Logout' : ''}
          >
            {isExpanded ? 'Logout' : '🚪'}
          </button>
        )}
        {user?.username && isExpanded && (
          <p className="text-gray-400 text-xs mt-3 px-1 text-center">
            {user.username}
          </p>
        )}
      </div>
    </aside>
  );
}

export default Navbar;
