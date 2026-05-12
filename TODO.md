# OCC Track — Master TODO

**Last audit:** Phase 28 complete + dev preview live at
`https://attendance-generations-heading-stating.trycloudflare.com`.

This document inventories everything the prototype already has, then maps
every remaining gap a real Samaritan's Purse / Operation Christmas Child
deployment at $100M+ scale would need. Items are sized for a single
engineer-week of focused work; priorities reflect what blocks production.

---

## Status snapshot

| Metric | Count |
|---|---|
| Routes | 23 |
| Components | 80 |
| Lib + hooks | 14 |
| TypeScript LOC | ~12,000 |
| Commits since Phase 14 | 12 |
| Tests | **0** (Vitest configured but unused) |
| Real backend | **0** (everything is localStorage) |

---

## Part 1 — What's already built (Phases 1-28)

### Public volunteer flow
- [x] **Volunteer signup wizard** (`/signup`) — 3 steps: intro → contact → details. Auto-routes to closest CDO from ZIP code.
- [x] **Magic-link self-service** (`/my-signup?token=...`) — Volunteer edits own info via capability URL; 90-day expiry with sliding renewal.
- [x] **Lost-link recovery** — "Email me my edit link" flow from `/my-signup` with no token.
- [x] **Welcome Table iPad kiosk** (`/welcome-table?loc=cdo1`) — Fullscreen tap-to-arrive, PIN-locked, celebratory confirmation overlay.
- [x] **Clock kiosk** (`/clock?loc=cdo1`) — QR-scan style entry for regular church volunteers.
- [x] **Spanish toggle** — EN/ES on the public signup intro; full key set in `i18n.tsx` for both languages.
- [x] **Christmas/SP brand flair** — Stars, snowflakes, shoeboxes, heart-cross watermarks; "In Jesus' Name" tagline; SP-style underline accent.

### Admin / leadership flow
- [x] **Signups & Schedule** (`/signups`) — Roster, search, sort, CDO scope, PII blur, duplicate detection, attendance, schedule editing, day blocking.
- [x] **Bulk CSV import** with per-row validation + audit trail.
- [x] **Cross-CDO transfer** with bidirectional CDO Leader notifications.
- [x] **Token refresh** — Resend (keep token) and Reissue (revoke old) magic links.
- [x] **Print-ready badges** (`/badges`) — Avery 5390 layout, 8 per page.
- [x] **Dashboards** by role — Super/SP Admin, Regional, CDO Leader, DO Leader, Greeter all have distinct dashboards.
- [x] **Live notifications drawer** in Navbar, sourced from outbox.
- [x] **Idle auto-lock** — Admin pages blur + require re-confirm after 15 min idle.

### Privacy + audit
- [x] **Audit log** (`/audit-log`) — Every PII access tracked with actor/role/target/timestamp. Retention purge (90/180/365 day) + full wipe.
- [x] **PII blur on roster** — Default-blurred; click row to reveal; auto-restore after 30s.
- [x] **Role-based access** — Super Admin > SP Admin > Regional > CDO Leader > DO Leader > Greeter, cascading flags.
- [x] **Scope filter** — `signupInScopeForUser` enforces "who sees what" consistently.

### Security / anti-scraping
- [x] **Honeypot** on signup (off-screen field).
- [x] **Time-to-fill** check (3-second minimum).
- [x] **Per-browser submit throttle** (10-second cooldown).
- [x] **CAPTCHA stub** (Turnstile-shaped interface, awaits real site key).
- [x] **Magic-link brute-force lockout** (5 fails in 5min → 15-min wall).
- [x] **Tamper detection** — FNV-1a checksums on protected localStorage keys, audited every 30s.
- [x] **Security Center** (`/security`) — Live signal feed, per-origin rollup, production hardening checklist.
- [x] **Anomaly detector** — Per-kind thresholds, anti-fatigue cooldowns, alerts via outbox.
- [x] **Kiosk PIN** — SHA-256 hashed PIN gates iPad kiosk; constant-time compare; 5 wrong → reset.
- [x] **CSP + headers** — Tight allowlist in index.html meta + netlify.toml + vercel.json + public/_headers.
- [x] **robots.txt + per-page noindex** on every private route.

