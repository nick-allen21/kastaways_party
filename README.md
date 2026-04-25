# kastaways_party

Static one-page site for KAstaways (KA Stanford, day party 2026-05-02).
Lives at <https://kastaway.party> — wristband QR scans land here.

The page presents itself as a shortwave distress-signal terminal from the
stranded survivors of the **KREWSHIP**. Time-gated transmissions drop on a
schedule across the two weeks before the party; on each visit, the latest
transmission types out character-by-character on a black-and-phosphor-green
terminal, with a live countdown to the next signal.

## Stack

- Plain HTML + CSS + vanilla JS. No framework, no build step.
- Hosted on Vercel (free tier), domain `kastaway.party` from Porkbun.
- Date-gating is purely client-side (`new Date()`).

## Files

| File | Purpose |
|---|---|
| `index.html` | shell + DOM mounts |
| `styles.css` | terminal aesthetic, scanlines, mobile breakpoints, reduced-motion |
| `transmissions.js` | `TRANSMISSIONS[]` data + key date anchors. **Edit this to change copy.** |
| `app.js` | typewriter, countdown, supplies bar, day counter, signal log |
| `vercel.json` | static deploy config + security headers |

## Editing the copy

All transmission text lives in `transmissions.js`. The schedule is hard-coded:

| # | Drop time (PT) | Label |
|---|---|---|
| T1 | 2026-04-20 12:00 | `SIGNAL_INTERCEPTED` |
| T2 | 2026-04-23 12:00 | `DAY_3` |
| T3 | 2026-04-26 12:00 | `FADING` |
| T4 | 2026-04-28 12:00 | `RESCUE_CANCELLED` |
| T5 | 2026-05-01 12:00 | `TWENTY_FOUR_HOURS` |
| T6 | 2026-05-02 14:00 | `THE_RESCUE_IS_ACTIVE` |
| T7 | 2026-05-04 12:00 | `FINAL_TRANSMISSION` |

After T7, the signal indicator flatlines to gray and the countdown reads
`SIGNAL TERMINATED`.

## Local dev

No build, no deps. Just serve the folder:

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

To preview a specific transmission regardless of current date:

```
http://localhost:8080/?t=4   # forces T4
```

## Deploy

1. Push this repo to GitHub.
2. Vercel → New Project → import this repo. Framework preset: "Other". Root: `/`. Build command: empty. Output dir: `./`.
3. Add custom domains: `kastaway.party` + `www.kastaway.party`.
4. Porkbun DNS: either point nameservers to `ns1.vercel-dns.com` / `ns2.vercel-dns.com`, OR keep Porkbun nameservers and add `A @ → 76.76.21.21` + `CNAME www → cname.vercel-dns.com`.
5. SSL provisions automatically within ~10 min.

## Acceptance

- HTTPS live at `https://kastaway.party`
- First visit: typewriter reveal of current transmission
- Re-visit (same session): instant render, no typewriter
- Live 1s countdown to next transmission
- `SUPPLIES` bar interpolates 100% → 0% from 4/20 noon → 5/2 14:00
- `DAY N OF ██` counter reads correctly
- T4 renders the red `RESCUE CANCELLED` stamp
- T7+: signal indicator + countdown flatline
- Mobile-first; respects `prefers-reduced-motion`

## Source spec

The full markdown spec lives in the planning Drive at
`Parties/KAstaways/webpage-spec.md` (v4, 2026-04-25).
