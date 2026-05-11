export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'regional'
  | 'cdo_leader'
  | 'do_leader'
  | 'greeter';

export type Trend = 'up' | 'flat' | 'down';
export type StateStatus = 'on_track' | 'caution' | 'behind';
export type Region = 'Northeast' | 'Southeast' | 'Midwest' | 'Southwest' | 'Northwest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  locationId?: string;
  regionId?: string;
  stateId?: string;
  avatar?: string;
}

export interface Location {
  id: string;
  name: string;
  type: 'central' | 'dropoff';
  address: string;
  city: string;
  state: string;
  zip: string;
  region: Region;
  centralDropoffId?: string;
  contactName: string;
  contactPhone: string;
  status: 'active' | 'inactive' | 'closed';
}

export interface StateData {
  id: string;
  name: string;
  abbreviation: string;
  region: Region;
  shoeboxCount: number;
  goal: number;
  cdoCount: number;
  cdoActive: number;
  dropoffCount: number;
  volunteers: number;
  donors: number;
  trend: Trend;
}

export interface ShoeboxEntry {
  id: string;
  donorName: string;
  count: number;
  locationId: string;
  greeterId: string;
  greeterName: string;
  timestamp: string;
  date: string;
}

export interface Carton {
  id: string;
  cartonNumber: number;
  locationId: string;
  boxCount: number;
  status: 'open' | 'sealed' | 'loaded';
  createdAt: string;
  loadedAt?: string;
  bolId?: string;
}

export interface BOL {
  id: string;
  bolNumber: string;
  locationId: string;
  trailerId: string;
  cartonIds: string[];
  totalBoxes: number;
  status: 'draft' | 'ready' | 'loaded' | 'in_transit';
  createdAt: string;
  loadedAt?: string;
}

export interface ActivityItem {
  id: string;
  type: 'checkin' | 'carton' | 'truck' | 'alert' | 'milestone';
  message: string;
  locationName: string;
  details?: string;
  timestamp: string;
  region?: Region;
}

export interface RegionData {
  id: string;
  name: Region;
  shoeboxCount: number;
  goal: number;
  cdoCount: number;
  cdoActive: number;
}

export const NATIONAL_GOAL = 10_000_000;

// Collection Week 2026: Nov 16 (Mon) → Nov 23 (Mon). 8 days inclusive.
export const COLLECTION_WEEK_START = '2026-11-16';
export const COLLECTION_WEEK_END = '2026-11-23';

// Demo: pretend we're on Day 4 of Collection Week (Thursday).
// Used by getStateStatus() for pace-aware status pills.
export const COLLECTION_DAY = 4;
export const COLLECTION_TOTAL_DAYS = 8;

export interface CollectionDay {
  index: number;
  date: string;
  weekday: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  monthDay: number;
}

// Collection Week 2026: Mon Nov 16 → Mon Nov 23. 8 day-pills for the Daily
// Totals selector. Today is Day 4 (Thu Nov 19) for the demo.
export const COLLECTION_DAYS: CollectionDay[] = [
  { index: 1, date: '2026-11-16', weekday: 'Mon', monthDay: 16 },
  { index: 2, date: '2026-11-17', weekday: 'Tue', monthDay: 17 },
  { index: 3, date: '2026-11-18', weekday: 'Wed', monthDay: 18 },
  { index: 4, date: '2026-11-19', weekday: 'Thu', monthDay: 19 },
  { index: 5, date: '2026-11-20', weekday: 'Fri', monthDay: 20 },
  { index: 6, date: '2026-11-21', weekday: 'Sat', monthDay: 21 },
  { index: 7, date: '2026-11-22', weekday: 'Sun', monthDay: 22 },
  { index: 8, date: '2026-11-23', weekday: 'Mon', monthDay: 23 },
];

// Synthetic per-day box totals for the demo CDO's weekly chart. Real OCC
// pattern: light early in the week, peak on Sat-Sun, taper before the
// transport-to-Central deadline on the final Monday.
export const WEEKLY_TOTALS_DEMO = [42, 78, 130, 156, 0, 0, 0, 0];

export const ROLE_CONFIG: Record<
  UserRole,
  { label: string; color: string; bgColor: string; description: string }
> = {
  super_admin: { label: 'Super Admin', color: '#C8102E', bgColor: '#FDE8EB', description: 'National HQ — Samaritan\'s Purse' },
  admin: { label: 'SP Admin', color: '#7C3AED', bgColor: '#F3EEFD', description: 'National oversight' },
  regional: { label: 'Regional Admin', color: '#2563EB', bgColor: '#EFF6FF', description: 'Regional oversight' },
  cdo_leader: { label: 'CDO Leader', color: '#1A6B3C', bgColor: '#E6F5EC', description: 'Central Drop-off Leader' },
  do_leader: { label: 'Drop-off Leader', color: '#D97706', bgColor: '#FEF3C7', description: 'Drop-off Leader' },
  greeter: { label: 'Greeter', color: '#0EA5E9', bgColor: '#E0F2FE', description: 'Greeter' },
};

