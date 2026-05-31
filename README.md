# G2B Bid Report

<p align="center">
  <a href="https://github.com/jacking7/G2B-BID-REPORT/releases/tag/v0.1.0"><img alt="Release v0.1.0" src="https://img.shields.io/badge/release-v0.1.0-ff79c6?style=for-the-badge&labelColor=44475a"></a>
  <a href="./LICENSE"><img alt="License MIT" src="https://img.shields.io/badge/license-MIT-f1fa8c?style=for-the-badge&labelColor=44475a"></a>
  <a href="https://nodejs.org/"><img alt="Node >=20" src="https://img.shields.io/badge/node-%3E%3D20-50fa7b?style=for-the-badge&logo=node.js&logoColor=white&labelColor=44475a"></a>
  <a href="https://g2b-report.duckdns.org/"><img alt="Live example online" src="https://img.shields.io/badge/live-online-8be9fd?style=for-the-badge&labelColor=44475a"></a>
</p>

<p align="center">
  <strong>Collect Korea G2B bid notices, review matches, export Excel files, and send email reports from one self-hosted console.</strong>
</p>

<p align="center">
  <a href="https://g2b-report.duckdns.org/"><strong>Live Site</strong></a>
  ·
  <a href="#features">Features</a>
  ·
  <a href="#quick-start">Quick Start</a>
  ·
  <a href="#deployment-checklist">Deployment</a>
</p>

G2B Bid Report is a self-hosted web console for collecting Korea G2B public procurement notices by user-defined keywords, reviewing matched results, exporting Excel files, and sending email reports.

The project is built as a small operational MVP: one app, one database, explicit environment variables, and simple deployment primitives.

## Live Site

Production is published at:

```text
https://g2b-report.duckdns.org/
```

The root route redirects to `/login`. Public trust and legal surfaces are available without exposing runtime secrets, local database files, or deployment credentials.

| Public URL | Purpose |
| --- | --- |
| `/login` | Operator login and first account bootstrap |
| `/privacy` | Korean privacy notice for the internal console |
| `/terms` | Service notice, contact path, license, and responsibility limits |
| `/api/health` | Basic database health check |

Current production smoke target:

```bash
curl https://g2b-report.duckdns.org/api/health
```

## Features

- Next.js App Router web console
- Email/password authentication
- User-specific include and exclude keyword rules
- User-specific recipients and collection/send schedules
- User-level automation on/off plus a server-wide scheduler switch
- Official G2B bid notice Open API collection
- Result filtering by date, mail status, keyword, and free-text query
- Excel export for collected results
- SMTP email report sending with send history
- Password reset, password change, and account withdrawal
- SQLite + Prisma data layer
- Light and Dracula-style dark themes with icon-only toggle controls
- In-app operator manual at `/manual`
- Legal footer with privacy, service notice, MIT license, and GitHub contact links

## Public-Safe Repository Notes

This repository is intended to be safe to share publicly when runtime files stay out of git.

Do not commit:

- `.env` or any real environment file
- Real API keys, SMTP credentials, auth secrets, or job tokens
- Local SQLite databases such as `dev.db`
- Private SSH keys, PEM files, or deployment credentials
- Production hostnames, IP addresses, or server-specific paths unless they are intentionally public

Use `.env.example` as the public template and keep real values only in the runtime environment.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Prisma 7
- SQLite via `better-sqlite3`
- `bcryptjs` for password hashing
- `jose` for signed session cookies
- `nodemailer` for email delivery
- `xlsx` for spreadsheet export
- `node-cron` for optional in-app scheduling

## App Routes

| Route | Purpose |
| --- | --- |
| `/login` | Login, first account creation, password reset request |
| `/reset-password` | Password reset by token |
| `/settings` | Keywords, recipients, schedule, and account management |
| `/results` | Manual collection, filters, exports, mail send, status overview |
| `/manual` | Operator workflow manual |
| `/privacy` | Privacy notice |
| `/terms` | Service notice, contact, and license information |
| `/api/health` | Database health check |
| `/api/collection/start` | Authenticated manual collection start endpoint |
| `/api/collection/status` | Authenticated manual collection progress endpoint |
| `/api/collection/cancel` | Authenticated manual collection cancel endpoint |
| `/api/jobs/collect` | Authenticated external collection job endpoint |
| `/api/jobs/send` | Authenticated external mail job endpoint |
| `/api/mobile/auth/login` | Mobile app email/password login endpoint |
| `/api/mobile/dashboard` | Mobile app dashboard summary endpoint |
| `/api/mobile/collection/start` | Mobile app manual collection start endpoint |
| `/api/mobile/reports/send` | Mobile app pending report send endpoint |

The native mobile app lives in the separate `G2B-BID-REPORT-MOBILE` repository,
but these `/api/mobile/*` routes are owned and deployed by this server app.

## Quick Start

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Open the local app:

```text
http://localhost:3000
```

On a fresh database, the login page prompts for the first operator account.

## Environment Variables

