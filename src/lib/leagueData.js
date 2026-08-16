// Commissioner-managed league data. ESPN does NOT expose any of this, so it
// lives here — edit this file directly to update it.
//
// Verified against ESPN 2026-07: the API hands every team a clean R1–R14
// slate and has no concept of traded future picks, so PICKS_2026 below is the
// source of truth for pick ownership.

const DRAFT_ROUNDS = 14;
const DEFAULT_KEEPER_SLOTS = 2;

/* ---------------------------------------------------------
   MANAGERS — first names only, keyed by ESPN team id.
   ESPN reports full names (and some joke handles like "Wonder Bread"), so
   these override it everywhere the app shows an owner. All 16 teams are
   mapped; the ESPN name is only a fallback if a team id ever changes.
--------------------------------------------------------- */
const MANAGERS = {
  1: "Kendall", // Sophomore Season
  2: "Matt", // The Fister — ESPN says "Mat Pat"
  3: "Shaun", // HOLY BIBLE — ESPN says "Wonder Bread"
  5: "Joey", // Stafford Infection — ESPN says "Sabrina Gertz"
  7: "John", // My Tribal Chief
  8: "Rohan", // Njigbas in Paris
  12: "Minh", // Nine Lives
  13: "Prashant", // Welcome to the Woodshed
  17: "Anthony", // To Infinity and Bijan
  18: "Nick", // Darnold Duck
  19: "Calvin", // Son of GRACE
  20: "Aaron", // The Nabers think im sellin dope
  21: "Henry", // Bishop Sycamore 2.0
  22: "Zack", // Smitty Werbenjagermanjensen
  23: "Alfred", // abceedeeefghijklmnopqrstuvwxyz
  24: "Karan", // STAY TUNED!
};

export function managerFor(espnTeamId, espnFallback) {
  return MANAGERS[espnTeamId] ?? espnFallback ?? "Unknown";
}

/* ---------------------------------------------------------
   KEEPER SLOTS — 2026, keyed by ESPN team id. Unlisted teams get 2.
--------------------------------------------------------- */
const KEEPER_SLOTS = {
  1: 1, // Kendall
  3: 1, // Shaun
  18: 0, // Nick
  21: 5, // Henry
  23: 3, // Alfred
};

export function keeperSlotsFor(espnTeamId) {
  return KEEPER_SLOTS[espnTeamId] ?? DEFAULT_KEEPER_SLOTS;
}

/* ---------------------------------------------------------
   DRAFT PICK INVENTORIES
   A bare number is the team's own pick in that round; `from(round, teamId)`
   marks a pick acquired from another team (shown in the UI as "from Nick").
   Teams not listed hold a full, untraded R1–R14 slate.
--------------------------------------------------------- */
const from = (round, fromTeamId) => ({ round, fromTeamId });

const PICKS_2026 = {
  1: [1, 2, 3, 5, 7, 8, from(8, 18), 9, from(9, 23), 10, 11, 12, 13, 14], // Kendall
  5: [1, 2, 3, from(3, 21), 4, 5, 6, 8, 9, 10, 11, 12, 13, 14], // Joey
  12: [1, 2, 3, 5, 7, 8, 9, from(9, 24), 10, 11, 12, 13, 14, from(14, 24)], // Minh
  18: [1, 2, 6, from(6, 1), 7, from(7, 21), 9, 10, from(10, 24), from(10, 21), 11, 12, 13, 14], // Nick
  21: [1, 2, from(3, 18), 4, 5, from(5, 18), 6, from(7, 5), 8, 9, 11, 12, 13, 14], // Henry
  23: [1, 2, 3, 4, from(4, 1), 5, 6, 7, 8, 10, 11, 12, 13, 14], // Alfred
  24: [1, 2, 3, 4, from(4, 18), from(4, 12), 5, 6, from(6, 12), 7, 8, 11, 12, 13], // Karan
};

// No 2027 trades recorded yet — everyone holds a full slate.
const PICKS_2027 = {};

const INVENTORIES = { 2026: PICKS_2026, 2027: PICKS_2027 };

const fullSlate = () => Array.from({ length: DRAFT_ROUNDS }, (_, i) => i + 1);

export function picksFor(espnTeamId, years) {
  return years.flatMap((year) => {
    const raw = INVENTORIES[year]?.[espnTeamId] ?? fullSlate();
    return raw.map((entry, i) => {
      const { round, fromTeamId } = typeof entry === "number" ? { round: entry } : entry;
      return { id: `pk-${espnTeamId}-${year}-${i}`, year, round, fromTeamId };
    });
  });
}

/* ---------------------------------------------------------
   SUBMITTED KEEPERS — players formally declared as keepers for 2026.
   Keyed by ESPN team id, listing ESPN player ids. Add entries as owners
   confirm their keepers; the Keepers screen reads straight from this.
     18: [3117251, 4426348],
--------------------------------------------------------- */
const SUBMITTED_KEEPERS = {};

export function submittedKeeperIdsFor(espnTeamId) {
  return SUBMITTED_KEEPERS[espnTeamId] ?? [];
}
