import { Languages } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Language toggle — pair of segmented buttons (EN | ES).
 * Variant: 'navbar' (compact pill) | 'hero' (larger, more visible).
 *
 * Persistence + auto-detect handled by I18nProvider — this is just the
 * UI control. Re-renders the whole app when the locale changes via the
 * context's state.
 */
export default function LanguageToggle({
  variant = 'navbar',
}: {
  variant?: 'navbar' | 'hero';
}) {
  const { locale, setLocale } = useTranslation();

  if (variant === 'hero') {
    return (
      <div className="inline-flex items-center gap-1 bg-bg-card border border-border-custom rounded-full p-1 shadow-card">
        <button
          onClick={() => setLocale('en')}
          className={`h-8 px-4 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
            locale === 'en' ? 'bg-sp-red text-white' : 'text-ink-light hover:text-ink'
          }`}
          aria-pressed={locale === 'en'}
        >
          English
        </button>
        <button
          onClick={() => setLocale('es')}
          className={`h-8 px-4 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
            locale === 'es' ? 'bg-sp-red text-white' : 'text-ink-light hover:text-ink'
          }`}
          aria-pressed={locale === 'es'}
        >
          Español
        </button>
      </div>
    );
  }

  // Compact navbar variant: a single button that toggles to the other locale.
  const isEn = locale === 'en';
  return (
    <button
      onClick={() => setLocale(isEn ? 'es' : 'en')}
      className="touch-target flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-navy hover:text-sp-red transition-colors"
      aria-label={isEn ? 'Switch to Spanish' : 'Cambiar a inglés'}
      title={isEn ? 'Español' : 'English'}
    >
      <Languages className="w-4 h-4" />
      <span className="hidden sm:inline">{isEn ? 'ES' : 'EN'}</span>
    </button>
  );
}
