import { useReducedMotion } from 'framer-motion';

/**
 * Cinematic hero background — a silent looping OCC mission video plays
 * full-bleed behind the page hero. The pattern billion-dollar mission
 * orgs (charity:water, World Vision, Patagonia) use to anchor their
 * landing pages: motion + emotion before any text.
 *
 * - YouTube embed in nocookie mode; autoplay+mute+loop is the canonical
 *   recipe (loop needs the `playlist` param too, a YouTube quirk).
 * - controls/modestbranding/iv_load_policy/fs/disablekb stripped so the
 *   iframe reads as pure background, not a widget.
 * - playsinline=1 so iOS Safari plays inline instead of hijacking the
 *   screen to fullscreen.
 * - Iframe is oversized + centered so the 16:9 aspect always covers the
 *   viewport (YouTube logo + center bug get cropped out of frame).
 * - prefers-reduced-motion: skip the iframe entirely — the maxresdefault
 *   poster image stays visible underneath. Same composition, no motion.
 *
 * Phase 38.
 */
export default function HeroVideo({ videoId, posterAlt }: { videoId: string; posterAlt: string }) {
  const reduceMotion = useReducedMotion();
  const poster = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    controls: '0',
    modestbranding: '1',
    rel: '0',
    iv_load_policy: '3',
    disablekb: '1',
    fs: '0',
    playsinline: '1',
    cc_load_policy: '0',
  });

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Poster: shows during iframe load + as the reduced-motion fallback */}
      <img
        src={poster}
        alt={posterAlt}
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        decoding="async"
      />
      {!reduceMotion && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`}
          title="Operation Christmas Child story"
          // Oversize ~110% so any burned-in subtitles or YouTube branding
          // at the literal frame edges fall outside the visible viewport.
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: 'max(196vh, 110vw)',
            height: 'max(61.875vw, 110vh)',
          }}
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
        />
      )}
    </div>
  );
}
