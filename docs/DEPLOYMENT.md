# OCC Track — Deployment + Runbook

For the engineer wiring this prototype to production infrastructure.

---

## Deployment topology

```
       ┌─────────────────────────────────────────┐
       │  Cloudflare (DNS + WAF + Turnstile)     │
       └─────────────────┬───────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
       ┌──────▼──────┐       ┌──────▼──────┐
       │ Vercel /    │       │ Telnyx (SMS) │
       │ Netlify     │       │ Resend (email)│
       │ (this app)  │       └─────────────┘
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ Supabase    │  ← signups, audit log, outbox,
       │ (Postgres   │    day-blocks, mode-changes,
       │  + Auth)    │    security-signals, anomaly-state
       └─────────────┘
```

Three deploy-config files are pre-wired at the repo root, ready to point at your host:

- **`vercel.json`** — Vercel deploy with the full HTTP-header CSP stack
- **`netlify.toml`** — Netlify deploy with the same headers
- **`public/_headers`** — Cloudflare Pages format (same policy)

---

## First-time production deploy

### 1. Database

```bash
# Supabase CLI install + init
npx supabase init
npx supabase start
# Schema is documented in TODO.md Part 2, P0.1.
# Migrations to write:
#   001_signups.sql                — signups + arrivedAt + reminderState
#   002_audit_log.sql              — append-only events
#   003_outbox.sql                 — sent / failed / read-receipt
#   004_security.sql               — signals + mode-changes ledger
#   005_kiosk_sessions.sql         — PIN hashes (no plaintext)
#   006_row_level_security.sql     — scope by role/region/CDO
```

### 2. Authentication

Pick one:
- **Supabase Auth** — magic-link out of the box; easy to wire to the existing `/my-signup` flow.
- **Clerk** — better SSO support (Microsoft 365, Google Workspace, Okta).
- **Auth0** — enterprise-grade; SAML/SCIM if SP wants federated identity.

Either way:
- Volunteers use magic-link auth (already designed; just needs server endpoint to mint + verify tokens).
- Super Admin + Regional Admin require **TOTP 2FA**.

### 3. Email + SMS

```bash
# .env.production
RESEND_API_KEY=...
TELNYX_API_KEY=...
```

Wire the `sendMessage()` function in `src/lib/outbox.ts`:
- Email branch → Resend.emails.send(...)
- SMS branch → Telnyx.messages.create(...)
- In-app branch → leave as DB write (existing behavior)

### 4. CAPTCHA

```html
<!-- Replace <TurnstileStub /> in VolunteerSignup with: -->
<div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY" data-callback="onTurnstile" />
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script>
```

Server-side verify endpoint:
```ts
POST /api/captcha/verify { token } →
  fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { secret, response: token })
```

### 5. Security headers + CSP

All three host configs (`vercel.json`, `netlify.toml`, `public/_headers`) ship the
same policy:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'strict-dynamic' 'unsafe-inline'; ...
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), ...
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

Submit your domain to the HSTS preload list once HTTPS works on every subdomain:
https://hstspreload.org/

### 6. WAF + DDoS

- Put Cloudflare in front of the origin.
- Enable **Bot Fight Mode** (free tier) or **Bot Management** (Pro+).
- WAF rules to add:
  - Rate limit `/signup` to 5 submissions per IP per hour
  - Rate limit `/my-signup` lookups to 10 per IP per minute
  - Block requests with empty `User-Agent` header

### 7. Monitoring

- **Sentry** (errors): create project, drop DSN into `.env.production`. `ErrorBoundary` already exists; wire `componentDidCatch` to `Sentry.captureException`.
- **Uptime monitoring**: StatusCake or BetterStack hitting `/` every 1 minute.
- **PagerDuty rotation** for `token_bruteforce_lockout` + `clear_all_signups` audit events.

---

## Anomaly response playbook

When you (Super Admin) get a notification, here's what to do.

### Honeypot spike (10+ in 5min)

**Likely**: opportunistic spam bot found the signup form.

1. Check `/security` → look at "Top origins". One origin = single bot looping; many = distributed.
2. If single: ban its IP in Cloudflare WAF.
3. If distributed: raise the time-to-fill threshold from 3 → 5 seconds in `src/lib/security.ts`.
4. **Don't panic** — the honeypot defense is working; no fake signups got through.

### Magic-link brute-force lockout

**Likely**: someone guessed/leaked a token format and is probing.

1. Check `/audit-log` → filter "Invalid token". Look at the token-prefix pattern; if all bogus URLs share a prefix, attacker has partial info.
2. Check `/security` → "Top origins" by `invalid_token` count.
3. If urgent: **reissue all active editTokens** by running:
   ```sql
   UPDATE signups SET edit_token = gen_random_uuid()
                     WHERE edit_token_expires_at > NOW();
   ```
   Then mass-email volunteers their new links.
