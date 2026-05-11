/**
 * Personal greeting that names the user and acknowledges the time of day.
 * Replaces impersonal hero copy on dashboards with something that *feels*
 * like the app knows who you are.
 */
interface WarmGreetingProps {
  name?: string;
  subtitle?: string;
  className?: string;
}

function timeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

export default function WarmGreeting({ name, subtitle, className = '' }: WarmGreetingProps) {
  const period = timeOfDay();
  const firstName = name?.split(' ')[0];
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2">
        {period === 'morning' && 'Good morning'}
        {period === 'afternoon' && 'Good afternoon'}
        {period === 'evening' && 'Good evening'}
        {period === 'night' && 'Late shift'}
        {firstName ? `, ${firstName}` : ''}
      </p>
      {subtitle && (
        <p className="font-display-italic text-base text-ink-light leading-snug">{subtitle}</p>
      )}
    </div>
  );
}