export const REGIONS: Region[] = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'Northwest'];

// ──────────────────────────────────────────────────────────────────────────────
// 50 STATES — pace-aware, with shoeboxCount tuned to Day 4 expectations.
// At Day 4 of 8 with a back-loaded curve, ~35% of goal is "on pace".
// We vary actual % to surface a healthy mix of on_track / caution / behind.
// Goals roughly proportional to population × evangelical density.
// ──────────────────────────────────────────────────────────────────────────────
export const STATES: StateData[] = [
  // ─── Northeast (11) ───
  { id: 'me', name: 'Maine', abbreviation: 'ME', region: 'Northeast', shoeboxCount: 18_400, goal: 60_000, cdoCount: 4, cdoActive: 4, dropoffCount: 12, volunteers: 220, donors: 1_800, trend: 'up' },
  { id: 'nh', name: 'New Hampshire', abbreviation: 'NH', region: 'Northeast', shoeboxCount: 22_100, goal: 70_000, cdoCount: 5, cdoActive: 4, dropoffCount: 14, volunteers: 260, donors: 2_100, trend: 'flat' },
  { id: 'vt', name: 'Vermont', abbreviation: 'VT', region: 'Northeast', shoeboxCount: 9_800, goal: 35_000, cdoCount: 3, cdoActive: 3, dropoffCount: 8, volunteers: 140, donors: 980, trend: 'up' },
  { id: 'ma', name: 'Massachusetts', abbreviation: 'MA', region: 'Northeast', shoeboxCount: 71_200, goal: 240_000, cdoCount: 14, cdoActive: 12, dropoffCount: 38, volunteers: 780, donors: 7_100, trend: 'flat' },
  { id: 'ri', name: 'Rhode Island', abbreviation: 'RI', region: 'Northeast', shoeboxCount: 11_400, goal: 38_000, cdoCount: 3, cdoActive: 3, dropoffCount: 9, volunteers: 160, donors: 1_140, trend: 'up' },
  { id: 'ct', name: 'Connecticut', abbreviation: 'CT', region: 'Northeast', shoeboxCount: 34_200, goal: 130_000, cdoCount: 9, cdoActive: 8, dropoffCount: 22, volunteers: 410, donors: 3_400, trend: 'down' },
  { id: 'ny', name: 'New York', abbreviation: 'NY', region: 'Northeast', shoeboxCount: 158_400, goal: 520_000, cdoCount: 28, cdoActive: 26, dropoffCount: 84, volunteers: 1_780, donors: 15_840, trend: 'flat' },
  { id: 'nj', name: 'New Jersey', abbreviation: 'NJ', region: 'Northeast', shoeboxCount: 72_800, goal: 280_000, cdoCount: 15, cdoActive: 13, dropoffCount: 46, volunteers: 880, donors: 7_280, trend: 'down' },
  { id: 'pa', name: 'Pennsylvania', abbreviation: 'PA', region: 'Northeast', shoeboxCount: 196_400, goal: 540_000, cdoCount: 32, cdoActive: 30, dropoffCount: 95, volunteers: 2_100, donors: 19_640, trend: 'up' },
  { id: 'de', name: 'Delaware', abbreviation: 'DE', region: 'Northeast', shoeboxCount: 16_200, goal: 48_000, cdoCount: 4, cdoActive: 4, dropoffCount: 11, volunteers: 190, donors: 1_620, trend: 'up' },
  { id: 'md', name: 'Maryland', abbreviation: 'MD', region: 'Northeast', shoeboxCount: 82_100, goal: 260_000, cdoCount: 16, cdoActive: 15, dropoffCount: 48, volunteers: 920, donors: 8_210, trend: 'flat' },

  // ─── Southeast (10) — OCC stronghold ───
  { id: 'va', name: 'Virginia', abbreviation: 'VA', region: 'Southeast', shoeboxCount: 318_400, goal: 620_000, cdoCount: 36, cdoActive: 35, dropoffCount: 110, volunteers: 2_460, donors: 31_840, trend: 'up' },
  { id: 'nc', name: 'North Carolina', abbreviation: 'NC', region: 'Southeast', shoeboxCount: 542_800, goal: 1_050_000, cdoCount: 58, cdoActive: 57, dropoffCount: 178, volunteers: 4_320, donors: 54_280, trend: 'up' },
  { id: 'sc', name: 'South Carolina', abbreviation: 'SC', region: 'Southeast', shoeboxCount: 246_200, goal: 480_000, cdoCount: 28, cdoActive: 27, dropoffCount: 88, volunteers: 1_940, donors: 24_620, trend: 'up' },
  { id: 'ga', name: 'Georgia', abbreviation: 'GA', region: 'Southeast', shoeboxCount: 421_800, goal: 820_000, cdoCount: 44, cdoActive: 42, dropoffCount: 134, volunteers: 3_120, donors: 42_180, trend: 'up' },
  { id: 'fl', name: 'Florida', abbreviation: 'FL', region: 'Southeast', shoeboxCount: 268_400, goal: 920_000, cdoCount: 48, cdoActive: 43, dropoffCount: 146, volunteers: 3_280, donors: 26_840, trend: 'flat' },
  { id: 'al', name: 'Alabama', abbreviation: 'AL', region: 'Southeast', shoeboxCount: 194_600, goal: 380_000, cdoCount: 22, cdoActive: 22, dropoffCount: 68, volunteers: 1_540, donors: 19_460, trend: 'up' },
  { id: 'ms', name: 'Mississippi', abbreviation: 'MS', region: 'Southeast', shoeboxCount: 78_600, goal: 220_000, cdoCount: 14, cdoActive: 13, dropoffCount: 42, volunteers: 880, donors: 7_860, trend: 'flat' },
  { id: 'tn', name: 'Tennessee', abbreviation: 'TN', region: 'Southeast', shoeboxCount: 296_400, goal: 580_000, cdoCount: 34, cdoActive: 33, dropoffCount: 102, volunteers: 2_360, donors: 29_640, trend: 'up' },
  { id: 'ky', name: 'Kentucky', abbreviation: 'KY', region: 'Southeast', shoeboxCount: 96_400, goal: 300_000, cdoCount: 18, cdoActive: 17, dropoffCount: 54, volunteers: 1_060, donors: 9_640, trend: 'flat' },
  { id: 'wv', name: 'West Virginia', abbreviation: 'WV', region: 'Southeast', shoeboxCount: 48_200, goal: 140_000, cdoCount: 10, cdoActive: 9, dropoffCount: 28, volunteers: 540, donors: 4_820, trend: 'down' },

  // ─── Midwest (10) ───
  { id: 'oh', name: 'Ohio', abbreviation: 'OH', region: 'Midwest', shoeboxCount: 336_400, goal: 660_000, cdoCount: 38, cdoActive: 36, dropoffCount: 116, volunteers: 2_580, donors: 33_640, trend: 'up' },
  { id: 'in', name: 'Indiana', abbreviation: 'IN', region: 'Midwest', shoeboxCount: 124_800, goal: 360_000, cdoCount: 20, cdoActive: 19, dropoffCount: 62, volunteers: 1_360, donors: 12_480, trend: 'flat' },
  { id: 'il', name: 'Illinois', abbreviation: 'IL', region: 'Midwest', shoeboxCount: 168_400, goal: 480_000, cdoCount: 26, cdoActive: 24, dropoffCount: 78, volunteers: 1_840, donors: 16_840, trend: 'down' },
  { id: 'mi', name: 'Michigan', abbreviation: 'MI', region: 'Midwest', shoeboxCount: 142_600, goal: 460_000, cdoCount: 24, cdoActive: 22, dropoffCount: 74, volunteers: 1_620, donors: 14_260, trend: 'flat' },
  { id: 'wi', name: 'Wisconsin', abbreviation: 'WI', region: 'Midwest', shoeboxCount: 96_800, goal: 280_000, cdoCount: 16, cdoActive: 15, dropoffCount: 48, volunteers: 1_080, donors: 9_680, trend: 'up' },
  { id: 'mn', name: 'Minnesota', abbreviation: 'MN', region: 'Midwest', shoeboxCount: 102_400, goal: 320_000, cdoCount: 18, cdoActive: 17, dropoffCount: 54, volunteers: 1_140, donors: 10_240, trend: 'flat' },
  { id: 'ia', name: 'Iowa', abbreviation: 'IA', region: 'Midwest', shoeboxCount: 92_800, goal: 180_000, cdoCount: 12, cdoActive: 12, dropoffCount: 34, volunteers: 720, donors: 9_280, trend: 'up' },
  { id: 'mo', name: 'Missouri', abbreviation: 'MO', region: 'Midwest', shoeboxCount: 136_400, goal: 380_000, cdoCount: 22, cdoActive: 21, dropoffCount: 64, volunteers: 1_460, donors: 13_640, trend: 'up' },
  { id: 'ar', name: 'Arkansas', abbreviation: 'AR', region: 'Midwest', shoeboxCount: 78_400, goal: 210_000, cdoCount: 14, cdoActive: 13, dropoffCount: 42, volunteers: 860, donors: 7_840, trend: 'flat' },
  { id: 'la', name: 'Louisiana', abbreviation: 'LA', region: 'Midwest', shoeboxCount: 84_200, goal: 240_000, cdoCount: 15, cdoActive: 14, dropoffCount: 46, volunteers: 920, donors: 8_420, trend: 'down' },

  // ─── Southwest (9) ───
  { id: 'tx', name: 'Texas', abbreviation: 'TX', region: 'Southwest', shoeboxCount: 468_400, goal: 1_180_000, cdoCount: 64, cdoActive: 62, dropoffCount: 198, volunteers: 4_980, donors: 46_840, trend: 'up' },
  { id: 'ok', name: 'Oklahoma', abbreviation: 'OK', region: 'Southwest', shoeboxCount: 96_800, goal: 260_000, cdoCount: 16, cdoActive: 15, dropoffCount: 48, volunteers: 1_080, donors: 9_680, trend: 'up' },
  { id: 'ks', name: 'Kansas', abbreviation: 'KS', region: 'Southwest', shoeboxCount: 58_400, goal: 170_000, cdoCount: 11, cdoActive: 10, dropoffCount: 32, volunteers: 660, donors: 5_840, trend: 'flat' },
  { id: 'ne', name: 'Nebraska', abbreviation: 'NE', region: 'Southwest', shoeboxCount: 38_200, goal: 110_000, cdoCount: 8, cdoActive: 8, dropoffCount: 22, volunteers: 440, donors: 3_820, trend: 'up' },
  { id: 'nd', name: 'North Dakota', abbreviation: 'ND', region: 'Southwest', shoeboxCount: 16_800, goal: 48_000, cdoCount: 4, cdoActive: 4, dropoffCount: 11, volunteers: 200, donors: 1_680, trend: 'flat' },
  { id: 'sd', name: 'South Dakota', abbreviation: 'SD', region: 'Southwest', shoeboxCount: 18_400, goal: 54_000, cdoCount: 5, cdoActive: 5, dropoffCount: 13, volunteers: 220, donors: 1_840, trend: 'up' },
  { id: 'co', name: 'Colorado', abbreviation: 'CO', region: 'Southwest', shoeboxCount: 88_400, goal: 290_000, cdoCount: 16, cdoActive: 15, dropoffCount: 48, volunteers: 980, donors: 8_840, trend: 'flat' },
  { id: 'nm', name: 'New Mexico', abbreviation: 'NM', region: 'Southwest', shoeboxCount: 32_800, goal: 110_000, cdoCount: 7, cdoActive: 6, dropoffCount: 18, volunteers: 380, donors: 3_280, trend: 'down' },
  { id: 'az', name: 'Arizona', abbreviation: 'AZ', region: 'Southwest', shoeboxCount: 102_400, goal: 320_000, cdoCount: 18, cdoActive: 17, dropoffCount: 54, volunteers: 1_140, donors: 10_240, trend: 'up' },

  // ─── Northwest (10) ───
  { id: 'wy', name: 'Wyoming', abbreviation: 'WY', region: 'Northwest', shoeboxCount: 9_800, goal: 30_000, cdoCount: 3, cdoActive: 3, dropoffCount: 8, volunteers: 120, donors: 980, trend: 'flat' },
  { id: 'mt', name: 'Montana', abbreviation: 'MT', region: 'Northwest', shoeboxCount: 22_400, goal: 64_000, cdoCount: 5, cdoActive: 5, dropoffCount: 14, volunteers: 260, donors: 2_240, trend: 'up' },
  { id: 'id', name: 'Idaho', abbreviation: 'ID', region: 'Northwest', shoeboxCount: 38_800, goal: 110_000, cdoCount: 8, cdoActive: 7, dropoffCount: 22, volunteers: 440, donors: 3_880, trend: 'up' },
  { id: 'ut', name: 'Utah', abbreviation: 'UT', region: 'Northwest', shoeboxCount: 42_400, goal: 140_000, cdoCount: 9, cdoActive: 8, dropoffCount: 26, volunteers: 480, donors: 4_240, trend: 'flat' },
  { id: 'nv', name: 'Nevada', abbreviation: 'NV', region: 'Northwest', shoeboxCount: 34_800, goal: 120_000, cdoCount: 7, cdoActive: 6, dropoffCount: 20, volunteers: 400, donors: 3_480, trend: 'down' },
  { id: 'ca', name: 'California', abbreviation: 'CA', region: 'Northwest', shoeboxCount: 218_400, goal: 840_000, cdoCount: 44, cdoActive: 40, dropoffCount: 132, volunteers: 2_480, donors: 21_840, trend: 'down' },
  { id: 'or', name: 'Oregon', abbreviation: 'OR', region: 'Northwest', shoeboxCount: 56_400, goal: 180_000, cdoCount: 11, cdoActive: 10, dropoffCount: 32, volunteers: 640, donors: 5_640, trend: 'flat' },
  { id: 'wa', name: 'Washington', abbreviation: 'WA', region: 'Northwest', shoeboxCount: 92_400, goal: 290_000, cdoCount: 17, cdoActive: 16, dropoffCount: 50, volunteers: 1_020, donors: 9_240, trend: 'up' },
  { id: 'ak', name: 'Alaska', abbreviation: 'AK', region: 'Northwest', shoeboxCount: 11_400, goal: 38_000, cdoCount: 3, cdoActive: 3, dropoffCount: 9, volunteers: 130, donors: 1_140, trend: 'up' },
  { id: 'hi', name: 'Hawaii', abbreviation: 'HI', region: 'Northwest', shoeboxCount: 14_200, goal: 46_000, cdoCount: 4, cdoActive: 3, dropoffCount: 11, volunteers: 160, donors: 1_420, trend: 'flat' },
];