### Messaging (mocked)
- [x] **Notification outbox** (`/outbox`) — All email/SMS/in-app messages captured for inspection.
- [x] **Scheduled reminders** — T-7d / T-1d / day-of dispatcher with idempotency keys.
- [x] **Mode-change audit ledger** — Every test/production flip recorded.

### Data integrity
- [x] **Test/Production app-mode** — Default production; shoebox + carton entry locked unless Super Admin flips to test mode (banner appears).
- [x] **Per-CDO scoping** — Signups carry locationId; CDO Leader sees only their CDO; Regional sees their region.
- [x] **Duplicate detection** — Email + phone normalized matching with non-blocking warning.

### Deployment-ready
- [x] **vercel.json + netlify.toml + public/_headers** — Full security header policy pre-wired for any host.
- [x] **vite.config.ts** — Allows tunnel hosts (cloudflared / ngrok / loca.lt / lhr.life).
- [x] **Live dev preview** at `https://attendance-generations-heading-stating.trycloudflare.com` (ephemeral, restart on reboot).

---

## Part 2 — What still needs to be done

### P0 — Blocks production launch

These items are non-negotiable for shipping to a real $100M ministry org.
The current build is a high-fidelity prototype; this list is the gap
between prototype and production.

#### P0.1 Backend infrastructure
- [ ] **Postgres database** (Supabase or RDS) replacing all localStorage keys. _XL · 1-2wk._
  - Tables: signups, audit_log, outbox_messages, security_signals, day_blocks, day_times, mode_changes, kiosk_sessions, anomaly_state.
  - Indexes on email, phone, locationId, editToken, timestamp.
  - Row-level security policies enforcing role + scope at the DB layer.
- [ ] **Authentication system** — Real login replacing the mock role-switcher. _L · 1wk._
  - Email + password OR SSO (Microsoft 365 if SP uses it, Google Workspace, or Okta).
  - Magic-link auth for volunteers (already designed; just needs a server endpoint).
  - 2FA for Super Admin + Regional Admin (TOTP via authenticator app).
- [ ] **API layer** — REST or tRPC routes for every page. _XL · 1-2wk._
  - All localStorage reads become server reads, server-side enforced scope.
  - No client-side role checks (currently bypassable in devtools).
- [ ] **Real email delivery** — Resend or SendGrid wired to outbox.sendMessage. _S · 1d._
- [ ] **Real SMS delivery** — Telnyx (per memory notes) wired to outbox SMS messages. _S · 1d._
- [ ] **Real CAPTCHA** — Cloudflare Turnstile site key + server-side verify endpoint. _S · 1d._
  - Replaces the stub in `TurnstileStub.tsx`.
- [ ] **Server-side rate limits** — At Cloudflare WAF or middleware (per-IP signup throttle, magic-link probe cap). _M · 2-3d._
- [ ] **Server-side magic-link verification** — Currently client checks the token; server should be the gate. _M · 2-3d._
- [ ] **Audit log immutable storage** — Append-only DB (e.g. AWS QLDB) so even Super Admin can't edit history. _L · 1wk._

#### P0.2 Compliance / legal
- [ ] **Privacy policy** (`/privacy`) — Required for collecting PII. Match SP's existing privacy policy + add OCC-Track-specific data flows. _M · 2d._
- [ ] **Terms of service** (`/terms`) — Volunteer agreement, liability waiver included or linked. _M · 2d._
- [ ] **Cookie consent banner** — GDPR / ePrivacy compliant if any non-US donors visit. _S · 1d._
- [ ] **Right-to-be-forgotten flow** — Volunteer can request deletion; admin confirms; audit log records the deletion event. _M · 2d._
- [ ] **Data export for user** — Volunteer can download all data we hold on them (GDPR Article 20). _S · 1d._
- [ ] **Data retention policy document** — Match the 90-day audit log purge UI to a written policy. _S · 1d._
- [ ] **Background check integration** for volunteers working directly with kids — Checkr or Sterling API. _L · 1wk._
- [ ] **Photo release form** (e-signed during signup) — kids in shoebox-receiving country photos can't identify minor volunteers without consent. _M · 2-3d._
- [ ] **COPPA review** if under-13 volunteer data is ever collected (some churches involve kids in packing). _S · 1d audit._
- [ ] **SOC 2 prep** — If SP-OCC needs SOC 2 Type II for enterprise donor confidence. _XL · 6mo audit cycle._

