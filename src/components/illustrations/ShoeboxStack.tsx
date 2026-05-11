/**
 * Warm hand-drawn-feel SVG illustration of a stack of wrapped shoeboxes.
 * Pure SVG so it scales to any size + tints with currentColor.
 */
export default function ShoeboxStack({ className = '', size = 120 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Soft shadow under the stack */}
      <ellipse cx="80" cy="140" rx="50" ry="5" fill="#1A1714" opacity="0.08" />

      {/* Bottom box — gold */}
      <g>
        <rect x="20" y="92" width="120" height="40" rx="4" fill="#FBF6EC" stroke="#D97706" strokeWidth="2" />
        <rect x="20" y="92" width="120" height="6" fill="#D97706" />
        <rect x="70" y="92" width="20" height="40" fill="#D97706" />
        <rect x="20" y="106" width="120" height="6" fill="#FCE3B5" />
      </g>

      {/* Middle box — SP red */}
      <g>
        <rect x="28" y="60" width="104" height="34" rx="4" fill="#FFFFFF" stroke="#C8102E" strokeWidth="2" />
        <rect x="28" y="60" width="104" height="5" fill="#C8102E" />
        <rect x="70" y="60" width="20" height="34" fill="#C8102E" />
      </g>

      {/* Top box — OCC green */}
      <g>
        <rect x="38" y="32" width="84" height="30" rx="4" fill="#E6F5EC" stroke="#1A6B3C" strokeWidth="2" />
        <rect x="38" y="32" width="84" height="5" fill="#1A6B3C" />
        <rect x="70" y="32" width="20" height="30" fill="#1A6B3C" />
      </g>

      {/* Ribbon bow on top */}
      <g>
        <path d="M70 32 Q60 18 64 22 Q76 18 80 32" stroke="#1A6B3C" strokeWidth="3" fill="#E6F5EC" strokeLinejoin="round" />
        <path d="M90 32 Q100 18 96 22 Q84 18 80 32" stroke="#1A6B3C" strokeWidth="3" fill="#E6F5EC" strokeLinejoin="round" />
        <circle cx="80" cy="30" r="3" fill="#1A6B3C" />
      </g>

      {/* Star above */}
      <path
        d="M80 5 L82.2 11 L88 11.4 L83.5 14.5 L85 20 L80 17 L75 20 L76.5 14.5 L72 11.4 L77.8 11 Z"
        fill="#D97706"
        opacity="0.9"
      />
    </svg>
  );
}
