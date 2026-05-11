import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Search, CheckCircle2, Circle, Phone, Mail, Award, Calendar, QrCode,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Layout from '@/components/Layout';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  VOLUNTEERS,
  VOLUNTEER_ROLE_CONFIG,
  getLocationById,
} from '@/data/mockData';
import type { Volunteer, VolunteerRole } from '@/data/mockData';

export default function Volunteers() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | VolunteerRole>('all');
  const [checkedIn, setCheckedIn] = useLocalStorage<string[]>('occ:volunteer-checkins', ['v1', 'v3', 'v5', 'v7', 'v11']);

  // Show the demo CDO's team primarily. Real implementation would scope by
  // the signed-in user's CDO; for the prototype default to cdo1's roster.
  const team = useMemo(() => VOLUNTEERS.filter((v) => v.locationId === 'cdo1'), []);
  const cdoLabel = getLocationById('cdo1')?.name ?? '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return team.filter((v) => {
      if (filter !== 'all' && v.role !== filter) return false;
      if (!q) return true;
      return v.name.toLowerCase().includes(q) || v.role.includes(q) || v.email.toLowerCase().includes(q);
    });
  }, [query, filter, team]);

  const roleStats = useMemo(() => {
    return (Object.keys(VOLUNTEER_ROLE_CONFIG) as VolunteerRole[]).map((role) => ({
      role,
      label: VOLUNTEER_ROLE_CONFIG[role].label,
      color: VOLUNTEER_ROLE_CONFIG[role].color,
      count: team.filter((v) => v.role === role).length,
    })).filter((r) => r.count > 0);
  }, [team]);

  function toggleCheckin(id: string) {
    setCheckedIn((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const totalCheckedIn = team.filter((v) => checkedIn.includes(v.id)).length;
  const totalShifts = team.reduce((s, v) => s + v.shiftDays.length, 0);
  const rolesCovered = new Set(team.map((v) => v.role)).size;

  return (
    <Layout>
      <div className="px-4 py-4 max-w-5xl mx-auto space-y-6 pb-24">
        {/* Editorial hero */}
        <header className="space-y-2 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">
            Volunteer Roster · Collection Week
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink leading-tight tracking-tight">
            The hands behind <span className="font-display-italic text-sp-red">every box.</span>
          </h1>
          <p className="text-sm text-ink-light italic">
            {team.length} volunteers · {totalShifts} shifts · {cdoLabel}
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={Users} label="Team" value={String(team.length)} color="text-blue-accent" bg="bg-blue-light" />
          <StatTile icon={CheckCircle2} label="On Site" value={String(totalCheckedIn)} color="text-occ-green" bg="bg-occ-green-light" />
          <StatTile icon={Calendar} label="Shifts" value={String(totalShifts)} color="text-gold" bg="bg-gold-light" />
          <StatTile icon={Award} label="Roles" value={`${rolesCovered}/6`} color="text-purple-accent" bg="bg-purple-light" />
        </div>

        {/* Admin shortcuts: Quick Check-In QR (kiosk) + Signups & Schedule (planning) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Link
            to="/clock?loc=cdo1"
            className="flex items-center gap-4 bg-bg-card rounded-2xl border border-border-custom shadow-card p-4 hover:border-sp-red hover:shadow-card-elevated transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-sp-red-light flex items-center justify-center shrink-0">
              <QrCode className="w-7 h-7 text-sp-red" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sp-red mb-0.5">Quick Check-In Mode</p>
              <p className="font-display text-base text-ink leading-tight">Volunteers clock in from their phone</p>
              <p className="text-[11px] text-ink-light mt-0.5 italic">Print the QR — they scan it, tap their name, done.</p>
            </div>
            <div className="text-ink-light/40 group-hover:text-sp-red group-hover:translate-x-1 transition-all shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </div>
          </Link>
          <Link
            to="/signups"
            className="flex items-center gap-4 bg-bg-card rounded-2xl border border-border-custom shadow-card p-4 hover:border-occ-green hover:shadow-card-elevated transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-occ-green-light flex items-center justify-center shrink-0">
              <Calendar className="w-7 h-7 text-occ-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-occ-green mb-0.5">Signups & Schedule</p>
              <p className="font-display text-base text-ink leading-tight">Who's volunteering, what days are covered</p>
              <p className="text-[11px] text-ink-light mt-0.5 italic">Block out days when a group has them. View pre-week signups.</p>
            </div>
            <div className="text-ink-light/40 group-hover:text-occ-green group-hover:translate-x-1 transition-all shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </div>
          </Link>
        </div>

        {/* Role distribution */}
        <section className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-medium text-ink">Role Distribution</h2>
            <span className="text-[10px] text-ink-light uppercase tracking-wider">across the team</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-5 items-center">
            <div className="h-40 mx-auto sm:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleStats}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {roleStats.map((r) => <Cell key={r.role} fill={r.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5 text-sm">
              {roleStats.map((r) => (
                <li key={r.role} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="text-ink flex-1">{r.label}</span>
                  <span className="font-display font-medium text-ink tabular-nums">{r.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Search + filter + add */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or role"
              className="w-full h-11 pl-10 pr-3 bg-bg-card border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/60 focus:outline-none focus:border-sp-red transition-colors"
            />
          </div>
          <button className="h-11 px-4 bg-sp-red text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 hover:bg-sp-red-dark transition-colors shadow-card">
            <UserPlus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
          {(Object.keys(VOLUNTEER_ROLE_CONFIG) as VolunteerRole[]).map((r) => (
            <FilterChip
              key={r}
              active={filter === r}
              onClick={() => setFilter(r)}
              label={VOLUNTEER_ROLE_CONFIG[r].label}
              tint={VOLUNTEER_ROLE_CONFIG[r].color}
            />
          ))}
        </div>

        {/* Roster */}
        {filtered.length === 0 ? (
          <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-8 text-center">
            <p className="text-sm text-ink-light italic">No volunteers match those filters.</p>
          </div>
        ) : (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {filtered.map((v) => (
              <VolunteerCard
                key={v.id}
                volunteer={v}
                checkedIn={checkedIn.includes(v.id)}
                onToggle={() => toggleCheckin(v.id)}
              />
            ))}
          </motion.ul>
        )}
      </div>
    </Layout>
  );
}

function StatTile({ icon: Icon, label, value, color, bg }: { icon: typeof Users; label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-3`}>
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <p className={`font-display text-2xl font-medium ${color} tabular-nums leading-none`}>{value}</p>
      <p className="text-[10px] text-ink-light mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function FilterChip({ active, onClick, label, tint }: { active: boolean; onClick: () => void; label: string; tint?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-all border ${
        active
          ? 'bg-ink text-bg-card border-ink'
          : 'bg-bg-card text-ink-light border-border-custom hover:border-ink/50'
      }`}
      style={active && tint ? { backgroundColor: tint, borderColor: tint } : undefined}
    >
      {label}
    </button>
  );
}

function VolunteerCard({ volunteer, checkedIn, onToggle }: { volunteer: Volunteer; checkedIn: boolean; onToggle: () => void }) {
  const cfg = VOLUNTEER_ROLE_CONFIG[volunteer.role];
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
      }}
      className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-4 hover:shadow-card-elevated transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div
          className="relative w-12 h-12 rounded-full flex items-center justify-center font-display text-lg font-medium text-white shrink-0"
          style={{ backgroundColor: cfg.color }}
        >
          {volunteer.name.charAt(0)}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-bg-card ${
              checkedIn ? 'bg-occ-green' : 'bg-ink-light/30'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-medium text-ink truncate leading-tight">{volunteer.name}</h3>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1"
            style={{ color: cfg.color }}
          >
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: cfg.color }} />
            {cfg.label}
          </span>
          <p className="text-[10px] text-ink-light italic mt-0.5">{cfg.description}</p>
        </div>
        <button
          onClick={onToggle}
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            checkedIn ? 'bg-occ-green text-white' : 'bg-bg-primary text-ink-light hover:bg-occ-green-light hover:text-occ-green'
          }`}
          aria-label={checkedIn ? `Check out ${volunteer.name}` : `Check in ${volunteer.name}`}
        >
          {checkedIn ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-border-custom space-y-1.5 text-[11px] text-ink-light">
        <a href={`mailto:${volunteer.email}`} className="flex items-center gap-1.5 hover:text-sp-red transition-colors truncate">
          <Mail className="w-3 h-3 shrink-0" />
          <span className="truncate">{volunteer.email}</span>
        </a>
        <a href={`tel:${volunteer.phone}`} className="flex items-center gap-1.5 hover:text-sp-red transition-colors tabular-nums">
          <Phone className="w-3 h-3 shrink-0" />
          {volunteer.phone}
        </a>
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <Calendar className="w-3 h-3 shrink-0 text-ink-light/60" />
          {volunteer.shiftDays.map((d) => (
            <span key={d} className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-bg-primary text-ink">
              {d}
            </span>
          ))}
        </div>
      </div>
    </motion.li>
  );
}
