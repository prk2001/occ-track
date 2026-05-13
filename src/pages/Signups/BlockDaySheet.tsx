import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Lock, MessageCircle, Users, X } from 'lucide-react';
import { COLLECTION_DAYS } from '@/data/mockData';
import { useFocusTrap } from '@/hooks/useFocusTrap';

// ─── Block-day bottom sheet ─────────────────────────────────────────────────
function BlockDaySheet({
  date, time, onCancel, onSave,
}: {
  date: string;
  time: string;
  onCancel: () => void;
  onSave: (coveredBy: string, note: string) => void;
}) {
  const [coveredBy, setCoveredBy] = useState('');
  const [note, setNote] = useState('');
  const day = COLLECTION_DAYS.find((d) => d.date === date);
  const canSave = coveredBy.trim().length > 0;
  // Phase 35d: trap focus inside the bottom sheet.
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-navy/50 z-50"
        onClick={onCancel}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card rounded-t-3xl shadow-card-elevated max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-day-title"
        ref={trapRef}
      >
        <div className="sticky top-0 bg-bg-card border-b border-border-custom px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <p id="block-day-title" className="text-[10px] font-bold uppercase tracking-wider text-sp-red">Block out this day</p>
            <p className="font-display text-xl text-ink leading-none mt-1">
              {day?.weekday}, Nov {day?.monthDay}
            </p>
            <p className="text-[11px] text-ink-light tabular-nums mt-0.5">{time}</p>
          </div>
          <button onClick={onCancel} className="touch-target text-ink-light hover:text-sp-red" aria-label="Cancel">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gold-light rounded-xl p-3 flex items-start gap-2 text-xs text-ink">
            <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p>
              Blocking a day means it's <strong>already covered</strong> by a group, so individual
              volunteers won't be needed. They can still sign up for other days.
            </p>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-ink-light uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Who's covering this day? <span className="text-sp-red">*</span>
            </span>
            <input
              autoFocus
              value={coveredBy}
              onChange={(e) => setCoveredBy(e.target.value)}
              placeholder="e.g. First Baptist Youth Group"
              className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold text-ink-light uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MessageCircle className="w-3 h-3" /> Note (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 12 students + 3 chaperones"
              className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors"
            />
          </label>

          <button
            onClick={() => canSave && onSave(coveredBy, note)}
            disabled={!canSave}
            className="w-full h-14 bg-lime hover:bg-lime-dark transition-colors text-occ-green-dark hover:text-white text-base font-display rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-card"
          >
            <Lock className="w-4 h-4" />
            Block out {day?.weekday} Nov {day?.monthDay}
          </button>
        </div>
      </motion.div>
    </>
  );
}


export { BlockDaySheet };
