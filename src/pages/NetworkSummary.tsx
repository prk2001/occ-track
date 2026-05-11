import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet, Send, CheckCircle2, AlertTriangle, Equal,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  BOLS,
  getLocationById,
  getDropoffsForCDO,
  getShoeboxesForLocation,
  formatCount,
} from '@/data/mockData';

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// The Network Summary belongs to a Central Drop-off. For roles without a CDO
// (Greeter, Super Admin), default to the demo CDO so the page always renders.
function pickCdo(userLocationId: string | undefined): string {
  if (userLocationId) {
    const loc = getLocationById(userLocationId);
    if (loc?.type === 'central') return userLocationId;
    if (loc?.centralDropoffId) return loc.centralDropoffId;
  }
  return 'cdo1';
}

export default function NetworkSummary() {
  const { user } = useAuth();
  const cdoId = pickCdo(user?.locationId);
  const cdo = getLocationById(cdoId)!;
  const dropoffs = useMemo(() => getDropoffsForCDO(cdoId), [cdoId]);

  // Boost raw seed counts with synthetic context so the demo shows
  // non-trivial closure-packet numbers mid-week.
  const cdoTotal = useMemo(() => getShoeboxesForLocation(cdoId) + 412, [cdoId]);
  const dropoffTotals = useMemo(
    () => dropoffs.map((d, i) => ({
      location: d,
      total: getShoeboxesForLocation(d.id) + [128, 96, 64, 48, 32][i % 5],
    })),
    [dropoffs],
  );

  const grandTotal = cdoTotal + dropoffTotals.reduce((s, d) => s + d.total, 0);
  const bolTotal = useMemo(
    () => BOLS.filter((b) => b.locationId === cdoId).reduce((s, b) => s + b.totalBoxes, 0),
    [cdoId],
  );
  const discrepancy = grandTotal - bolTotal;

  const animatedTotal = useCountUp(grandTotal);

  const [signature, setSignature] = useLocalStorage('occ:summary-signature', '');
  const [submission, setSubmission] = useLocalStorage<{ at: string; sig: string } | null>('occ:summary-submission', null);

  const canSubmit = signature.trim().length >= 3 && !submission;

  return (
    <Layout>
      <div className="px-4 py-4 max-w-4xl mx-auto space-y-6 pb-24">
        {/* Editorial hero */}
        <header className="space-y-2 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">
            Collection Network Summary · Closure Packet
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink leading-tight tracking-tight">
            {cdo.name}
            <span className="font-display-italic text-ink-light/70 block text-xl sm:text-2xl mt-1">
              {cdo.city}, {cdo.state} · {dropoffs.length} feeding drop-{dropoffs.length === 1 ? 'off' : 'offs'}
            </span>
          </h1>
        </header>

        {/* Grand Total hero */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative bg-bg-card rounded-2xl shadow-card border border-border-warm p-7 overflow-hidden"
        >
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-sp-red/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-occ-green/5 blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink-light mb-2">Network Grand Total</p>
            <p className="font-display text-[clamp(3rem,11vw,5.5rem)] font-medium text-ink tabular-nums leading-none">
              {animatedTotal.toLocaleString()}
            </p>
            <p className="text-sm text-ink-light mt-3 italic">
              shoeboxes collected across this Central&apos;s network this Collection Week.
            </p>
          </div>
        </motion.section>

        {/* Breakdown table */}
        <section className="bg-bg-card rounded-2xl shadow-card border border-border-custom overflow-hidden">
          <header className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-ink">Breakdown</h2>
            <p className="text-[10px] uppercase tracking-wider text-ink-light">Central + feeding drop-offs</p>
          </header>
          <div className="px-2 pb-4">
            <BreakdownRow
              label={cdo.name}
              sub="Central Drop-off (this location)"
              total={cdoTotal}
              tone="central"
            />
            {dropoffTotals.length === 0 && (
              <p className="text-sm text-ink-light/70 italic text-center py-4">
                No feeding drop-offs reported for this Central.
              </p>
            )}
            {dropoffTotals.map((d) => (
              <BreakdownRow
                key={d.location.id}
                label={d.location.name}
                sub={`${d.location.city}, ${d.location.state}`}
                total={d.total}
                tone="dropoff"
              />
            ))}
            <BreakdownRow label="Grand Total" sub="To be submitted to Regional Office" total={grandTotal} tone="total" />
          </div>
        </section>

        {/* BOL Comparison */}
        <section className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5">
          <h2 className="font-display text-lg font-medium text-ink mb-1">BOL Reconciliation</h2>
          <p className="text-xs text-ink-light mb-4">Network total compared to Bills of Lading recorded for this Central.</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <CompareTile label="Network total" value={grandTotal} color="text-occ-green" bg="bg-occ-green-light" />
            <CompareTile label="BOL grand total" value={bolTotal} color="text-blue-accent" bg="bg-blue-light" />
          </div>
          <DiscrepancyRow discrepancy={discrepancy} />
        </section>

        {/* Submit closure packet */}
        <section className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-sp-red" />
            <h2 className="font-display text-lg font-medium text-ink">Submit Closure Packet</h2>
          </div>
          <p className="text-sm text-ink-light leading-relaxed">
            By submitting, the Central Drop-off Leader certifies these totals reflect what was
            collected and transported during Collection Week 2026. The packet is routed to the
            Regional Office.
          </p>
          {!submission ? (
            <>
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider mb-1 block">
                  Digital Signature
                </span>
                <input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your full name"
                  className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base font-display-italic text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors"
                />
              </label>
              <button
                onClick={() => canSubmit && setSubmission({ at: new Date().toISOString(), sig: signature.trim() })}
                disabled={!canSubmit}
                className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-card"
              >
                <Send className="w-5 h-5" />
                Submit to Regional Office
              </button>
            </>
          ) : (
            <div className="bg-occ-green-light border border-occ-green/30 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-occ-green shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-occ-green">Closure packet submitted</p>
                <p className="text-[11px] text-occ-green/80 mt-0.5">
                  Signed <span className="font-display-italic">{submission.sig}</span> · {new Date(submission.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <button
                  onClick={() => { setSubmission(null); setSignature(''); }}
                  className="text-[11px] underline text-occ-green/80 hover:text-occ-green mt-1"
                >
                  Resubmit
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function BreakdownRow({ label, sub, total, tone }: { label: string; sub?: string; total: number; tone: 'central' | 'dropoff' | 'total' }) {
  const isTotal = tone === 'total';
  const isCentral = tone === 'central';
  return (
    <div className={`flex items-center gap-3 px-3 py-3 ${
      isTotal
        ? 'bg-bg-cream/80 border-t-2 border-sp-red rounded-xl mt-2 font-semibold'
        : isCentral
        ? 'bg-sp-red-light/50 rounded-xl'
        : 'border-b border-border-custom/60 last:border-0'
    }`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isTotal ? 'font-bold text-ink' : 'font-medium text-ink'}`}>{label}</p>
        {sub && <p className="text-[10px] text-ink-light truncate">{sub}</p>}
      </div>
      <p className={`font-display tabular-nums leading-none ${isTotal ? 'text-3xl font-medium text-sp-red' : 'text-xl font-medium text-ink'}`}>
        {total.toLocaleString()}
      </p>
    </div>
  );
}

function CompareTile({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-4`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${color} mb-1`}>{label}</p>
      <p className={`font-display text-3xl font-medium tabular-nums leading-none ${color}`}>{formatCount(value)}</p>
    </div>
  );
}

function DiscrepancyRow({ discrepancy }: { discrepancy: number }) {
  if (discrepancy === 0) {
    return (
      <div className="flex items-center gap-3 bg-occ-green-light border border-occ-green/20 rounded-xl px-4 py-3">
        <Equal className="w-5 h-5 text-occ-green shrink-0" />
        <p className="text-sm font-medium text-occ-green">Totals match exactly. Ready to submit.</p>
      </div>
    );
  }
  const isPositive = discrepancy > 0;
  return (
    <div className="flex items-start gap-3 bg-gold-light border border-gold/30 rounded-xl px-4 py-3">
      <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-gold">
          Discrepancy of <span className="tabular-nums">{Math.abs(discrepancy).toLocaleString()}</span> boxes
        </p>
        <p className="text-[12px] text-ink-light mt-0.5 leading-relaxed">
          Network total is {isPositive ? 'higher than' : 'lower than'} BOL total. This usually means cartons are still being packed or a BOL is still in draft. Document before submission.
        </p>
      </div>
    </div>
  );
}
