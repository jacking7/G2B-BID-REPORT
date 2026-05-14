<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:karpathy-coding-harness -->
# AGENTS.md — Karpathy Coding Harness for Codex

## Default mode
- Make the smallest correct change that moves the product forward.
- Prefer clear code over clever code.
- Keep momentum, but verify before declaring done.

## How to work
- Read the surrounding code before editing.
- Match the existing style unless there is a strong reason to improve it.
- Fix root causes when reasonably scoped, not just symptoms.
- Avoid broad refactors unless they directly unlock the task.
- When behavior changes, update the relevant docs or UI copy.

## For this repo
- Treat `g2b-bid-report` as an MVP in active iteration.
- Preserve working flows first: login, settings, collection, results, export, mail.
- Prefer incremental additions over rewrites.
- Keep Prisma schema, server actions, and UI flows consistent together.
- When touching Next.js behavior, check local docs under `node_modules/next/dist/docs/` first.

## Validation
- Run the narrowest meaningful check first, then broader verification.
- For UI or app-flow changes, prefer at least:
  - `npm run lint`
  - `npm run build`
- If a change affects Prisma schema or DB flow, also verify the relevant Prisma command.

## Safety rails
- Do not commit secrets.
- Do not break `.env` driven behavior.
- Do not remove useful fallback behavior unless replacing it with something clearly better.
- Flag risky assumptions briefly in the final update.

## Delivery
- Summarize what changed in plain language.
- Mention verification actually performed.
- Keep commits focused and readable.
<!-- END:karpathy-coding-harness -->
