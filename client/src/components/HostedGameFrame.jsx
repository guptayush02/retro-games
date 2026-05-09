import { useRef, useState } from 'react';

// Use your real partner code from env, fall back to Famobi's public demo code
const FAMOBI_PARTNER_CODE = import.meta.env.VITE_FAMOBI_PARTNER_CODE?.trim() || 'A1000-10';

function buildEmbedUrl(url, provider) {
  const base = url?.trim();
  if (!base) return '';
  if (provider === 'famobi') {
    // Append partner code: https://play.famobi.com/om-nom-run → https://play.famobi.com/om-nom-run/A1000-10
    return base.replace(/\/$/, '') + '/' + FAMOBI_PARTNER_CODE;
  }
  return base;
}

function HostedGameFrame({ title, url, provider }) {
  const finalUrl = buildEmbedUrl(url, provider);
  const iframeRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = iframeRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (!finalUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-14 text-gray-300">
        <p className="text-lg font-semibold">{title} is not configured yet.</p>
        <p className="text-sm text-gray-400 text-center max-w-lg">
          No launch URL is set for this game.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Game frame */}
      <div className="relative w-full rounded-xl overflow-hidden border border-gray-700 bg-black">
        <iframe
          ref={iframeRef}
          title={title}
          src={finalUrl}
          className="w-full h-[78vh] min-h-[560px]"
          allow="autoplay; fullscreen; pointer-lock"
          allowFullScreen
          loading="lazy"
          onError={(e) => {
            console.warn('Error loading game iframe:', e);
          }}
        />
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between gap-3 text-sm text-gray-400 px-1">
        <span className="text-xs text-gray-500">
          Playing: <span className="text-gray-300 font-medium">{title}</span>
        </span>
        <div className="flex gap-2">
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold transition-colors"
          >
            {isFullscreen ? '⊠ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
          <a
            href={url?.trim()}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold transition-colors"
          >
            ↗ New Tab
          </a>
        </div>
      </div>
    </div>
  );
}

export default HostedGameFrame;