// ──────────────────────────────────────────────────────────────────────────────
// USERS — Franklin Graham (super_admin) is default; demo can switch roles.
// ──────────────────────────────────────────────────────────────────────────────
export const USERS: User[] = [
  { id: 'u0', name: 'Franklin Graham', email: 'fgraham@samaritanspurse.org', role: 'super_admin', regionId: 'all' },
  { id: 'u1', name: 'Sarah Mitchell', email: 'sarah@sp.org', role: 'admin', regionId: 'all' },
  { id: 'u2', name: 'David Chen', email: 'david@sp.org', role: 'regional', regionId: 'r2', stateId: 'ga' },
  { id: 'u3', name: 'Maria Rodriguez', email: 'maria@fbc.org', role: 'cdo_leader', locationId: 'cdo1', stateId: 'ga' },
  { id: 'u4', name: 'John Patterson', email: 'john@grace.org', role: 'do_leader', locationId: 'do1', stateId: 'ga' },
  { id: 'u5', name: 'Emily Foster', email: 'emily@volunteer.org', role: 'greeter', locationId: 'cdo1', stateId: 'ga' },
];

export const LOCATIONS: Location[] = [
  { id: 'cdo1', name: 'First Baptist Church', type: 'central', address: '123 Main St', city: 'Atlanta', state: 'GA', zip: '30301', region: 'Southeast', contactName: 'Maria Rodriguez', contactPhone: '(404) 555-0101', status: 'active' },
  { id: 'cdo2', name: 'Grace Community Church', type: 'central', address: '456 Oak Ave', city: 'Charlotte', state: 'NC', zip: '28201', region: 'Southeast', contactName: 'James Wilson', contactPhone: '(704) 555-0102', status: 'active' },
  { id: 'cdo3', name: 'Calvary Chapel', type: 'central', address: '789 Pine Rd', city: 'Nashville', state: 'TN', zip: '37201', region: 'Southeast', contactName: 'Lisa Thompson', contactPhone: '(615) 555-0103', status: 'active' },
  { id: 'cdo4', name: 'Hope Church', type: 'central', address: '321 Elm St', city: 'Dallas', state: 'TX', zip: '75201', region: 'Southwest', contactName: 'Robert Garcia', contactPhone: '(214) 555-0104', status: 'active' },
  { id: 'cdo5', name: 'Trinity Church', type: 'central', address: '654 Maple Dr', city: 'Chicago', state: 'IL', zip: '60601', region: 'Midwest', contactName: 'Amanda Lee', contactPhone: '(312) 555-0105', status: 'active' },
  { id: 'cdo6', name: 'Cornerstone Bible', type: 'central', address: '890 Oak Park', city: 'Columbus', state: 'OH', zip: '43215', region: 'Midwest', contactName: 'Daniel Park', contactPhone: '(614) 555-0106', status: 'active' },
  { id: 'cdo7', name: 'Liberty Baptist', type: 'central', address: '212 Madison Ave', city: 'Lynchburg', state: 'VA', zip: '24502', region: 'Southeast', contactName: 'Rebecca Lin', contactPhone: '(434) 555-0107', status: 'active' },
  { id: 'cdo8', name: 'Faithful Servant', type: 'central', address: '101 Cedar Ln', city: 'Phoenix', state: 'AZ', zip: '85001', region: 'Southwest', contactName: 'Carlos Mendez', contactPhone: '(602) 555-0108', status: 'active' },
  { id: 'cdo9', name: 'Cross Roads Fellowship', type: 'central', address: '500 Liberty Blvd', city: 'Portland', state: 'OR', zip: '97201', region: 'Northwest', contactName: 'Jennifer Park', contactPhone: '(503) 555-0109', status: 'active' },
  { id: 'cdo10', name: 'New Hope Church', type: 'central', address: '77 Heritage Way', city: 'Tampa', state: 'FL', zip: '33602', region: 'Southeast', contactName: 'Marcus Hill', contactPhone: '(813) 555-0110', status: 'active' },

  { id: 'do1', name: "St. Mark's Church", type: 'dropoff', address: '111 River Rd', city: 'Marietta', state: 'GA', zip: '30060', region: 'Southeast', centralDropoffId: 'cdo1', contactName: 'John Patterson', contactPhone: '(770) 555-0201', status: 'active' },
  { id: 'do2', name: 'Community Bible Church', type: 'dropoff', address: '222 Lake Dr', city: 'Decatur', state: 'GA', zip: '30030', region: 'Southeast', centralDropoffId: 'cdo1', contactName: 'Susan Wright', contactPhone: '(404) 555-0202', status: 'active' },
  { id: 'do3', name: 'Cornerstone Church', type: 'dropoff', address: '333 Hill St', city: 'Sandy Springs', state: 'GA', zip: '30328', region: 'Southeast', centralDropoffId: 'cdo1', contactName: 'Michael Brown', contactPhone: '(404) 555-0203', status: 'active' },
  { id: 'do4', name: 'Living Word Church', type: 'dropoff', address: '444 Valley Rd', city: 'Roswell', state: 'GA', zip: '30075', region: 'Southeast', centralDropoffId: 'cdo1', contactName: 'Karen Davis', contactPhone: '(770) 555-0204', status: 'inactive' },
  { id: 'do5', name: 'Faith Fellowship', type: 'dropoff', address: '555 Creek Ave', city: 'Norcross', state: 'GA', zip: '30071', region: 'Southeast', centralDropoffId: 'cdo1', contactName: 'Tom Anderson', contactPhone: '(678) 555-0205', status: 'active' },
];

