import { motion } from 'framer-motion';

/**
 * Editorial heritage band — communicates the weight of the ministry behind
 * every metric on screen. Shown above national-view dashboards.
 *
 * Stats are public OCC numbers as of 2026:
 *   - Samaritan's Purse took over OCC in 1993
 *   - 220M+ shoebox gifts delivered cumulatively
 *   - 170+ countries
 *   - ~10M boxes per Collection Week
 */
const HERITAGE_STATS = [
  { label: 'Established', value: '1993', sub: 'In Jesus’ Name' },
  { label: 'Children Reached', value: '220M+', sub: 'across the world' },
  { label: 'Countries', value: '170+', sub: 'and territories' },
  { label: 'Boxes / Year', value: '10M+', sub: 'recent average' },
];

export default function HeritageStrip({ tone = 'cream' }: { tone?: 'cream' | 'dark' }) {
  const isDark = tone === 'dark';
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl overflow-hidden ${
        isDark ? 'bg-navy-dark text-white' : 'bg-bg-cream text-ink border border-border-warm'
      }`}
    >
      {/* Subtle warmth gradient */}
      <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-20' : 'opacity-40'}`}>
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-sp-red/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <div className="relative px-5 py-5 sm:py-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`h-px flex-1 ${isDark ? 'bg-white/15' : 'bg-border-warm'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isDark ? 'text-white/70' : 'text-sp-red'}`}>
            Operation Christmas Child
          </span>
          <span className={`h-px flex-1 ${isDark ? 'bg-white/15' : 'bg-border-warm'}`} />
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-2 sm:gap-x-6">
          {HERITAGE_STATS.map((stat, idx) => (
            <motion.li
              key={stat.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.07, duration: 0.4 }}
              className="text-center"
            >
              <span className={`block text-[10px] font-semibold uppercase tracking-[0.18em] mb-1 ${isDark ? 'text-white/50' : 'text-ink-light/70'}`}>
                {stat.label}
              </span>
              <span className={`font-display block text-3xl sm:text-4xl leading-none tabular-nums font-semibold ${isDark ? 'text-white' : 'text-ink'}`}>
                {stat.value}
              </span>
              <span className={`block text-[10px] mt-1 ${isDark ? 'text-white/50' : 'text-ink-light/70'}`}>
                {stat.sub}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
