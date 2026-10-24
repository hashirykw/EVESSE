# Evessé by Dr. Faria — design notes

## Reference scan (rated /10 for what Evessé should borrow)

| Reference | What it does well | Score | Borrowed |
|---|---|---|---|
| ME Dermatology (koallastudio, Awwwards inspiration) | Black/white editorial restraint, skin-concern index pages | 8 | Treatment *index* instead of icon-tile grid |
| Dr. Ariel Ostad (dermatology, US) | Doctor-led storytelling, clear treatment CTAs, before/after discipline | 7 | Doctor credentials as a timeline, CTA on every treatment |
| Institute of Dermatologists (IE) | Fast, calm, education-first | 6 | Skin-education content (the five blood markers) |
| Aesop / 111SKIN / Augustinus Bader (luxury skincare) | Warm paper tones, serif display, very few colours, product as still life | 9 | Cream paper, wine + gold only, still-life photography (the gloved business card) |
| Haut.AI-style skin analysis UIs | Scanner reticle, mono readouts over a skin macro | 8 | The hero "dermascope lens" — but with real definitions, never fake scores |
| Typical med-spa templates (Framer/WP marketplaces) | Pink gradients, stock smiles, 3-column icon grids, full-screen menus | 3 | Nothing — this is the look we avoid |

## What Evessé's own material says

- Brand colours: wine `#6b1824`-ish, gold leaf, cream card stock; forest green on the hair line.
- Script wordmark "Evessé" + spaced-caps "SKIN & AESTHETIC CLINIC".
- The new North Nazimabad branch uses candle-lit gold and stone — the hero's dark, warm register comes from there.
- Her story (Brandsynario feature): MBBS → postgraduate dermatology → aesthetic medicine training in the USA → Evessé. Values: dermatology-led, evidence-based, personal, premium.

## Signature moves

1. **Dermascope hero** — WebGL skin macro; the lens magnifies and names the structure under it (stratum corneum, pores, vermilion border…). Definitions only, no invented measurements.
2. **3D skin cross-section** — Three.js model of epidermis / dermis / hypodermis with follicles, vessels and fat lobules; each layer lists the Evessé treatments that work there.
3. **Five markers** — her own hair-loss blood-marker thresholds (ferritin, vitamin D, B12, zinc, TSH) as an interactive range strip.

## Rules kept

- No text fade-in on load; preloader ≤ 1 s and once per session.
- Mobile menu and chat open as compact cards, never full-screen.
- Every image is WebP in `assets/img`, every video in `assets/video`, all libraries and fonts vendored locally.

## Review log (desktop 1440 · tablet 768/1024 · mobile 390/320)

| Round | Area | Score | Fix applied |
|---|---|---|---|
| 1 | Desktop hero | 6.5 | Wordmark traced inverted (box) → re-traced; lede contrast; hero rail clear of chat button |
| 2 | Hero lens | 7 | Softer sharpening, real-scale pores, zoom 1.6× |
| 3 | Mobile home | 6.5 | Headline broke mid-word; lens label moved into a readout above the headline; reels sizing |
| 4–6 | Inner pages | 7 | Lede contrast on dark heroes; stray letters cropped out of two photos; wider treatment image column |
| 7 | Menu + chat (mobile) | 9 | Both open as compact cards, never full screen |
| 8 | Lens labels | 6 → 9 | Zones recalibrated to the photo (melanocytes on freckles, vermilion border on the lip line…) |
| 9 | Performance | 9 | 4G: LCP ≈ 0.3–0.45 s, CLS 0, inner pages ≈ 250 KB; 3D library lazy-loaded |
| 10 | Link preview | 8.5 | 1200×630 OG image; monogram re-traced (was a filled box) |
| 11 | 3D layers | 7.5 → 9 | Stronger exploded view; time-based easing so slow phones animate fully; number-only labels on phones |
| 12 | Tablet hero | 7 → 8.5 | Readout mode below 900 px; lens kept in the right column |
| 13 | Interactions | 9 | Hover peek, reel playback, layer tabs — no console errors |
| 14 | Mobile about/clinics | 8.5 | — |
| 15 | Launch | — | vercel.json caching, sitemap, robots, 404, reels recompressed |