export const SHOEBOX_ENTRIES: ShoeboxEntry[] = [
  { id: 'e1', donorName: 'Johnson Family', count: 5, locationId: 'cdo1', greeterId: 'u5', greeterName: 'Emily Foster', timestamp: '2026-11-19T09:15:00Z', date: '2026-11-19' },
  { id: 'e2', donorName: 'Williams Family', count: 3, locationId: 'cdo1', greeterId: 'u5', greeterName: 'Emily Foster', timestamp: '2026-11-19T09:32:00Z', date: '2026-11-19' },
  { id: 'e3', donorName: 'Davis Family', count: 8, locationId: 'cdo1', greeterId: 'u5', greeterName: 'Emily Foster', timestamp: '2026-11-19T10:05:00Z', date: '2026-11-19' },
  { id: 'e4', donorName: 'Miller Family', count: 2, locationId: 'cdo1', greeterId: 'u5', greeterName: 'Emily Foster', timestamp: '2026-11-19T10:48:00Z', date: '2026-11-19' },
  { id: 'e5', donorName: 'Wilson Family', count: 12, locationId: 'cdo1', greeterId: 'u5', greeterName: 'Emily Foster', timestamp: '2026-11-19T11:20:00Z', date: '2026-11-19' },
  { id: 'e6', donorName: 'Moore Family', count: 4, locationId: 'cdo1', greeterId: 'u5', greeterName: 'Emily Foster', timestamp: '2026-11-19T11:45:00Z', date: '2026-11-19' },
  { id: 'e7', donorName: 'Taylor Family', count: 6, locationId: 'do1', greeterId: 'u4', greeterName: 'John Patterson', timestamp: '2026-11-19T09:10:00Z', date: '2026-11-19' },
  { id: 'e8', donorName: 'Anderson Family', count: 3, locationId: 'do1', greeterId: 'u4', greeterName: 'John Patterson', timestamp: '2026-11-19T09:45:00Z', date: '2026-11-19' },
  { id: 'e9', donorName: 'Thomas Family', count: 7, locationId: 'do2', greeterId: 'u4', greeterName: 'Susan Wright', timestamp: '2026-11-19T10:00:00Z', date: '2026-11-19' },
  { id: 'e10', donorName: 'Jackson Family', count: 15, locationId: 'cdo2', greeterId: 'u5', greeterName: 'Emily Foster', timestamp: '2026-11-19T09:20:00Z', date: '2026-11-19' },
];