#### P0.3 Deployment infrastructure
- [ ] **Production deploy** — Vercel/Netlify with custom domain (e.g. `track.samaritanspurse.org`). _S · 1d._
- [ ] **Staging environment** — Separate URL + database for QA. _S · 1d._
- [ ] **CI/CD pipeline** — GitHub Actions: tsc + vitest + build + preview deploy per PR. _M · 2d._
- [ ] **WAF + DDoS** — Cloudflare Pro tier in front of origin. Bot Fight Mode + custom WAF rules. _S · 1d._
- [ ] **Sentry / error monitoring** wired to both client + server. _S · 1d._
- [ ] **Uptime monitoring** (StatusCake or BetterStack) with PagerDuty integration for Super Admin. _S · 1d._
- [ ] **Backup + disaster recovery** — Daily encrypted backups + tested restore runbook. _M · 2d._
- [ ] **Secrets management** — Move every API key out of code into Doppler/Vault/AWS Secrets Manager. _S · 1d._
- [ ] **HSTS preload list submission** — After confirming HTTPS works on all subdomains. _S · 1hr._

#### P0.4 Real anomaly routing
- [ ] **Slack/PagerDuty alerts** when honeypot or brute-force spikes — currently in-app + mock email only. _S · 1d._
- [ ] **Email alerts for high-severity anomalies** via real provider. _S · 1d after email is wired._
- [ ] **Anomaly threshold tuning** based on real traffic baselines (placeholders now). _M · 2-3d, post-launch._

---

### P1 — Strong recommendations before scale

#### P1.1 Spanish i18n coverage gaps
The `i18n.tsx` dictionary has keys for the full signup/kiosk surface, but
only `IntroStep` actually consumes them. Wire up the rest:
- [ ] **Contact step** of /signup → use `t('signup.contact.*')` keys. _S · 1hr._
- [ ] **Details step** of /signup → use `t('signup.details.*')` keys including form field labels. _S · 2hr._
- [ ] **Done step** of /signup → use `t('signup.done.*')` keys including magic-link card. _S · 1hr._
- [ ] **MySignup self-edit** → use `t('mysignup.*')` keys. _S · 1hr._
- [ ] **Welcome Table kiosk** → use `t('kiosk.*')` keys (kiosks see Spanish-speaking volunteers most). _S · 1hr._
- [ ] **Lockout pages** → use `t('lockout.*')` keys. _S · 30min._
- [ ] **Additional languages** if needed for the OCC volunteer demographic: Korean, Vietnamese, Mandarin (large in West Coast OCC drives). _M · 2d per language._

#### P1.2 Testing
- [ ] **Unit tests** for `auditLog`, `outbox`, `security`, `tamperDetection`, `appMode`, `i18n`, `kioskPin` — pure functions, easy targets. _M · 3d._
- [ ] **Component tests** with React Testing Library for `SignupCard`, `TurnstileStub`, `LockOverlay`, `KioskPinGate`. _M · 3d._
- [ ] **E2E tests** with Playwright covering: full signup → magic link → edit; admin role switching; CDO scoping; idle lock; tamper detection. _L · 1wk._
- [ ] **Accessibility audit** with axe-core in CI; fix all critical issues. _M · 2-3d._
- [ ] **Load testing** (k6 or Artillery) — simulate 1000 concurrent signups + 100 concurrent admins. _M · 2-3d, post-backend._
- [ ] **Penetration test** by a third party (HackerOne, Bugcrowd, or specialist firm). _XL · 2-4wk lead time._

