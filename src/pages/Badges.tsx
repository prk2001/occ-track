import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Printer, ArrowLeft, Lock, Sparkles } from 'lucide-react';
import Layout from '@/components/Layout';
import { Mark } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  DEFAULT_CDO_ID,
  getLocationById,
  signupInScopeForUser,
} from '@/data/mockData';
import type { StoredSignup } from '@/data/mockData';
import { logAuditEvent } from '@/lib/auditLog';

/**
 * Volunteer name-tag printout — Avery 5390 (8 per page, 3⅜" × 2⅓").
 *
 * Real CDO leaders pre-print badges the day before so the welcome table
 * isn't writing names with Sharpies at 8 AM. This page renders the
 * in-scope signup list as a print-ready sheet, plus an on-screen preview.
 *
 * Auto-fires window.print() if ?print=1 is in the URL so admins can
 * deep-link "Print badges now" from the /signups page.
 *
 * Privacy: gated to leadership (isRegionalAdmin). Lower roles see the
 * standard lock screen.
 */
export default function Badges() {
  const { user, isRegionalAdmin } = useAuth();
  const [signups] = useLocalStorage<StoredSignup[]>('occ:signups', []);
  const [printed, setPrinted] = useState(false);
  const fired = useRef(false);

  const scopedSignups = useMemo(
    () => signups.filter((s) => signupInScopeForUser(user, s)),
    [signups, user],
  );

  // Sort A→Z by name so the printout matches the welcome-table sign-in sheet.
  const sorted = useMemo(
    () => [...scopedSignups].sort((a, b) => a.name.localeCompare(b.name)),
    [scopedSignups],
  );

  // Auto-print if ?print=1 query param is set. Useful for "Print badges now"
  // deep links from /signups that should bypass the preview step.
  useEffect(() => {
    if (typeof window === 'undefined' || fired.current) return;
    const auto = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('print');
    if (auto === '1' && sorted.length > 0 && isRegionalAdmin) {
      fired.current = true;
      // Slight delay so the DOM has time to render before the print dialog
      // captures the screenshot.
      setTimeout(() => {
        window.print();
        setPrinted(true);
        if (user) {
          logAuditEvent(
            { id: user.id, name: user.name, role: user.role },
            'print_roster',
            'badges',
            `Auto-printed ${sorted.length} volunteer badges`,
          );
        }
      }, 300);
    }
  }, [sorted.length, isRegionalAdmin, user]);

  function printNow() {
    window.print();
    setPrinted(true);
    if (user) {
      logAuditEvent(
        { id: user.id, name: user.name, role: user.role },
        'print_roster',
        'badges',
        `Printed ${sorted.length} volunteer badges`,
      );
    }
  }

  if (!isRegionalAdmin) {
    return (
      <Layout>
        <div className="px-4 py-12 max-w-2xl mx-auto">
          <div className="bg-bg-card rounded-2xl border border-border-custom p-8 text-center">
            <Lock className="w-10 h-10 text-sp-red mx-auto mb-3" />
            <h1 className="font-display text-2xl text-ink">Leadership only.</h1>
            <p className="text-sm text-ink-light mt-2 italic max-w-md mx-auto">
              Printable badges include volunteer names. Access is restricted to
              Super Admin, SP Admin, and Regional Admin.
            </p>
            <Link
              to="/"
              className="inline-flex h-11 px-5 mt-6 bg-sp-red text-white text-sm font-semibold rounded-xl items-center justify-center hover:bg-sp-red-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4 max-w-5xl mx-auto pb-24">
        {/* Print-mode-only stylesheet — embedded so we don't have to ship
            a separate CSS file. Overrides the on-screen preview chrome
            to be invisible during printing, sizes badges to Avery 5390. */}
        <style>{`
          @media print {
            @page { size: letter; margin: 0.5in 0.75in; }
            .badges-chrome { display: none !important; }
            .badge-sheet {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 0 !important;
              page-break-inside: auto;
            }
            .badge-card {
              width: 3.375in !important;
              height: 2.333in !important;
              border: 1px dashed #ccc !important;
              box-shadow: none !important;
              break-inside: avoid;
              padding: 0.2in !important;
              background: white !important;
            }
            .badge-card .badge-name { font-size: 28pt !important; }
            .badge-card .badge-firstname { font-size: 18pt !important; }
            body { background: white !important; }
          }
        `}</style>

        {/* On-screen chrome — hidden during print */}
        <div className="badges-chrome space-y-4 mb-6">
          <header className="flex items-start justify-between gap-3">
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Welcome Table Badges
              </p>
              <h1 className="font-display text-3xl sm:text-4xl text-ink leading-[1.05] tracking-tight">
                Pre-print the team.
                <span className="font-display-italic block text-sp-red mt-1">
                  {sorted.length} {sorted.length === 1 ? 'badge' : 'badges'} ready.
                </span>
              </h1>
              <p className="text-sm text-ink-light italic">
                Avery 5390 stock · 8 per page · 3⅜&quot; × 2⅓&quot;. Load badge paper,
                print, peel, stick.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <Link
                to="/signups"
                className="h-10 px-3 bg-bg-card border border-border-custom hover:border-sp-red hover:text-sp-red text-ink-light text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all"
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </Link>
              <button
                onClick={printNow}
                disabled={sorted.length === 0}
                className="h-10 px-4 bg-occ-green hover:bg-occ-green-dark text-white text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-colors disabled:opacity-40"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          </header>

          {printed && (
            <div className="bg-occ-green-light border border-occ-green rounded-xl px-4 py-3 text-sm text-occ-green-dark font-semibold flex items-center gap-2">
              ✓ Print dialog opened. If nothing printed, check the dialog window.
            </div>
          )}
        </div>

        {/* Badge sheet — visible on screen as a preview, prints to Avery layout */}
        {sorted.length === 0 ? (
          <div className="badges-chrome bg-bg-card rounded-2xl border border-border-custom p-10 text-center">
            <Printer className="w-10 h-10 text-ink-light/40 mx-auto mb-3" />
            <p className="font-display text-base text-ink mb-1">No signups in scope.</p>
            <p className="text-xs text-ink-light italic max-w-sm mx-auto">
              Badges print once volunteers sign up. When they do, come back here
              the day before Collection Week and pre-print the welcome table.
            </p>
          </div>
        ) : (
          <div className="badge-sheet grid grid-cols-2 sm:grid-cols-2 gap-3">
            {sorted.map((s) => (
              <BadgeCard key={s.id} signup={s} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─── Single badge ─────────────────────────────────────────────────────────
function BadgeCard({ signup }: { signup: StoredSignup }) {
  const cdo = getLocationById(signup.locationId ?? DEFAULT_CDO_ID);
  const firstName = signup.name.split(' ')[0];
  return (
    <div className="badge-card bg-white border border-border-custom rounded-xl p-6 flex flex-col justify-between min-h-[200px] shadow-card-elevated">
      {/* Header — branding strip */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mark size={20} />
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sp-red">
            Operation Christmas Child
          </p>
        </div>
        {signup.firstTime && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-lime-dark bg-lime-light px-1.5 py-0.5 rounded">
            1st
          </span>
        )}
      </div>

      {/* Name — the big visual element. First name on its own line so it
          reads from across the room; full name below it. */}
      <div className="flex-1 flex flex-col justify-center text-center my-2 -my-2">
        <p className="badge-firstname font-display text-2xl text-sp-red leading-tight">
          {firstName}
        </p>
        <p className="badge-name font-display text-base text-ink leading-tight mt-0.5">
          {signup.name}
        </p>
      </div>

      {/* Footer — role placeholder + CDO */}
      <div className="flex items-end justify-between gap-2 text-[9px] text-ink-light">
        <div>
          <p className="font-bold uppercase tracking-wider">Volunteer</p>
          <p className="italic">{cdo?.name ?? 'OCC'}</p>
        </div>
        <p className="font-mono text-[8px] uppercase tracking-wider text-ink-light/40">
          {cdo?.city ?? ''}
        </p>
      </div>
    </div>
  );
}