// Cartons are packed at Central Drop-offs only. Real OCC cartons average ~15
// shoeboxes per carton — 12-18 is the typical range; bigger when boxes are small,
// smaller when boxes are oversized or the carton holds odd dimensions. Cartons
// are NOT tied to a donor — once boxes are checked in they become a shared pool.
export const TYPICAL_BOXES_PER_CARTON = 15;
export const CARTON_RANGE_TYPICAL = { min: 12, max: 18 };

export const CARTONS: Carton[] = [
  { id: 'c1', cartonNumber: 1243, locationId: 'cdo1', boxCount: 15, status: 'sealed', createdAt: '2026-11-19T08:30:00Z' },
  { id: 'c2', cartonNumber: 1244, locationId: 'cdo1', boxCount: 16, status: 'sealed', createdAt: '2026-11-19T09:00:00Z' },
  { id: 'c3', cartonNumber: 1245, locationId: 'cdo1', boxCount: 12, status: 'open', createdAt: '2026-11-19T09:45:00Z' },
  { id: 'c4', cartonNumber: 891, locationId: 'cdo2', boxCount: 14, status: 'sealed', createdAt: '2026-11-19T08:15:00Z' },
  { id: 'c5', cartonNumber: 892, locationId: 'cdo2', boxCount: 17, status: 'open', createdAt: '2026-11-19T09:30:00Z' },
  { id: 'c6', cartonNumber: 567, locationId: 'cdo3', boxCount: 15, status: 'sealed', createdAt: '2026-11-18T16:00:00Z', loadedAt: '2026-11-18T18:00:00Z', bolId: 'bol1' },
  { id: 'c7', cartonNumber: 568, locationId: 'cdo3', boxCount: 13, status: 'loaded', createdAt: '2026-11-18T16:30:00Z', loadedAt: '2026-11-18T18:00:00Z', bolId: 'bol1' },
];

