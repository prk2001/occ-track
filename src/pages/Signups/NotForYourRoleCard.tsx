import { Link } from 'react-router';
import { ClipboardList } from 'lucide-react';

// ─── Role gate explainer ────────────────────────────────────────────────────
function NotForYourRoleCard({ role }: { role: string | null }) {
  const backTo =
    role === 'greeter' ? '/checkin'
    : role === 'do_leader' ? '/totals'
    : role === 'cdo_leader' ? '/'
    : '/';
  const backLabel =
    role === 'greeter' ? 'Back to Check-In'
    : role === 'do_leader' ? 'Back to My Totals'
    : 'Back to Dashboard';
  return (
    <div className="bg-bg-card rounded-2xl border border-border-custom overflow-hidden">
      <div className="bg-gradient-to-br from-sp-red-light to-bg-primary px-5 py-4 flex items-center gap-3 border-b border-border-custom">
        <ClipboardList className="w-6 h-6 text-sp-red" />
        <div>
          <h2 className="font-display text-base text-ink">Volunteer information is private.</h2>
          <p className="text-[11px] text-ink-light mt-0.5 italic">Restricted to Samaritan's Purse leadership.</p>
        </div>
      </div>
      <div className="p-5 space-y-3 text-sm text-ink-light leading-relaxed">
        <p>
          Individual volunteer contact information — names, phone numbers, emails,
          emergency contacts — is only visible to <strong className="text-ink">Super
          Admin, SP Admin, and Regional Admin</strong> roles. This protects the
          privacy of everyone who signs up to serve.
        </p>
        <p>
          If you need to coordinate volunteers for your location, contact your
          Regional Office. They'll route the right names to your team.
        </p>
        <div className="pt-1">
          <Link
            to={backTo}
            className="inline-flex h-11 px-5 bg-sp-red text-white text-sm font-semibold rounded-xl items-center justify-center hover:bg-sp-red-dark transition-colors"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}



export { NotForYourRoleCard };