#### P1.3 Documentation
- [ ] **Admin user guide** — Walkthrough of every admin page, role, action, with screenshots. _M · 3d._
- [ ] **Volunteer user guide** (short!) — Signup → arrive → done. PDF + web. _S · 1d._
- [ ] **Deployment runbook** — Step-by-step deploy/rollback. _S · 1d._
- [ ] **Incident response playbook** — What to do when honeypot trips spike, suspected breach, etc. _M · 2d._
- [ ] **API documentation** (post-backend) — OpenAPI spec + Stoplight or Swagger UI. _M · 2d._
- [ ] **Architecture decision records (ADRs)** documenting the 28 phases of design choices. _M · 3d._
- [ ] **README rewrite** — Project intro, local-dev quickstart, deployment, contribution guidelines. _S · 1d._

#### P1.4 Real-world features absent from prototype
- [ ] **Donations module** — Real OCC accepts $25 "Build a Shoebox Online" donations + recurring giving. _XL · 2-3wk._
- [ ] **Tax-deductible donor receipts** auto-generated PDF, emailed annually. _L · 1wk._
- [ ] **Volunteer hours tracking** for tax-deduction letters. _M · 3-4d._
- [ ] **In-kind donation tracking** — Donated supplies, transport, food, printing. _M · 3-4d._
- [ ] **Multi-year history** — Currently single Collection Week 2026. Add 2025, 2027, etc. archive views. _L · 1wk._
- [ ] **Year-over-year comparisons** on dashboards (this year vs. last year vs. 5-year avg). _M · 3d._
- [ ] **Shoebox journey tracking** — Each box gets an ID; donor enters it at OCC's Discovery Center to see where it went. (Real OCC has this.) _XL · 3-4wk._
- [ ] **Real-time truck/trailer tracking** — GPS feeds from BOL trailers in transit. _L · 1wk._
- [ ] **Volunteer waivers / liability forms** e-signed during signup. _M · 3d._
- [ ] **Church partnership management** — Track participating churches multi-year, project leaders, contacts. _L · 1wk._
- [ ] **Recurring volunteer scheduling** for multi-week events outside Collection Week. _M · 3-4d._
- [ ] **Volunteer skills matching** (drivers, photographers, translators, sign-language). _M · 3d._
- [ ] **Inventory predictions** — ML or simple regression from history to forecast carton needs. _L · 1wk._
- [ ] **Drop-off locator map** for the public — donors find their nearest CDO. _M · 3-4d._
- [ ] **Mobile app shell** — PWA install flow OR React Native wrapper. _L · 1wk PWA, XL · 3wk RN._

---

### P2 — Polish + production-readiness

#### P2.1 Performance
- [ ] **Bundle splitting** — Currently 358KB gzipped one chunk; should split by route. Target <200KB initial. _M · 2-3d._
- [ ] **Lazy-load admin routes** — Volunteer signup shouldn't download AuditLog/Outbox/Security code. _S · 1d._
- [ ] **Image optimization** — Run real OCC logo through ImageOptim, serve WebP + fallback. _S · 1d._
- [ ] **Virtualize long lists** — Roster of 500+ signups should use react-window. _S · 1d._
- [ ] **Service worker** for offline kiosk + dashboard read-only. _M · 2-3d._

#### P2.2 Accessibility (WCAG 2.1 AA)
- [ ] **Keyboard navigation audit** — Every interactive element reachable + visible focus. _M · 2-3d._
- [ ] **Screen reader audit** — JAWS + NVDA + VoiceOver passes. _M · 2-3d._
- [ ] **Color contrast** — Some `text-ink-light/60` placeholders fail AA against `bg-bg-card`. _S · 1d._
- [ ] **Focus management** in modals/dialogs (BulkImportDialog, TransferDialog, LockOverlay). _S · 1d._
- [ ] **Reduced motion** support across all JS animations (not just CSS). _S · 1d._

#### P2.3 UX polish
- [ ] **Onboarding tour** for first-time admins (intro.js or custom). _M · 2-3d._
- [ ] **Contextual help** — `?` icon on each admin page → tooltip with quick reference. _M · 2-3d._
- [ ] **Undo for destructive actions** (clear signups, remove signup, transfer). _S · 1d._
- [ ] **Bulk actions** on signup roster (select multiple → batch email / transfer / remove). _M · 2-3d._
- [ ] **Search across signups** with fuzzy match (Fuse.js). _S · 1d._
- [ ] **Date-range filters** on dashboards. _S · 1d._
- [ ] **Keyboard shortcuts** — `/` to focus search, `g s` to go to signups, etc. _M · 2d._
- [ ] **Dark mode** for night collection events at trucking warehouses. _M · 2-3d._
- [ ] **Print preview** before window.print() on /badges and /signups roster. _S · 1d._

