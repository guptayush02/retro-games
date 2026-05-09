import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { profileAPI } from '../api/endpoints';
import { useGuestStore } from '../store/guestStore';

function ProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const guestExpires = useGuestStore((state) => state.guestExpires);
  const isGuest = useGuestStore((state) => state.isGuest);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await profileAPI.getProfile(userId);
        setProfile(res.data.user);
        setStats(res.data.stats || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  const formatTimeRemaining = () => {
    if (!guestExpires) return '';
    const remaining = parseInt(guestExpires) - Date.now();
    if (remaining <= 0) return 'Expired';
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-white">
      <h1 className="text-4xl font-bold mb-8">Player Profile</h1>

      {loading && <p className="text-gray-300">Loading profile...</p>}
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!loading && !error && profile && (
        <>
          {/* Guest banner */}
          {profile.isAnonymous && (
            <div className="bg-yellow-900 border border-yellow-600 text-yellow-300 rounded-lg px-5 py-3 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <p className="font-semibold">Guest Session</p>
                  <p className="text-sm text-yellow-400">Sign up to save your progress permanently</p>
                </div>
              </div>
              {isGuest && (
                <div className="text-right">
                  <p className="text-sm font-semibold">⏱ Time Remaining</p>
                  <p className="text-yellow-300 font-bold">{formatTimeRemaining()}</p>
                </div>
              )}
            </div>
          )}

          {/* Profile card */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8 flex items-center gap-6">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-purple-700 flex items-center justify-center text-3xl font-bold">
                {profile.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold">{profile.username}</h2>
                {profile.isAnonymous && (
                  <span className="bg-yellow-700 text-yellow-200 text-xs px-2 py-1 rounded-full font-medium">Guest</span>
                )}
              </div>
              {profile.email && <p className="text-gray-400 text-sm mt-1">{profile.email}</p>}
              <div className="flex gap-6 mt-3 text-sm flex-wrap">
                <span className="text-yellow-400 font-semibold">⚡ {(profile.xp ?? 0).toLocaleString()} XP</span>
                <span className="text-green-400 font-semibold">🪙 {(profile.coins ?? 0).toLocaleString()} Coins</span>
                <span className="text-blue-400 font-semibold">🔁 {profile.visitCount ?? 0} Visit{profile.visitCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-4">Game Stats</h3>
          {stats.length === 0 ? (
            <p className="text-gray-400">No game stats yet. Play some games!</p>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-700 text-gray-300 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 text-left">Game</th>
                    <th className="px-6 py-3 text-right">Wins</th>
                    <th className="px-6 py-3 text-right">Losses</th>
                    <th className="px-6 py-3 text-right">High Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, i) => (
                    <tr key={i} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-6 py-4 font-medium">{s.gameName}</td>
                      <td className="px-6 py-4 text-right text-green-400">{s.wins}</td>
                      <td className="px-6 py-4 text-right text-red-400">{s.losses}</td>
                      <td className="px-6 py-4 text-right text-yellow-400 font-semibold">
                        {(s.highestScore ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProfilePage;
