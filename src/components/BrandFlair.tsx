/**
 * Brand decorations — tasteful Christmas/children flair without going
 * "church craft fair." Used as background watermarks on hero surfaces,
 * empty states, and key transitions.
 *
 * Design principle: subtle by default. Each decoration\'s default opacity
 * is between 4-12% so it reads as texture, not decoration. Used heavier
 * (15-30%) for hero hold-pages and printable badges where the brand
 * needs to assert itself.
 */

interface DecorationProps {
  className?: string;
  opacity?: number;
}

// Subtle 8-point Christmas star — matches SP\'s "guiding star" iconography
// without going kitsch. Renders as inline SVG so it inherits currentColor.
export function ChristmasStar({ className = '', opacity = 0.12 }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`pointer-events-none ${className}`}
      style={{ opacity }}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2 L13.5 9.5 L21 8 L15 13 L17 21 L12 16.5 L7 21 L9 13 L3 8 L10.5 9.5 Z" />
    </svg>
  );
}

// Six-point snowflake. Pairs well with the green forest palette without
// pushing toward "Hallmark Channel."
export function Snowflake({ className = '', opacity = 0.08 }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`pointer-events-none ${className}`}
      style={{ opacity }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="3" y1="6.5" x2="21" y2="17.5" />
      <line x1="3" y1="17.5" x2="21" y2="6.5" />
      <path d="M9 4 L12 6 L15 4" />
      <path d="M9 20 L12 18 L15 20" />
      <path d="M4 10 L7 11 L7 14 L4 14" />
      <path d="M20 10 L17 11 L17 14 L20 14" />
    </svg>
  );
}

// Stylized wrapped gift — the literal shoebox shape OCC uses as its
// primary icon. Renders as a flat geometric shape, not a 3D illustration.
export function Shoebox({ className = '', opacity = 0.1 }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`pointer-events-none ${className}`}
      style={{ opacity }}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Box lid */}
      <rect x="3" y="6" width="18" height="3" rx="0.5" />
      {/* Box body */}
      <rect x="4" y="9" width="16" height="11" rx="0.5" />
      {/* Vertical ribbon */}
      <rect x="11" y="6" width="2" height="14" />
      {/* Horizontal ribbon */}
      <rect x="3" y="11" width="18" height="2" />
      {/* Bow loops */}
      <ellipse cx="9.5" cy="5" rx="2.5" ry="1.5" />
      <ellipse cx="14.5" cy="5" rx="2.5" ry="1.5" />
    </svg>
  );
}

// A heart with a small cross inside — SP\'s iconography is heart-forward
// ("Help in Jesus\' Name" is their tagline). Subtler than a bare cross.
export function HeartCross({ className = '', opacity = 0.1 }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`pointer-events-none ${className}`}
      fill="currentColor"
      aria-hidden="true"
      style={{ opacity }}
    >
      <path d="M12 21s-7-4.5-9.5-9C0.5 8.5 2 5 5.5 5c2 0 3.5 1 4.5 2.5C11 6 12.5 5 14.5 5 18 5 19.5 8.5 17 12c-2.5 4.5-5 9-5 9z" />
      <rect x="11.25" y="8.5" width="1.5" height="6" fill="white" opacity="0.85" />
      <rect x="9.5" y="10.5" width="5" height="1.5" fill="white" opacity="0.85" />
    </svg>
  );
}

// Layered watermark pattern — multiple decorations scattered as a
// repeating texture. Used on hero surfaces where a single icon would
// look forced but a soft pattern feels intentional.
export function ChristmasPattern({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <Snowflake className="absolute top-[8%] left-[12%] w-12 h-12 text-blue-accent" opacity={0.05} />
      <ChristmasStar className="absolute top-[14%] right-[18%] w-10 h-10 text-gold" opacity={0.08} />
      <Shoebox className="absolute bottom-[20%] left-[24%] w-14 h-14 text-sp-red" opacity={0.04} />
      <Snowflake className="absolute bottom-[12%] right-[10%] w-10 h-10 text-occ-green" opacity={0.06} />
      <ChristmasStar className="absolute top-[60%] left-[6%] w-8 h-8 text-sp-red" opacity={0.05} />
      <HeartCross className="absolute top-[40%] right-[42%] w-9 h-9 text-occ-green" opacity={0.04} />
    </div>
  );
}

// Trust strip — appears on hero sections to remind users this is an
// official SP property, not a phishing knockoff. Compact, refined.
export function TrustStrip({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const isDark = tone === 'dark';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.22em] ${
      isDark
        ? 'bg-white/10 text-white border border-white/15'
        : 'bg-bg-card border border-border-custom text-ink-light'
    }`}>
      <HeartCross className="w-3 h-3 text-sp-red" opacity={1} />
      <span>Samaritan\'s Purse · OCC</span>
      <span className="opacity-40">·</span>
      <span>Since 1993</span>
    </div>
  );
}
