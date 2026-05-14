import { motion } from 'framer-motion';

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
      className={
        isDark
          ? 'relative px-2 sm:px-4 py-2 text-center'
          : 'relative px-4 sm:px-6 py-2 text-center'
      }
    >
      {/* Big editorial open-quote — set in Fraunces, hangs above the
          quote like a New Yorker pull-quote. No card, no shadow — the
          quote IS the design. */}
      <span
        aria-hidden="true"
        className={`font-display block text-[80px] leading-[0.6] mb-1 ${
          isDark ? 'text-occ-green/35' : 'text-sp-red/30'
        }`}
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
      >
        &ldquo;
      </span>
      <blockquote>
        <p
          className={`font-display-italic text-[20px] sm:text-[24px] leading-[1.45] max-w-xl mx-auto ${
            isDark ? 'text-white/90' : 'text-ink'
          }`}
        >
          {verse.text}
        </p>
        <figcaption className={`font-mast text-[10px] mt-5 ${isDark ? 'text-white/70' : 'text-ink-light'}`}>
          <cite className="not-italic">&mdash; {verse.reference}</cite>
        </figcaption>
      </blockquote>
    </motion.figure>
  );
}