Copy `.env.example` to `.env` and fill in local or production values.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | SQLite database URL, usually `file:./dev.db` for local development |
| `AUTH_SECRET` | Long random secret used to sign session cookies |
| `AUTH_COOKIE_SECURE` | Set `true` for HTTPS deployments, `false` for plain HTTP local/dev use |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password or app password |
| `MAIL_FROM` | Email sender address, optionally with display name such as `G2B-Report <bot@example.com>` |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth web client ID for Google login |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth web client secret |
| `NAVER_OAUTH_CLIENT_ID` | Naver Developers client ID for Naver login |
| `NAVER_OAUTH_CLIENT_SECRET` | Naver Developers client secret |
| `KAKAO_REST_API_KEY` | Kakao Developers REST API key for Kakao login |
| `KAKAO_CLIENT_SECRET` | Optional Kakao client secret, only when enabled in Kakao Developers |
| `G2B_API_SERVICE_KEY` | Official G2B Open API service key |
| `G2B_API_LOOKBACK_DAYS` | Number of registration days to search backwards |
| `G2B_API_NUM_ROWS` | Rows per API page |
| `G2B_API_MAX_PAGES_PER_ENDPOINT` | Maximum pages to request per endpoint |
| `G2B_API_CONCURRENCY` | Concurrent API request limit |
| `ENABLE_INTERNAL_SCHEDULER` | Server-wide in-app scheduler switch |
| `INTERNAL_JOB_TOKEN` | Bearer token for external job endpoints |
| `APP_BASE_URL` | Base URL used by job scripts and password reset links |

If SMTP variables are empty, email sending is skipped and recorded as a skipped mail history entry.

For Gmail SMTP, use an app password instead of the Google account password:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="your-account@gmail.com"
SMTP_PASS="your-16-character-app-password"
MAIL_FROM="G2B-Report <your-account@gmail.com>"
```

Social login redirect URLs:

```text
https://g2b-report.duckdns.org/api/auth/oauth/google/callback
https://g2b-report.duckdns.org/api/auth/oauth/naver/callback
https://g2b-report.duckdns.org/api/auth/oauth/kakao/callback
```

Social login requests and stores only the email address needed to identify the account.
Do not enable profile/name/nickname permissions in provider consoles unless the product explicitly needs them later.

## Collection Rules

Collection runs per user.

1. At least one active include keyword is required.
2. The app queries the official G2B bid notice Open API.
3. A notice must include today's KST date between its notice date and close date.
4. Include keywords are matched against notice title and organization fields.
5. Exclude keywords remove otherwise matched notices.
6. `BidNotice` is upserted by notice number and order.
7. `CollectedResult` is unique per user and notice.
8. API failures do not create partial result rows.

KST date bounds:

```text
noticeDate <= today 23:59:59.999 KST
closeDate >= today 00:00:00.000 KST
```

## Automation Model

Automation has two layers:

- `ENABLE_INTERNAL_SCHEDULER`: server-wide on/off switch
- `ScheduleSetting.active`: per-user on/off switch managed in the UI

The effective status is active only when both are on. External job endpoints also process active schedules only.

## Scripts

```bash
npm run dev          # Start local development server
npm run test         # Run ESLint and TypeScript checks
npm run build        # Generate Prisma Client and build Next.js
npm run start        # Start production Next.js server
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Apply Prisma migrations
npm run db:push      # Push schema directly to the database
npm run job:collect  # Call the external collect job endpoint
npm run job:send     # Call the external send job endpoint
```

## External Job API

External schedulers can trigger collection or sending:

```text
POST /api/jobs/collect
POST /api/jobs/send
```

Required headers:

```text
Authorization: Bearer <INTERNAL_JOB_TOKEN>
Content-Type: application/json
```

Run for all active users:

```json
{}
```

Run for one user:

```json
{
  "userId": "user-id"
}
```

## Health Check

Basic database check:

```bash
curl http://localhost:3000/api/health
```

Example response:

```json
{
  "ok": true,
  "database": "connected",
  "checkedAt": "2026-05-20T00:00:00.000Z"
}
```

Detailed health data requires the internal job token:

```bash
curl "http://localhost:3000/api/health?detailed=1" \
  -H "Authorization: Bearer <INTERNAL_JOB_TOKEN>"
```

## Deployment Checklist

1. Prepare runtime environment variables outside git.
2. Install dependencies.
3. Apply migrations.
4. Run tests.
5. Build the app.
6. Start or restart the process manager.
7. Check `/api/health`.

Example:

```bash
npm install
npm run db:migrate
npm run test
npm run build
npm run start
```

## GitHub-Based Production Deploy

The current production server deploys from the GitHub `main` branch.

```bash
git fetch origin
git pull --ff-only origin main
npm run build
pm2 restart g2b-bid-report --update-env
curl http://localhost:3000/api/health
```

Public post-deploy smoke check:

```bash
curl https://g2b-report.duckdns.org/api/health
curl -I https://g2b-report.duckdns.org/
```

Expected behavior:

- `/api/health` returns `{"ok":true,"database":"connected",...}`
- `/` redirects to `/login`
- The PM2 process `g2b-bid-report` is `online`

## Troubleshooting

### No Collection Results

- Confirm `G2B_API_SERVICE_KEY` is configured.
- Confirm at least one include keyword is active.
- Confirm the target notice is within the configured lookback window.
- Confirm today's KST date is between the notice date and close date.
- Check whether an exclude keyword filtered the result.

### Login or Session Issues

- Use a stable `AUTH_SECRET`.
- Use `AUTH_COOKIE_SECURE=true` behind HTTPS.
- Use `AUTH_COOKIE_SECURE=false` only for local/plain HTTP environments.

### Mail Is Not Sent

- Confirm SMTP variables are configured.
- Confirm the sender account allows SMTP login.
- For Gmail, confirm a Google app password is used and `SMTP_PASS` contains the compact 16-character password.
- Confirm `MAIL_FROM` is either a plain address or a valid display-name format such as `G2B-Report <account@gmail.com>`.
- Empty SMTP settings intentionally create skipped mail history instead of sending.

## License

MIT
