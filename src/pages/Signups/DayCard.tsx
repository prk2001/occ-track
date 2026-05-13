import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarOff, Lock, Pencil, Unlock } from 'lucide-react';
import { COLLECTION_DAYS } from '@/data/mockData';
import type { DayBlock } from '@/data/mockData';

/**
 * One day-cell in the Collection Week schedule grid on /signups.
 *
 * Three states:
 *   - Open for signups (default, green)
 *   - Blocked / covered by a group (gold)
 *   - Past (greyed out, no-op buttons)
 *
 * Plus an inline edit mode for the shift hours below the date.
 */
export function DayCard({
  day, time, block, isToday, isPast, isEditingTime,
  onBlock, onReopen, onStartEditTime, onSaveTime, onCancelEditTime,
}: {
  day: typeof COLLECTION_DAYS[number];
  time: string;
  block?: DayBlock;
  isToday: boolean;
  isPast: boolean;
  isEditingTime: boolean;
  onBlock: () => void;
  onReopen: () => void;
  onStartEditTime: () => void;
  onSaveTime: (value: string) => void;
  onCancelEditTime: () => void;
}) {
  const blocked = !!block;
  const [draftTime, setDraftTime] = useState(time);
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className={`relative bg-bg-card rounded-2xl border p-4 transition-all ${
        blocked ? 'border-gold/40 bg-gold-light/30'
          : isToday ? 'border-sp-red/40'
          : 'border-border-custom hover:border-occ-green/40'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light">
            {day.weekday}
          </p>
          <p className="font-display text-3xl text-ink tabular-nums leading-none mt-0.5">
            {day.monthDay}
          </p>
          <p className="text-[10px] text-ink-light mt-0.5 font-medium">Nov 2026</p>
        </div>
        {isToday && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-sp-red bg-white px-2 py-0.5 rounded-full border border-sp-red flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sp-red animate-pulse-live" />
            Today
          </span>
        )}
        {isPast && !isToday && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink-light/60">
            Past
          </span>
        )}
      </div>

      {isEditingTime ? (
        <div className="mb-3 flex items-center gap-1.5">
          <input
            autoFocus
            value={draftTime}
            onChange={(e) => setDraftTime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveTime(draftTime);
              if (e.key === 'Escape') onCancelEditTime();
            }}
            placeholder="e.g. 9 AM – 12 Noon"
            className="flex-1 h-8 px-2 text-xs tabular-nums bg-bg-primary border border-sp-red rounded-lg focus:outline-none text-ink"
          />
          <button
            onClick={() => onSaveTime(draftTime)}
            className="px-2 h-8 bg-occ-green text-white text-[10px] font-bold rounded-lg uppercase tracking-wider"
          >Save</button>
          <button
            onClick={onCancelEditTime}
            className="px-2 h-8 text-[10px] font-bold text-ink-light uppercase tracking-wider"
          >Cancel</button>
        </div>
      ) : (
        <button
          onClick={onStartEditTime}
          disabled={isPast}
          className="text-xs text-ink-light tabular-nums mb-3 hover:text-sp-red transition-colors flex items-center gap-1 group disabled:hover:text-ink-light disabled:cursor-default"
        >
          <span>{time}</span>
          {!isPast && (
            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      )}

      {blocked ? (
        <>
          <div className="bg-white rounded-xl border border-gold/30 px-3 py-2 mb-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gold mb-0.5 flex items-center gap-1">
              <CalendarOff className="w-2.5 h-2.5" />
              Covered by
            </p>
            <p className="text-sm font-semibold text-ink leading-tight">{block.coveredBy}</p>
            {block.note && (
              <p className="text-[10px] text-ink-light italic mt-1">{block.note}</p>
            )}
          </div>
          <button
            onClick={onReopen}
            disabled={isPast}
            className="w-full h-9 text-xs font-semibold text-gold hover:text-sp-red flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Unlock className="w-3 h-3" />
            Reopen this day
          </button>
        </>
      ) : (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider text-occ-green mb-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-occ-green" />
            Open for signups
          </p>
          <button
            onClick={onBlock}
            disabled={isPast}
            className="w-full h-9 bg-bg-primary border border-border-custom text-ink text-xs font-semibold rounded-lg hover:bg-gold-light hover:border-gold hover:text-gold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock className="w-3 h-3" />
            Block out this day
          </button>
        </>
      )}
    </motion.div>
  );
}
