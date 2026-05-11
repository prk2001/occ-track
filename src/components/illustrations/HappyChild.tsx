/**
 * Stylized SVG of a child holding a wrapped shoebox to their chest.
 * Deliberately abstract — no specific features, no skin tone — to feel
 * inclusive across the 170+ countries OCC serves.
 */
export default function HappyChild({ className = '', size = 140 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Soft warm halo */}
      <circle cx="100" cy="100" r="92" fill="#FCE3B5" opacity="0.35" />
      <circle cx="100" cy="100" r="72" fill="#FBF6EC" opacity="0.7" />

      {/* Body — simple silhouette */}
      <path
        d="M65 158 L65 130 Q65 110 80 110 L120 110 Q135 110 135 130 L135 158 Z"
        fill="#1A6B3C"
        opacity="0.95"
      />

      {/* The shoebox they're hugging — SP red ribbon */}
      <rect x="62" y="115" width="76" height="40" rx="3" fill="#FFFFFF" stroke="#C8102E" strokeWidth="2.5" />
      <rect x="62" y="115" width="76" height="5" fill="#C8102E" />
      <rect x="96" y="115" width="10" height="40" fill="#C8102E" />
      <rect x="62" y="132" width="76" height="5" fill="#FDE8EB" />

      {/* Arms wrapping the box */}
      <path d="M62 130 Q50 138 58 152 Q62 156 65 154" fill="#1A6B3C" stroke="#14522E" strokeWidth="1" opacity="0.95" />
      <path d="M138 130 Q150 138 142 152 Q138 156 135 154" fill="#1A6B3C" stroke="#14522E" strokeWidth="1" opacity="0.95" />

      {/* Head */}
      <circle cx="100" cy="80" r="28" fill="#D97706" opacity="0.92" />

      {/* Smile */}
      <path
        d="M88 85 Q100 95 112 85"
        stroke="#1A1714"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Eyes — closed/smiling */}
      <path d="M88 72 Q92 70 96 72" stroke="#1A1714" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M104 72 Q108 70 112 72" stroke="#1A1714" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Sparkle by the head */}
      <path
        d="M150 50 L152 56 L158 58 L152 60 L150 66 L148 60 L142 58 L148 56 Z"
        fill="#D97706"
        opacity="0.7"
      />
    </svg>
  );
}
