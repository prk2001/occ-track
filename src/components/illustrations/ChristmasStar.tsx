/**
 * Bethlehem star illustration with a soft radial glow. Used as a decorative
 * accent on hero areas — references both Christmas and the OCC origin story.
 */
export default function ChristmasStar({ className = '', size = 80 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Soft glow */}
      <defs>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FCE3B5" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#FCE3B5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FCE3B5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#starGlow)" />

      {/* 5-point star */}
      <path
        d="M50 16 L57 38 L80 38 L62 52 L69 74 L50 60 L31 74 L38 52 L20 38 L43 38 Z"
        fill="#D97706"
        stroke="#A85D04"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Inner highlight */}
      <path
        d="M50 24 L54 36 L66 36 L56 44 L60 56 L50 48 Z"
        fill="#FCE3B5"
        opacity="0.55"
      />
    </svg>
  );
}
