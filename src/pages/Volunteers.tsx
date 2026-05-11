import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Search, CheckCircle2, Circle, Phone, Mail, Award, Calendar,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Layout from '@/components/Layout';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Realistic OCC Collection Week volunteer roles. Most real CDOs run with 12-30
// volunteers across these roles for the week. The Counter and Cartonizer roles
// have the deepest depth requirements; Greeters rotate fastest.
type VolunteerRole = 'unloader' | 'counter' | 'greeter' | 'cartonizer' | 'loader' | 'lead';

interface Volunteer {
  id: string;
  name: string;
  role: VolunteerRole;
  email: string;
  phone: string;
  shiftDays: string[]; // weekday labels
  emergencyContact?: string;
}

const ROLE_CONFIG: Record<VolunteerRole, { label: string; color: string; bg: string; description: string }> = {
  lead: { label: 'Team Lead', color: '#C8102E', bg: 'bg-sp-red-light', description: 'Site coordinator' },
  unloader: { label: 'Unloader', color: '#D97706', bg: 'bg-gold-light', description: 'Curbside + transport' },
  counter: { label: 'Counter', color: '#1A6B3C', bg: 'bg-occ-green-light', description: 'Stacks of 5, totals' },
  greeter: { label: 'Greeter', color: '#0EA5E9', bg: 'bg-blue-light', description: 'Donor welcome' },
  cartonizer: { label: 'Cartonizer', color: '#7C3AED', bg: 'bg-purple-light', description: 'Pack + seal cartons' },
  loader: { label: 'Loader', color: '#475569', bg: 'bg-bg-cream', description: 'Trailer + truck' },
};

const TEAM: Volunteer[] = [
  { id: 'v1', name: 'Maria Rodriguez', role: 'lead', email: 'maria@fbc.org', phone: '(404) 555-0101', shiftDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], emergencyContact: 'Carlos Rodriguez · spouse' },
  { id: 'v2', name: 'James Henderson', role: 'cartonizer', email: 'jhenderson@gmail.com', phone: '(404) 555-0212', shiftDays: ['Wed', 'Thu', 'Fri', 'Sat'] },
  { id: 'v3', name: 'Sarah Chen', role: 'counter', email: 'schen@gmail.com', phone: '(770) 555-0233', shiftDays: ['Mon', 'Tue', 'Wed', 'Thu'] },
  { id: 'v4', name: 'David Park', role: 'unloader', email: 'dpark@yahoo.com', phone: '(404) 555-0289', shiftDays: ['Sat', 'Sun', 'Mon'] },
  { id: 'v5', name: 'Rachel Kim', role: 'greeter', email: 'rkim@gmail.com', phone: '(678) 555-0301', shiftDays: ['Mon', 'Wed', 'Fri'] },
  { id: 'v6', name: 'Thomas Wright', role: 'cartonizer', email: 'twright@gmail.com', phone: '(404) 555-0344', shiftDays: ['Thu', 'Fri', 'Sat', 'Sun'] },
  { id: 'v7', name: 'Anna Martinez', role: 'counter', email: 'amartinez@gmail.com', phone: '(770) 555-0367', shiftDays: ['Tue', 'Wed', 'Thu', 'Fri'] },
  { id: 'v8', name: 'Brian Foster', role: 'loader', email: 'bfoster@gmail.com', phone: '(404) 555-0398', shiftDays: ['Sat', 'Sun', 'Mon'] },
  { id: 'v9', name: 'Linda Williams', role: 'greeter', email: 'lwilliams@yahoo.com', phone: '(678) 555-0422', shiftDays: ['Mon', 'Tue', 'Fri'] },
  { id: 'v10', name: 'Marcus Allen', role: 'unloader', email: 'mallen@gmail.com', phone: '(404) 555-0455', shiftDays: ['Sat', 'Sun'] },
  { id: 'v11', name: 'Emily Foster', role: 'counter', email: 'emily@volunteer.org', phone: '(770) 555-0467', shiftDays: ['Wed', 'Thu', 'Fri', 'Sat'] },
  { id: 'v12', name: 'Patricia Lee', role: 'cartonizer', email: 'plee@gmail.com', phone: '(404) 555-0488', shiftDays: ['Fri', 'Sat', 'Sun'] },
];

export default function Volunteers() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | VolunteerRole>('all');
  const [checkedIn, setCheckedIn] = useLocalStorage<string[]>('occ:volunteer-checkins', ['v1', 'v3', 'v5', 'v7', 'v11']);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEAM.filter((v) => {
      if (filter !== 'all' && v.role !== filter) return false;
      if (!q) return true;
      return v.name.toLowerCase().includes(q) || v.role.includes(q) || v.email.toLowerCase().includes(q);
    });
  }, [query, filter]);

  const roleStats = useMemo(() => {
    return (Object.keys(ROLE_CONFIG) as VolunteerRole[]).map((role) => ({
      role,
      label: ROLE_CONFIG[role].label,
      color: ROLE_CONFIG[role].color,
      count: TEAM.filter((v) => v.role === role).length,
    })).filter((r) => r.count > 0);
  }, []);

  function toggleCheckin(id: string) {
    setCheckedIn((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const totalCheckedIn = checkedIn.length;
  const totalVolunteers = TEAM.length;
  const totalShifts = TEAM.reduce((s, v) => s + v.shiftDays.length, 0);
  const rolesCovered = new Set(TEAM.map((v) => v.role)).size;

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
            {totalVolunteers} volunteers · {totalShifts} shifts scheduled this week
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={Users} label="Team" value={String(totalVolunteers)} color="text-blue-accent" bg="bg-blue-light" />
          <StatTile icon={CheckCircle2} label="On Site" value={String(totalCheckedIn)} color="text-occ-green" bg="bg-occ-green-light" />
          <StatTile icon={Calendar} label="Shifts" value={String(totalShifts)} color="text-gold" bg="bg-gold-light" />
          <StatTile icon={Award} label="Roles" value={`${rolesCovered}/6`} color="text-purple-accent" bg="bg-purple-light" />
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
          {(Object.keys(ROLE_CONFIG) as VolunteerRole[]).map((r) => (
            <FilterChip
              key={r}
              active={filter === r}
              onClick={() => setFilter(r)}
              label={ROLE_CONFIG[r].label}
              tint={ROLE_CONFIG[r].color}
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
  const cfg = ROLE_CONFIG[volunteer.role];
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
            style={{ backgroundColor: cfg.bg.replace('bg-', '').includes('cream') ? '#F4EDE0' : undefined, color: cfg.color }}
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