export const BOLS: BOL[] = [
  { id: 'bol1', bolNumber: 'BOL-2847', locationId: 'cdo3', trailerId: 'TR-2847', cartonIds: ['c6', 'c7'], totalBoxes: 48, status: 'in_transit', createdAt: '2026-11-18T17:00:00Z', loadedAt: '2026-11-18T18:00:00Z' },
  { id: 'bol2', bolNumber: 'BOL-2848', locationId: 'cdo1', trailerId: 'TR-2848', cartonIds: ['c1', 'c2'], totalBoxes: 48, status: 'ready', createdAt: '2026-11-19T09:30:00Z' },
];

export const ACTIVITY_FEED: ActivityItem[] = [
  { id: 'a1', type: 'checkin', message: 'First Baptist Church (Atlanta, GA) — 150 shoeboxes checked in', locationName: 'First Baptist Church', details: '150 shoeboxes', timestamp: '2026-11-19T14:32:00Z', region: 'Southeast' },
  { id: 'a2', type: 'carton', message: 'Carton #1243 packed — 23 boxes — Grace Community CDO', locationName: 'Grace Community Church', details: 'Carton #1243, 23 boxes', timestamp: '2026-11-19T14:28:00Z', region: 'Southeast' },
  { id: 'a3', type: 'truck', message: 'Trailer TR-2847 loaded — 1,240 boxes — Northwest Region', locationName: 'Cross Roads Fellowship', details: '1,240 boxes', timestamp: '2026-11-19T14:15:00Z', region: 'Northwest' },
  { id: 'a4', type: 'checkin', message: 'Cornerstone Church — 89 shoeboxes checked in', locationName: 'Cornerstone Church', details: '89 shoeboxes', timestamp: '2026-11-19T14:05:00Z', region: 'Southeast' },
  { id: 'a5', type: 'milestone', message: 'Midwest Region hit 500,000 shoeboxes!', locationName: 'Midwest Region', details: '500K milestone', timestamp: '2026-11-19T13:50:00Z', region: 'Midwest' },
  { id: 'a6', type: 'checkin', message: "St. Mark's Church — 45 shoeboxes checked in", locationName: "St. Mark's Church", details: '45 shoeboxes', timestamp: '2026-11-19T13:42:00Z', region: 'Southeast' },
  { id: 'a7', type: 'carton', message: 'Carton #891 packed — 24 boxes — Charlotte CDO', locationName: 'Grace Community Church', details: 'Carton #891, 24 boxes', timestamp: '2026-11-19T13:30:00Z', region: 'Southeast' },
  { id: 'a8', type: 'alert', message: "Living Word Church hasn't reported in 24+ hours", locationName: 'Living Word Church', details: 'No update in 24h', timestamp: '2026-11-19T12:00:00Z', region: 'Southeast' },
];

