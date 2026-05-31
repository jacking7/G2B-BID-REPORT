# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-06-01
- Primary product surfaces: login, settings, results, manual, legal pages
- Evidence reviewed: `src/app/globals.css`, `src/app/login/page.tsx`, `src/app/settings/page.tsx`, `src/app/results/page.tsx`, `src/app/manual/page.tsx`

## Brand
- Personality: quiet, operational, trustworthy, fast to scan
- Trust signals: clear production links, legal footer, health check, stable account flows
- Avoid: stacked cards, decorative hero treatment, heavy shadows, nested framed panels, marketing composition

## Product goals
- Goals: let operators configure collection, review bid results, export, and send reports with low friction
- Non-goals: public marketing site, decorative dashboard, consumer social feed
- Success signals: primary workflows are visible without visual noise; tables and forms remain easy to scan

## Personas and jobs
- Primary personas: internal operator and project owner
- User jobs: manage keywords, recipients, schedules, collected notices, exports, and mail sending
- Key contexts of use: repeated desktop operations, occasional mobile checks, production administration

## Information architecture
- Primary navigation: left app navigation for results, settings, manual
- Core routes/screens: `/login`, `/settings`, `/results`, `/manual`, `/privacy`, `/terms`
- Content hierarchy: page title, compact actions, section headers, forms/tables, status messages

## Design principles
- Principle 1: Prefer flat page sections divided by spacing and rules over decorative card containers.
- Principle 1a: Preserve explicit boundaries for repeated operational data such as tables, notice rows, histories, and status lists.
- Principle 2: Keep real controls visibly interactive; remove decorative containers around controls.
- Tradeoffs: The UI should feel less ornamental even if individual sections have fewer boxed boundaries.

## Visual language
- Color: Dracula and light tokens, used sparingly for state and action emphasis
- Typography: compact operational hierarchy with no viewport-scaled type
- Spacing/layout rhythm: dense but breathable 8-18px rhythm
- Shape/radius/elevation: radius only for controls and real framed data, no heavy elevation
- Motion: minimal hover and state transitions only
- Imagery/iconography: text and small icons only where useful; no decorative imagery

## Components
- Existing components to reuse: app shell, forms, tables, theme toggle, manual actions
- New/changed components: CSS-only flattening of panels, login frame, metrics, manual/status lists
- Variants and states: focus, hover, active, error, success, disabled must remain clear
- Token/component ownership: `src/app/globals.css`

## Accessibility
- Target standard: practical WCAG AA contrast and keyboard usability
- Keyboard/focus behavior: preserve visible focus on fields, toggles, buttons, and links
- Contrast/readability: state colors must not be the only signal for critical actions
- Screen-reader semantics: preserve existing headings, lists, forms, and table semantics
- Reduced motion and sensory considerations: keep transitions short and nonessential

## Responsive behavior
- Supported breakpoints/devices: desktop, tablet, mobile web
- Layout adaptations: columns collapse to one column; forms retain full-width controls on mobile
- Touch/hover differences: touch targets stay at least 38-44px where practical

## Interaction states
- Loading: preserve existing disabled/wait states
- Empty: keep plain text empty messages
- Error: keep danger-soft messages
- Success: keep success-soft messages
- Disabled: keep opacity/cursor differences
- Offline/slow network, if applicable: no dedicated state yet

## Content voice
- Tone: direct Korean operational copy
- Terminology: use G2B, 공고, 수집, 발송, 스케줄 consistently
- Microcopy rules: no decorative feature explanations inside operational panels

## Implementation constraints
- Framework/styling system: Next.js App Router with global CSS tokens
- Design-token constraints: no new dependency or external design system
- Performance constraints: CSS-only visual cleanup where possible
- Compatibility constraints: preserve server actions and route behavior
- Test/screenshot expectations: run lint/build and inspect local UI after visual edits

## Open questions
- [ ] Whether to keep the login intro text or reduce it further after operator feedback.
