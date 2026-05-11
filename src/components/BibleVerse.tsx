import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

interface Verse {
  text: string;
  reference: string;
}

const VERSES: Verse[] = [
  {
    text: 'Whatever you did for one of the least of these brothers and sisters of mine, you did for me.',
    reference: 'Matthew 25:40',
  },
  {
    text: 'Every good and perfect gift is from above, coming down from the Father of the heavenly lights.',
    reference: 'James 1:17',
  },
  {
    text: 'Give, and it will be given to you. A good measure, pressed down, shaken together and running over.',
    reference: 'Luke 6:38',
  },
  {
    text: 'How much more will your Father in heaven give good gifts to those who ask him!',
    reference: 'Matthew 7:11',
  },
  {
    text: 'Whoever is kind to the poor lends to the Lord, and he will reward them for what they have done.',
    reference: 'Proverbs 19:17',
  },
  {
    text: 'Let the little children come to me, and do not hinder them, for the kingdom of heaven belongs to such as these.',
    reference: 'Matthew 19:14',
  },
];

/**
 * Pull-quote Bible verse, rotating once per day so the same user sees the
 * same verse all day. Uses font-display italic with high SOFT axis for warm
 * editorial feel — pairs with HeritageStrip on national dashboards.
 */
export default function BibleVerse({ tone = 'cream' }: { tone?: 'cream' | 'dark' }) {
  // Pick verse based on the day of year so it's deterministic but varies daily.
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const verse = VERSES[dayOfYear % VERSES.length];
  const isDark = tone === 'dark';

  return (
    <motion.figure
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl px-6 py-7 sm:px-8 sm:py-8 overflow-hidden ${
        isDark
          ? 'bg-white/[0.03] border border-white/10'
          : 'bg-bg-warm border border-border-warm'
      }`}
    >
      <Quote className={`absolute top-4 left-4 w-6 h-6 ${isDark ? 'text-sp-red/40' : 'text-sp-red/30'}`} aria-hidden="true" />
      <blockquote className="relative pl-6">
        <p
          className={`font-display-italic text-lg sm:text-xl leading-[1.4] ${
            isDark ? 'text-white/90' : 'text-ink'
          }`}
        >
          &ldquo;{verse.text}&rdquo;
        </p>
        <figcaption className="mt-4 flex items-center gap-2">
          <span className={`h-px w-6 ${isDark ? 'bg-white/30' : 'bg-sp-red'}`} aria-hidden="true" />
          <cite className={`text-[11px] font-semibold uppercase tracking-[0.18em] not-italic ${
            isDark ? 'text-white/70' : 'text-sp-red'
          }`}>
            {verse.reference}
          </cite>
        </figcaption>
      </blockquote>
    </motion.figure>
  );
}