// Region rollups: derived from STATES at module load.
export const REGION_DATA: RegionData[] = REGIONS.map((name, idx) => {
  const inRegion = STATES.filter((s) => s.region === name);
  return {
    id: `r${idx + 1}`,
    name,
    shoeboxCount: inRegion.reduce((sum, s) => sum + s.shoeboxCount, 0),
    goal: inRegion.reduce((sum, s) => sum + s.goal, 0),
    cdoCount: inRegion.reduce((sum, s) => sum + s.cdoCount, 0),
    cdoActive: inRegion.reduce((sum, s) => sum + s.cdoActive, 0),
  };
});

export const SPARKLINE_DATA = [
  { day: 'Mon', value: 420_000 },
  { day: 'Tue', value: 580_000 },
  { day: 'Wed', value: 720_000 },
  { day: 'Thu', value: 890_000 },
  { day: 'Fri', value: 1_100_000 },
  { day: 'Sat', value: 950_000 },
  { day: 'Sun', value: 680_000 },
];

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

export function getLocationById(id: string): Location | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

export function getShoeboxesForLocation(locationId: string): number {
  return SHOEBOX_ENTRIES.filter((e) => e.locationId === locationId).reduce((sum, e) => sum + e.count, 0);
}

export function getShoeboxesForCDO(cdoId: string): number {
  const dropoffIds = LOCATIONS.filter((l) => l.centralDropoffId === cdoId).map((l) => l.id);
  const allIds = [cdoId, ...dropoffIds];
  return SHOEBOX_ENTRIES.filter((e) => allIds.includes(e.locationId)).reduce((sum, e) => sum + e.count, 0);
}

