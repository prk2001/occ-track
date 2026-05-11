import { Heart } from 'lucide-react';

/**
 * Reframes a raw box count as a story about children. Every "X boxes" reference
 * paired with this becomes "X children will know they're loved this Christmas."
 * Lightweight + opinionated — drop it under a big number anywhere on the app.
 */
interface ImpactCalloutProps {
  count: number;
  /** Override the default reframing. */
  reframe?: string;
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg';
  /** Show the heart icon. */
  withIcon?: boolean;
  /** Dark variant for navy backgrounds. */
  dark?: boolean;
  className?: string;
}

function defaultReframe(count: number): string {
  if (count === 0) return 'Every box is a child waiting to be reached.';
  if (count === 1) return 'One child. One Christmas. One story changed.';
  if (count < 50) return `${count} children will know they're loved this Christmas.`;
  if (count < 1000) return `${count} children — each one with a story Jesus came to write.`;
  if (count < 100_000) return `${count.toLocaleString()} smiles already wrapped for Christmas morning.`;
  if (count < 1_000_000) return `${count.toLocaleString()} kids in 170+ countries will hear, “Jesus loves you.”`;
  return `${count.toLocaleString()} children — that's a whole generation Christmas is reaching.`;
}

export default function ImpactCallout({
  count, reframe, size = 'md', withIcon = true, dark = false, className = '',
}: ImpactCalloutProps) {
  const text = reframe ?? defaultReframe(count);
  const sizeCls =
    size === 'lg' ? 'text-base sm:text-lg leading-relaxed'
    : size === 'sm' ? 'text-xs leading-snug'
    : 'text-sm leading-relaxed';
  const color = dark ? 'text-white/85' : 'text-ink-light';
  return (
    <p className={`${sizeCls} ${color} ${className} font-display-italic flex items-start gap-1.5`}>
      {withIcon && (
        <Heart className={`w-3.5 h-3.5 mt-1 shrink-0 ${dark ? 'text-sp-red/80' : 'text-sp-red'}`} fill="currentColor" />
      )}
      <span>{text}</span>
    </p>
  );
}
