/**
 * OCC Track brand lockup.
 *
 * Uses the official Operation Christmas Child logo (Samaritan's Purse
 * trademark) loaded from /public/images/occ-logo.png. The accompanying
 * wordmark just says "Track" — the logo already identifies the brand,
 * so "Track" identifies *this* product the way "[G] Drive" works.
 *
 * Asset provided by the SP brand team; the EPS lives in /Downloads/ and
 * was rasterized at 1200x1200 for retina-crisp small renders.
 */

const LOGO_SRC = '/images/occ-logo.png';

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

export default function Logo({ size = 28, withWordmark = true, variant = 'light', className = '' }: LogoProps) {
  const wordmarkColor = variant === 'dark' ? 'text-white' : 'text-ink';
  const kickerColor = variant === 'dark' ? 'text-white/60' : 'text-ink-light';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className={`text-[9px] font-bold uppercase tracking-[0.22em] ${kickerColor}`}>
            The Tracker for
          </span>
          <span className={`font-display text-lg font-medium tracking-tight ${wordmarkColor} mt-0.5`}>
            Collection Week
          </span>
        </span>
      )}
    </span>
  );
}

/** Just the badge — for navbar, footer, and tight spaces. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <img
      src={LOGO_SRC}
      width={size}
      height={size}
      alt="Operation Christmas Child — Samaritan's Purse"
      className="object-contain shrink-0"
      style={{ width: size, height: size }}
      loading="eager"
      decoding="async"
    />
  );
}
