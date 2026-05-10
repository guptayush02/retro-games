import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useGuestStore } from '../store/guestStore';

function AdminAuthPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearGuest = useGuestStore((state) => state.clearGuest);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      if (res.data.user?.role !== 'admin') {
        setError('This account does not have admin access');
        return;
      }
      clearGuest();
      setToken(res.data.token);
      setUser(res.data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Admin authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2">Admin Login</h1>
        <p className="text-gray-400 text-sm mb-6">Access analytics, top games, and usage reports.</p>

        {error && <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 py-2.5 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Please wait...' : 'Login as Admin'}
          </button>
        </form>

        <p className="text-center mt-5 text-gray-400 text-sm">
          <Link to="/" className="text-purple-400 hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export default AdminAuthPage;
