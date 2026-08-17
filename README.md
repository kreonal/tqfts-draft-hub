# TQFTS Draft Hub

Keeper list + trade-legality checker for "The Quest for the Shahbaz" (ESPN
league 90528). Syncs rosters, FAAB and draft-round data live from ESPN, and
validates proposed trades against the league's keeper/pick bylaws.

## Getting started

```bash
npm install
npm run dev
```

No configuration needed — the league id and season are baked in as defaults
(see `.env.example` if you ever need to point it elsewhere).

Then open the printed localhost URL. `npm run dev` is plain Vite — a dev-only
middleware in `vite.config.js` runs `api/espn-sync.js` in-process, so ESPN
sync works locally with no Vercel CLI or account. On Vercel the same file is
picked up natively as a serverless function via the `/api` convention.

## Screens

- **Teams** — pick a manager from the dropdown (one at a time); shows their
  2025 roster grouped by position with each player's keeper round value,
  ineligible players flagged, plus keeper slots, FAAB, and the full
  2026/2027 pick inventory.
- **Keepers** — league-wide list of ineligible players (kept in 2025) by
  manager, and confirmed keeper submissions once you record them.
- **Draft Board** — the full 14-round snake board, columns in draft-order.
  Traded picks are tinted and labelled "acquired from X", and the Highlight
  selector dims everything except one manager's picks.
- **Trade Machine** *(hidden)* — build an N-team trade and check it against
  the bylaws.
- **Bylaws** *(hidden)* — the plain-English rule reference.

No logins: everything is read-only public league data plus local config.

The last two are finished and fully wired, but unlinked from the nav until
the regular season. To bring them back, set `hidden: false` on those entries
in the `TABS` array in `src/App.jsx` — nothing else needs to change.

## Layout

| Path | What it holds |
| --- | --- |
| `api/espn-sync.js` | Serverless proxy to ESPN (works for both dev + prod) |
| `src/lib/leagueData.js` | **Commissioner-managed data — edit this by hand** |
| `src/lib/rules.js` | Bylaws: keeper eligibility + trade validation |
| `src/lib/espn.js` | Fetches the league and folds in local data |
| `src/views/` | `TeamView`, `KeeperView`, `DraftBoardView`, `TradeView` |
| `src/components/ui.jsx` | Shared bits: position tags, keeper badges, pick chips |
| `src/App.jsx` | Shell, tabs, sync/loading/error states |

## Styling

Deliberately modeled on ESPN Fantasy: light surfaces, hairline borders, dense
data tables, system sans-serif, and ESPN red (`#d50a0a`) used sparingly for
the active tab, selected assets, and primary actions. Player rows follow
ESPN's convention of a bold name over a small position/detail subline, with
their fantasy position colors (QB pink, RB teal, WR blue, TE orange, K purple,
D/ST gray) defined in `POSITION_COLORS`.

The palette and type scale live in `tailwind.config.js`; reusable primitives
(`.label`, `.card`, `.zebra`) are in `src/index.css`. The trade recap PNG is
drawn on a canvas in `TradeView.jsx` and mirrors the same light theme, so
change both together if you retheme.

## What comes from ESPN vs. what doesn't

ESPN provides rosters, FAAB balances, and the 2025 draft pick log (which is
how keeper cost and "kept last year" are derived). Since the 2026 draft hasn't
happened, ESPN's 2026 rosters are byte-identical carryovers of 2025's — so
those are the players eligible to be kept.

**ESPN does not model any of the following** (verified 2026-07: the API hands
every team a clean R1–R14 slate and its `futureDraftPicks` array is empty), so
they live in `src/lib/leagueData.js`:

- `MANAGERS` — first names, since several ESPN accounts use joke handles.
  All 16 are mapped; unlisted teams fall back to the ESPN account name.
- `KEEPER_SLOTS` — per-team slot counts (default 2).
- `DRAFT_ORDER` — the 16 ESPN team ids in draft-order.
- `TRADES_2026` / `TRADES_2027` — every pick trade, as
  `{ round, from, to }`, meaning the pick originally belonging to `from` in
  that round now belongs to `to`. Both the Teams inventories and the Draft
  Board derive from this one list, so they cannot disagree.

  **These do not sync from ESPN, and worse, ESPN loses them.** They were
  executed in ESPN and then wiped when the roster size changed — ESPN
  regenerates the draft board from scratch on any roster-settings change,
  resetting every pick to its original owner. If you re-enter them in ESPN,
  do not touch roster settings afterwards. This file is the source of truth.
- `SUBMITTED_KEEPERS` — confirmed keeper declarations, keyed by team id and
  listing ESPN player ids. Currently empty; fill in as owners lock keepers.

## Bylaws encoded

Keeper cost = round drafted the prior year, or R10 if undrafted. No
back-to-back keeps. R1/R2 selections from the 2026 draft onward aren't keeper
eligible the following year.

The app is currently in **offseason** mode:

- Both the 2026 and 2027 drafts are tradeable, except 2027 R1–R2 (locked
  until that offseason).
- Players can't be traded until a keeper slot is used on them, and must
  travel with a 2026 pick in exactly their keeper-cost round to the same
  recipient. The slot travels with the player.
- Keeper slots are tradeable on their own.
- Every team's picks must balance per draft year (sent = received), including
  keeper-tied picks.

**When the regular season starts:** set `TRADEABLE_YEARS` to `[NEXT_SEASON]`
in `src/lib/rules.js`, extend `pickLockReason` to lock the current season, and
drop the keeper-slot requirement on player trades (checks 4–6 in
`validateMultiTrade`).

## Deploying

Vercel needs no configuration: it auto-detects Vite, and `api/espn-sync.js`
is picked up as a serverless function via the `/api` convention. There are no
required environment variables — the league id and season are baked in.

Import the repo at [vercel.com/new](https://vercel.com/new) and accept the
detected settings (Framework: Vite · Build: `npm run build` · Output: `dist`).
Every push to `main` redeploys.

## Not yet built

- Commissioner queue / trade processing workflow
- Re-entering the 2026 pick trades in ESPN (blocked on 11 teams dropping
  down to the 14-player roster limit; see the warning above before doing it)
