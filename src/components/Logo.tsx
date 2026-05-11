/**
 * OCC Track brand mark — stylized for prototype use.
 *
 * Recognizably evokes the Samaritan's Purse / Operation Christmas Child identity
 * (red shoebox with white cross) without copying any trademarked SP/OCC asset.
 * If this app ships for real, the SP brand team supplies the official logo files
 * which would replace this SVG.
 */

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

export default function Logo({ size = 28, withWordmark = true, variant = 'light', className = '' }: LogoProps) {
  const text = variant === 'dark' ? 'text-white' : 'text-navy';
  const sub = variant === 'dark' ? 'text-white/60' : 'text-slate';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={size} />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-red">OCC</span>
          <span className={`text-base font-bold tracking-tight ${text}`}>Track</span>
          <span className={`text-[9px] font-medium uppercase tracking-wider mt-0.5 ${sub}`}>Samaritan&apos;s Purse</span>
        </span>
      )}
    </span>
  );
}

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OCC Track"
      role="img"
    >
      <rect x="3" y="11" width="34" height="26" rx="4" fill="#C8102E" />
      <rect x="3" y="11" width="34" height="3" fill="#A00D24" />
      <rect x="17" y="11" width="6" height="26" fill="#FFFFFF" />
      <rect x="3" y="20" width="34" height="4" fill="#FFFFFF" />
      <path
        d="M20 2.5 L21.6 7 L26 7.4 L22.5 10.2 L23.8 14.5 L20 12 L16.2 14.5 L17.5 10.2 L14 7.4 L18.4 7 Z"
        fill="#C8102E"
        stroke="#A00D24"
        strokeWidth="0.5"
      />
    </svg>
  );
}
