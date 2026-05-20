# G2B Bid Report

<p align="center">
  <strong>Collect Korea G2B bid notices, review matches, export Excel files, and send email reports from one self-hosted console.</strong>
</p>

<p align="center">
  <a href="https://g2b-report.duckdns.org/"><strong>Live Example</strong></a>
  ·
  <a href="#features">Features</a>
  ·
  <a href="#quick-start">Quick Start</a>
  ·
  <a href="#deployment-checklist">Deployment</a>
</p>

G2B Bid Report is a self-hosted web console for collecting Korea G2B public procurement notices by user-defined keywords, reviewing matched results, exporting Excel files, and sending email reports.

The project is built as a small operational MVP: one app, one database, explicit environment variables, and simple deployment primitives.

## Live Example

Try the public example deployment:

```text
https://g2b-report.duckdns.org/
```

The example page shows the production-style console flow while keeping runtime secrets, local database files, and deployment credentials out of the repository.

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
- Light and Dracula-style dark themes

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
| `/api/health` | Database health check |
| `/api/jobs/collect` | Authenticated external collection job endpoint |
| `/api/jobs/send` | Authenticated external mail job endpoint |

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
| `MAIL_FROM` | Email sender address |
| `G2B_API_SERVICE_KEY` | Official G2B Open API service key |
| `G2B_API_LOOKBACK_DAYS` | Number of registration days to search backwards |
| `G2B_API_NUM_ROWS` | Rows per API page |
| `G2B_API_MAX_PAGES_PER_ENDPOINT` | Maximum pages to request per endpoint |
| `G2B_API_CONCURRENCY` | Concurrent API request limit |
| `ENABLE_INTERNAL_SCHEDULER` | Server-wide in-app scheduler switch |
| `INTERNAL_JOB_TOKEN` | Bearer token for external job endpoints |
| `APP_BASE_URL` | Base URL used by job scripts and password reset links |

If SMTP variables are empty, email sending is skipped and recorded as a skipped mail history entry.

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
- Empty SMTP settings intentionally create skipped mail history instead of sending.

## License

MIT
