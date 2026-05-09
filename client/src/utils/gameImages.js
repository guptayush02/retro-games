const GAME_IMAGE_BY_TITLE = {
  'tic-tac-toe': '/images/games/tic-tac-toe.svg',
  snake: '/images/games/snake.svg',
  chess: '/images/games/chess.svg',
  'quiz battle': '/images/games/quiz-battle.svg',
  ludo: '/images/games/ludo.svg',
  'scribble battle': '/images/games/scribble-battle.svg',
  'mini racing': '/images/games/mini-racing.svg',
  'bomber arena': '/images/games/bomber-arena.svg',
};

const GAME_IMAGE_BY_GENRE = {
  arcade: '/images/games/bomber-arena.svg',
  puzzle: '/images/games/chess.svg',
  strategy: '/images/games/chess.svg',
  trivia: '/images/games/quiz-battle.svg',
  sport: '/images/games/ludo.svg',
  sports: '/images/games/ludo.svg',
  racing: '/images/games/mini-racing.svg',
  cards: '/images/games/ludo.svg',
  mahjong: '/images/games/chess.svg',
  'match 3': '/images/games/quiz-battle.svg',
  'bubble shooter': '/images/games/bomber-arena.svg',
  io: '/images/games/bomber-arena.svg',
  'io games': '/images/games/bomber-arena.svg',
};

export const DEFAULT_GAME_IMAGE = '/images/games/4000_4_07.jpg';

const isPlaceholderImage = (url = '') => {
  const u = url.toLowerCase();
  // treat placeholder images AND the old wrong CDN host as missing
  return (
    u.includes('via.placeholder.com') ||
    u.includes('placeholder.com') ||
    u.includes('img.famobi.com') ||
    !url ||
    url.trim() === ''
  );
};

/**
 * For Famobi games the thumbnail CDN URL can be derived from the play URL slug.
 * e.g. https://play.famobi.com/om-nom-run  →  OmNomRun  →  OmNomRunTeaser.jpg
 */
function famobiThumbnailFromUrl(launchUrl = '') {
  const match = launchUrl.match(/play\.famobi\.com\/([^/]+)/);
  if (!match) return null;
  const slug = match[1];
  const pascal = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  // Use size 180 for thumbnails (Famobi supports: 60, 120, 180)
  return `https://download.famobi.com/portal/html5games/images/tmp/180/${pascal}Teaser.jpg`;
}

function getGenreBasedImage(genre = '') {
  const normalized = (genre || '').toLowerCase().trim();
  return GAME_IMAGE_BY_GENRE[normalized] || null;
}

/**
 * Resolve the best game image URL with multiple fallback strategies
 * Priority: local SVG asset → stored valid thumbnail → Famobi CDN derived → default fallback
 */
export function resolveGameImage(game) {
  if (!game) return DEFAULT_GAME_IMAGE;
  
  const title = (game?.title || '').toLowerCase();
  const mapped = GAME_IMAGE_BY_TITLE[title];

  // Prefer game-specific local assets
  if (mapped) return mapped;

  // Use stored thumbnail if it looks valid and not empty
  if (game?.thumbnail && !isPlaceholderImage(game.thumbnail)) {
    return game.thumbnail;
  }

  // Derive thumbnail from Famobi CDN using the launchUrl slug
  if (game?.provider === 'famobi' && game?.launchUrl) {
    const famobiUrl = famobiThumbnailFromUrl(game.launchUrl);
    if (famobiUrl) return famobiUrl;
  }

  const genreImage = getGenreBasedImage(game?.genre);
  if (genreImage) return genreImage;

  return DEFAULT_GAME_IMAGE;
}

export function getFallbackGameImage(game) {
  if (!game) return DEFAULT_GAME_IMAGE;

  const title = (game?.title || '').toLowerCase();
  if (GAME_IMAGE_BY_TITLE[title]) return GAME_IMAGE_BY_TITLE[title];

  const genreImage = getGenreBasedImage(game?.genre);
  if (genreImage) return genreImage;

  return DEFAULT_GAME_IMAGE;
}
