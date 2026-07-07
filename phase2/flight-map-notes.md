# Phase 2b — Flight-arc map (implementation contract)

Deferred, separate effort. Never blocks Phase 1. Build only after Phase 2a (tokens) is live.

**Concept:** an Indiana-Jones-style flight map in the wedding palette. Hand-drawn SVG arcs for
the 4 routes (US West Coast → stopover → Coorg/IXE) that draw themselves as the guest scrolls the
travel section. No map tiles, no API keys, no cost.

- **Library:** scrollama (MIT) — the ONLY dependency in the whole project; vendor the minified file
  (`site/vendor/scrollama.min.js`), no CDN.
- **Art:** one inline `<svg viewBox="0 0 1000 500">` with a simplified world outline (single `<path>`,
  Peppercorn stroke at 20% opacity on Blossom), airport dots (Cherry 4px circles), and four route arcs
  as quadratic Béziers — Dubai arc in Laterite, Bangkok in Marigold, Tokyo in Cherry, Delhi in Lichen
  (matching each strip's accent). Every arc terminates at Mangaluru (IXE).
- **Animation:** each arc gets `stroke-dasharray: <length>; stroke-dashoffset: <length>`
  (measure once via `getTotalLength()`), transitioned to `stroke-dashoffset: 0` when scrollama fires
  that route's step. `@media (prefers-reduced-motion: reduce)`: arcs render pre-drawn, no animation.
- **Origin-aware (needs Phase 2a):** `origin: "local"` parties see the map de-emphasized (schedule first);
  `international` parties see the map + full stopover itinerary emphasis.
- **Budget:** SVG + scrollama + map.js < 30KB combined; zero effect on Phase 1 LCP (below the fold, `defer`).
- **Effort:** S-M, a few evenings. Acceptance: scrolling the travel section draws each arc as its strip
  enters; 60fps on a mid-range Android. Re-run Lighthouse after — Performance must stay ≥ 90.
