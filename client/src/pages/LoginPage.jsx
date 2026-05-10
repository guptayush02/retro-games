import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useGuestStore } from '../store/guestStore';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearGuest = useGuestStore((state) => state.clearGuest);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.login(email, password);
      clearGuest();
      setToken(res.data.token);
      setUser(res.data.user);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>
        
        {error && <div className="bg-red-500 p-3 rounded mb-4 text-white">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded font-semibold disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-400 text-sm">
          You get a guest session automatically on site open.
        </p>

        <p className="text-center mt-4 text-gray-400">
          Don't have an account?{' '}
          <a href="/signup" className="text-purple-400 hover:underline">
            Sign up
          </a>
        </p>

        <p className="text-center mt-3 text-gray-500 text-sm">
          Admin?{' '}
          <a href="/admin/login" className="text-orange-400 hover:underline">
            Admin Login
          </a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
