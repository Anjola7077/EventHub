# EventHub

React + Vite + Tailwind events-discovery web app (frontend; backend is a separate
hosted API). Run with `npm run dev`.

## UI / design work

Before any UI work, follow the **Design Context** below and run the `/impeccable`,
`/ui-ux-pro-max`, and `/polish` skills. Full version lives in `.impeccable.md`.

## Design Context

### Users
General public discovering and joining **local events** (concerts, workshops,
meetups, community gatherings). Mostly on mobile, scanning quickly, need to trust
the event is real while feeling excited to join. Organizers are a secondary user.

### Brand Personality
**Energetic · Social · Bold** — the buzz before something worth showing up to (a
gig, a workshop, a meetup), not admin software and not a nightlife-only app.
Confident, lively, warm, direct. Never cluttered or spammy. Keep copy
event-type-agnostic; avoid "night out" framing, which reads as clubbing.

### Aesthetic Direction
- **Light-led** theme, fully polished **dark** mode supported.
- **Editorial, not templated** — bold display type, asymmetric layouts, varied
  spacing rhythm. Closer to a culture/events magazine than a SaaS dashboard.
- **Color:** electric, confident **blue** as the dominant brand, one **warm accent**
  (coral/tangerine) used sparingly (~10%) for energy/CTAs. Neutrals tinted toward
  the blue hue. Use OKLCH.
- **Type:** Display = **Bricolage Grotesque**, Body = **Hanken Grotesk** (Google
  Fonts). No Inter/Roboto/system-default monoculture.

### Anti-Reference
The **generic AI dashboard**: identical icon-card grids, purple→blue gradients,
cyan/neon-on-dark, glassmorphism everywhere, gradient text, thick colored
left-border stripes, everything centered/evenly-spaced/in-a-card.

### Design Principles
1. **Earn the energy** — bold type + one warm accent + motion on key moments, not
   color everywhere.
2. **Hierarchy through restraint** — mute secondary text, vary weight/size sharply,
   one primary action per view.
3. **Editorial over templated** — break the symmetric grid.
4. **Mobile is the main stage** — adapt layouts, don't shrink or amputate.
5. **Trust is a feature** — show real dates, locations, attendee signals clearly.

### Constraints
Final-year project scope: favor high-impact, low-churn changes. Reuse the shared
token layer in `src/index.css`. Dark mode toggles `.dark` on `<html>` (some legacy
pages thread a `darkMode` prop — migrate toward CSS-variable tokens over time).