4. Consider lowering the brute-force threshold from 5 → 3 attempts.

### "Cleared all signups" audit event you didn't expect

**Likely**: an admin clicked Clear All by mistake — OR your account is compromised.

1. Check `/audit-log` → filter by your actorId. If you don't recognize the activity, **rotate your password + revoke sessions IMMEDIATELY**.
2. The `clear_all_signups` call only deletes signups in scope. If a Regional Admin cleared their region only, the rest is intact.
3. Restore from your daily DB backup (you're running daily backups, right?).
4. Audit log itself is append-only and immutable; the deletion event is permanent record.

### Tamper detection trips

**Likely**: a browser extension auto-rewrites localStorage. Less likely: targeted attack.

1. Check `/security` → look at the affected key + the actor's browser-origin id.
2. If single origin: probably an extension. Tell the user to disable extensions on the OCC Track domain.
3. If multiple origins: investigate XSS or a malicious browser extension distributed via a phishing campaign.
4. The local data is auto-recovered from the next server fetch (post-backend).

### Test mode is on during real Collection Week

**Critical** — real data is being entered into the test bucket.

1. **STOP. Open `/settings` → flip back to Production mode IMMEDIATELY**.
2. Check the **Mode-change ledger** — see who flipped to test mode + when.
3. Any data entered between the test flip and the production flip is in your DB but **flagged** by the audit log entries. Filter the signups/cartons tables by `created_between(...)` and inspect.
4. If real Collection Week data was accidentally mingled with test data — manual reconciliation via SQL.

---

## Common production tasks

### Add a new role

1. Add the literal to `UserRole` in `src/data/mockData.ts`
2. Add an entry to `ROLE_CONFIG`
3. Update `signupInScopeForUser()` with the new role's scope rules
4. Add a new Dashboard component if needed (or default to one of the existing five)
5. Add unit tests in `src/test/unit/mockData.test.ts` covering the new role's scope

### Add a new private route

1. Create the page in `src/pages/`
2. Add it to `App.tsx` as a `React.lazy()` import + Route
3. Add the URL pattern to `PRIVATE_ROUTES` in `src/components/Layout.tsx` (enables idle lock)
4. Call `useNoIndex()` at the top of the page component
5. Add the route to `public/robots.txt`, `netlify.toml`, `vercel.json`, `public/_headers` (no-store cache headers)

### Add a new translation key

1. Add the key to BOTH `en` and `es` dictionaries in `src/lib/i18n.tsx`
2. Use `const { t } = useTranslation()` in the component
3. Reference: `t('key.path', { interpolation: 'value' })`
4. For pluralization, branch on `locale === 'es'` in the component (we don't have an ICU plural runtime)

### Manually fire the reminder dispatcher

`/outbox` → "Run dispatcher" button (Super Admin only). Plans + sends every overdue
T-7/T-1/day-of reminder per signup, idempotent via `reminderState`.

In production, this should be a cron at a real backend — every hour during the
month before Collection Week.

---

## Backup + disaster recovery

- **Daily encrypted DB backups** via Supabase's built-in daily snapshots + offsite S3 mirror.
- **Test restore quarterly** — pick a random backup, restore to staging, verify volunteer signups + audit log are intact.
- **RTO/RPO targets** for SP-OCC: Recovery Time Objective 4 hours, Recovery Point Objective 24 hours (lose ≤1 day of signup data in worst case).

---

## Going live checklist

Before announcing the URL to real volunteers:

- [ ] Real backend deployed (Supabase + auth + API)
- [ ] CAPTCHA wired (Turnstile site key in env, server-side verify endpoint)
- [ ] Email/SMS providers wired (Resend + Telnyx)
- [ ] Cloudflare in front of origin with Bot Fight Mode + WAF rules
- [ ] Sentry capturing client + server errors
- [ ] Uptime monitor pinging every minute
- [ ] PagerDuty rotation for critical alerts
- [ ] Daily DB backups + offsite mirror enabled
- [ ] One restore drill completed
- [ ] HSTS preload submitted
- [ ] App mode set to **PRODUCTION** (and not flipped by mistake)
- [ ] All Super Admin / Regional Admin accounts have TOTP 2FA
- [ ] Privacy policy + ToS pages live + linked from `/signup` footer
- [ ] Cookie consent banner shown (if any EU traffic possible)
- [ ] At least one E2E smoke test passing in CI against the production URL

See [`TODO.md`](../TODO.md) Part 2 for the full gap inventory.