#### P2.4 Security hardening (real production)
- [ ] **CSP nonces** (per-request) replacing `'unsafe-inline'` fallback. _M · 2-3d._
- [ ] **Subresource Integrity** on the Google Fonts stylesheet. _S · 1hr._
- [ ] **Real Cloudflare named tunnel** with custom subdomain (replacing ephemeral trycloudflare URL). _S · 1d._
- [ ] **Security.txt** at `/.well-known/security.txt` per RFC 9116. _S · 30min._
- [ ] **Bug bounty program** — small public reward via HackerOne. _XL · 2-4wk setup._
- [ ] **Annual third-party security audit** budgeted + scheduled. _XL · ongoing._

---

### P3 — Nice-to-have / future

- [ ] **AI assistance for CDO Leaders** — "Suggest who to assign to greeter shift today based on history." _L · 1wk after backend._
- [ ] **Multi-country support** (Canadian OCC, UK OCC) with currency, address formats, regional content. _XL · 2-3wk._
- [ ] **Pre-packed Shoebox builder online** ("$25 we'll pack and ship it for you"). _XL · 3-4wk._
- [ ] **The Greatest Journey program tie-in** — track 12-lesson discipleship attendance in recipient countries. _XL · 4-6wk._
- [ ] **Year-Round Discovery Center** content for partners. _XL · 4-6wk._
- [ ] **Corporate sponsorship dashboard** — Company-level participation tracking + reporting. _L · 1-2wk._
- [ ] **Email marketing automation** for past volunteers ("Collection Week is in 3 months!"). _M · 3-4d._
- [ ] **Social media share cards** for completed signup ("I'm volunteering with OCC this year"). _S · 1d._

---

## Part 3 — Recommended next 30-day sprint

If I were a PM allocating one engineer-week per sprint, the order would be:

| Week | Focus | Outcome |
|---|---|---|
| 1 | **P0.1 backend + P0.3 deployment** | Supabase + Vercel + custom domain. Move localStorage → DB. Real auth. |
| 2 | **P0.2 compliance + P0.4 real email/SMS** | Privacy policy + ToS + Resend + Telnyx + Cloudflare WAF + Turnstile. |
| 3 | **P1.1 i18n + P1.2 testing** | Full Spanish coverage. Unit + component tests. CI green. |
| 4 | **P1.3 docs + P2.2 a11y** | Admin/volunteer guides. WCAG AA pass. Performance pass. |

Then start the P1.4 real-world feature list based on what SP-OCC leadership
prioritizes (donations module, multi-year, etc.).

---

## Part 4 — Open questions for SP-OCC stakeholders

These should be confirmed with the SP-OCC team before backend work begins:

- [ ] What's the canonical SSO provider? Microsoft 365? Google Workspace?
- [ ] Where does volunteer data sit relative to SP's existing donor DB? Same Postgres? Federated? Read-only mirror?
- [ ] How long should audit logs be retained? (We have 90/180/365 day purge; SP may have legal minimum.)
- [ ] What's the SMS provider preference? Telnyx (per memory), Twilio, MessageBird?
- [ ] Is real OCC.org integration desired (volunteer signup is OCC.org's domain too) or is OCC Track a separate URL?
- [ ] What's the on-call rotation for security alerts? Slack channel? PagerDuty schedule?
- [ ] Will Spanish be enforced on the public side? Auto-detect from browser only, or geo-IP?
- [ ] How does this integrate with the existing OCC printed materials (the shoebox label, the "Build a Shoebox" booklet)?

---

## Maintaining this doc

Every commit that completes a P0/P1 item should:
1. Move the item from the body to the "Done" section (Part 1) with a one-line note.
2. Update the status snapshot at the top.
3. If the item revealed new sub-items, add them in the appropriate priority block.

Keep this doc honest: when something is mocked, label it mocked. When
something is removed, remove it here. The TODO is the single source of
truth for "what does production-ready look like."
