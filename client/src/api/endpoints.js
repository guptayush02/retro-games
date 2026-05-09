import api from './client';

export const authAPI = {
  signup: (email, password, username, guestUserId) =>
    api.post('/api/auth/signup', { email, password, username, ...(guestUserId ? { guestUserId } : {}) }),
  
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),
  
  guestLogin: () =>
    api.post('/api/auth/guest-login'),
  
  refreshGuestSession: (guestUserId) =>
    api.post('/api/auth/guest-refresh', { guestUserId }),
  
  validateGuestToken: (guestToken) =>
    api.post('/api/auth/validate-guest-token', { guestToken }),
  
  getCurrentUser: () =>
    api.get('/api/auth/me'),

  trackVisit: () =>
    api.post('/api/auth/track-visit'),
  
  logout: () =>
    api.post('/api/auth/logout'),
};

export const gamesAPI = {
  getAllGames: (params = {}) =>
    api.get('/api/games', { params }),
  
  getGameById: (id) =>
    api.get(`/api/games/${id}`),

  addGame: (data) =>
    api.post('/api/games', data),

  removeGame: (id) =>
    api.delete(`/api/games/${id}`),

  importFeed: (feedUrl, provider) =>
    api.post('/api/games/import-feed', { feedUrl, provider }),

  recordPlay: (id) =>
    api.post(`/api/games/${id}/play`),

  recordResult: (id, data) =>
    api.post(`/api/games/${id}/result`, data),
  
  getRecentlyPlayed: () =>
    api.get('/api/games/recently-played'),
};

export const profileAPI = {
  getProfile: (userId) =>
    api.get(`/api/profile/${userId}`),
  
  updateProfile: (data) =>
    api.put('/api/profile', data),
  
  uploadAvatar: (formData) =>
    api.post('/api/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const leaderboardAPI = {
  getGlobalLeaderboard: (params = {}) =>
    api.get('/api/leaderboard/global', { params }),
  
  getGameLeaderboard: (gameId, params = {}) =>
    api.get(`/api/leaderboard/game/${gameId}`, { params }),
};
