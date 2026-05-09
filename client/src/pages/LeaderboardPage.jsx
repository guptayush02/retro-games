import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardAPI } from '../api/endpoints';

const PAGE_SIZE = 20;

function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, hasNextPage: false, hasPrevPage: false });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await leaderboardAPI.getGlobalLeaderboard({ page, limit: PAGE_SIZE });
        setLeaderboard(res.data?.items || []);
        setPagination(res.data?.pagination || { page: 1, totalPages: 1, totalItems: 0, hasNextPage: false, hasPrevPage: false });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [page]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-white">
      <h1 className="text-4xl font-bold mb-2">🏆 Leaderboard</h1>
      <p className="text-gray-400 mb-8">Top players ranked by overall score, including guest players who have played games.</p>

      {loading && <p className="text-gray-300">Loading leaderboard...</p>}
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!loading && !error && leaderboard.length === 0 && (
        <p className="text-gray-400">No players yet. Start playing to appear here!</p>
      )}

      {!loading && !error && leaderboard.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-700 text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Rank</th>
                <th className="px-6 py-3 text-left">Player</th>
                <th className="px-6 py-3 text-right">Score</th>
                <th className="px-6 py-3 text-right">XP</th>
                <th className="px-6 py-3 text-right">Coins</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry._id || entry.id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="px-6 py-4 font-bold text-gray-300">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/profile/${entry._id || entry.id}`}
                      className="text-blue-400 hover:underline font-medium flex items-center gap-2"
                    >
                      {entry.avatar && (
                        <img src={entry.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      )}
                      {entry.username}{entry.isAnonymous ? ' (Guest)' : ''}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right text-cyan-300 font-semibold">
                    {(entry.score ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-yellow-400 font-semibold">
                    {(entry.xp ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-green-400">
                    {(entry.coins ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            Page {pagination.page} of {pagination.totalPages} • {pagination.totalItems} players
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

export default LeaderboardPage;