export function getCartonsForLocation(locationId: string): Carton[] {
  return CARTONS.filter((c) => c.locationId === locationId);
}

export function getRecentCheckins(locationId?: string, limit = 6): ShoeboxEntry[] {
  const entries = locationId ? SHOEBOX_ENTRIES.filter((e) => e.locationId === locationId) : SHOEBOX_ENTRIES;
  return entries.slice(0, limit);
}

export function getDropoffsForCDO(cdoId: string): Location[] {
  return LOCATIONS.filter((l) => l.centralDropoffId === cdoId);
}

export function getStateById(id: string): StateData | undefined {
  return STATES.find((s) => s.id === id);
}

export function getStatesByRegion(region: Region): StateData[] {
  return STATES.filter((s) => s.region === region);
}

export function getLocationsByState(stateAbbr: string): Location[] {
  return LOCATIONS.filter((l) => l.state === stateAbbr);
}

export function getNationalTotal(): number {
  return STATES.reduce((sum, s) => sum + s.shoeboxCount, 0);
}

export function getNationalGoal(): number {
  return STATES.reduce((sum, s) => sum + s.goal, 0);
}

export function getTopStates(n = 10): StateData[] {
  return [...STATES].sort((a, b) => b.shoeboxCount - a.shoeboxCount).slice(0, n);
}

/**
 * Pace-aware status pill for a state.
 *
 * Day 1-3 grace: pace is held at 40% expected (because real OCC donations are
 * back-loaded — most boxes arrive in the last 3 days). After Day 3 we expect
 * proportional progress (day/8 of goal).
 *
 * Trend mercy: a state hitting >=50% of expected pace BUT trending up earns
 * 'caution' instead of 'behind' — we don't want to alarm Franklin Graham about
 * a state that's actively catching up.
 */
export function getStateStatus(state: StateData, day = COLLECTION_DAY): StateStatus {
  const paceFraction = day <= 3 ? 0.4 : day / COLLECTION_TOTAL_DAYS;
  const expected = state.goal * paceFraction;
  const ratio = expected > 0 ? state.shoeboxCount / expected : 1;

  if (ratio >= 0.95) return 'on_track';
  if (ratio >= 0.7) return 'caution';
  if (ratio >= 0.5 && state.trend === 'up') return 'caution';
  return 'behind';
}

export const STATE_STATUS_CONFIG: Record<StateStatus, { label: string; color: string; bgColor: string }> = {
  on_track: { label: 'On Track', color: '#1A6B3C', bgColor: '#E6F5EC' },
  caution: { label: 'Caution', color: '#D97706', bgColor: '#FEF3C7' },
  behind: { label: 'Behind', color: '#C8102E', bgColor: '#FDE8EB' },
};

export function formatCount(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + 'K';
  return num.toLocaleString();
}

export function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
