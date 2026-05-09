import { create } from 'zustand';

export const useGuestStore = create((set) => ({
  guestUserId: localStorage.getItem('guestUserId') || null,
  guestToken: localStorage.getItem('guestToken') || null,
  isGuest: !!localStorage.getItem('guestToken'),
  guestExpires: localStorage.getItem('guestExpires') || null,

  setGuestToken: (token, expiresIn, userId) => {
    if (token && userId) {
      const expiresAt = new Date(Date.now() + expiresIn).getTime();
      localStorage.setItem('guestToken', token);
      localStorage.setItem('guestExpires', expiresAt);
      localStorage.setItem('guestUserId', userId);
      set({
        guestUserId: userId,
        guestToken: token,
        isGuest: true,
        guestExpires: expiresAt,
      });
    } else {
      localStorage.removeItem('guestToken');
      localStorage.removeItem('guestExpires');
      localStorage.removeItem('guestUserId');
      set({
        guestUserId: null,
        guestToken: null,
        isGuest: false,
        guestExpires: null,
      });
    }
  },

  isGuestSessionValid: () => {
    const expiresAt = localStorage.getItem('guestExpires');
    if (!expiresAt) return false;
    return new Date().getTime() < parseInt(expiresAt);
  },

  clearGuest: () => {
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestExpires');
    localStorage.removeItem('guestUserId');
    set({
      guestUserId: null,
      guestToken: null,
      isGuest: false,
      guestExpires: null,
    });
  },
}));
