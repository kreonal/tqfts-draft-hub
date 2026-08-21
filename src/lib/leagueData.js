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
   DRAFT ORDER — 2026, first pick to last, by ESPN team id.
   Matches ESPN's draftSettings.pickOrder as of the lottery.
--------------------------------------------------------- */
export const DRAFT_ORDER = [
  24, //  1. Karan
  7, //   2. John
  20, //  3. Aaron
  23, //  4. Alfred
  3, //   5. Shaun
  13, //  6. Prashant
  22, //  7. Zack
  2, //   8. Matt
  19, //  9. Calvin
  5, //  10. Joey
  18, // 11. Nick
  8, //  12. Rohan
  21, // 13. Henry
  12, // 14. Minh
  17, // 15. Anthony
  1, //  16. Kendall
];

/* ---------------------------------------------------------
   PICK TRADES — the single source of truth for who owns what.
   Each entry means: the pick that ORIGINALLY belonged to `from` in that
   round now belongs to `to`. Both the Teams inventories and the Draft Board
   derive from this list, so they can never disagree.

   These were executed in ESPN and then wiped when the roster size changed
   (ESPN rebuilds the draft board on any roster-settings change), so they
   live here until they can be safely re-entered. Verified against ESPN's
   board while the trades were live.
--------------------------------------------------------- */
const TRADES_2026 = [
  { round: 3, from: 18, to: 21 }, // Nick    -> Henry
  { round: 3, from: 21, to: 5 }, //  Henry   -> Joey
  { round: 4, from: 1, to: 23 }, //  Kendall -> Alfred
  { round: 4, from: 12, to: 24 }, // Minh    -> Karan
  { round: 4, from: 18, to: 24 }, // Nick    -> Karan
  { round: 5, from: 18, to: 21 }, // Nick    -> Henry
  { round: 6, from: 1, to: 18 }, //  Kendall -> Nick
  { round: 6, from: 12, to: 24 }, // Minh    -> Karan
  { round: 7, from: 5, to: 21 }, //  Joey    -> Henry
  { round: 7, from: 21, to: 18 }, // Henry   -> Nick
  { round: 8, from: 18, to: 1 }, //  Nick    -> Kendall
  { round: 9, from: 24, to: 12 }, // Karan   -> Minh
  { round: 9, from: 23, to: 1 }, //  Alfred  -> Kendall
  { round: 10, from: 21, to: 18 }, // Henry  -> Nick
  { round: 10, from: 24, to: 18 }, // Karan  -> Nick
  { round: 14, from: 24, to: 12 }, // Karan  -> Minh
];

// No 2027 trades yet — add them here in the same shape when they happen.
const TRADES_2027 = [];

const TRADES = { 2026: TRADES_2026, 2027: TRADES_2027 };

const tradesFor = (year) => TRADES[year] ?? [];

/** Who currently owns the pick originally belonging to `originalTeamId`. */
export function currentOwnerOf(year, round, originalTeamId) {
  const trade = tradesFor(year).find((t) => t.round === round && t.from === originalTeamId);
  return trade ? trade.to : originalTeamId;
}

export function picksFor(espnTeamId, years) {
  return years.flatMap((year) => {
    const trades = tradesFor(year);
    const rounds = Array.from({ length: DRAFT_ROUNDS }, (_, i) => i + 1);

    const kept = rounds
      .filter((round) => !trades.some((t) => t.round === round && t.from === espnTeamId))
      .map((round) => ({ round, fromTeamId: null }));

    const acquired = trades
      .filter((t) => t.to === espnTeamId)
      .map((t) => ({ round: t.round, fromTeamId: t.from }));

    return [...kept, ...acquired]
      .sort((a, b) => a.round - b.round)
      .map((p, i) => ({ id: `pk-${espnTeamId}-${year}-${i}`, year, ...p }));
  });
}

/**
 * The draft board as rounds x draft-order columns. Snake order, so odd rounds
 * run left-to-right and even rounds right-to-left; each team keeps its column.
 */
export function draftBoard(year) {
  const size = DRAFT_ORDER.length;
  return Array.from({ length: DRAFT_ROUNDS }, (_, r) => {
    const round = r + 1;
    const cells = DRAFT_ORDER.map((originalTeamId, slot) => {
      const positionInRound = round % 2 === 1 ? slot + 1 : size - slot;
      return {
        round,
        slot,
        pickInRound: positionInRound,
        originalTeamId,
        currentTeamId: currentOwnerOf(year, round, originalTeamId),
        overall: (round - 1) * size + positionInRound,
        label: `${round}.${String(positionInRound).padStart(2, "0")}`,
      };
    });
    return { round, cells };
  });
}

/* ---------------------------------------------------------
   SUBMITTED KEEPERS — players declared as keepers for the 2026 draft,
   keyed by ESPN team id. `round`/`pick` are the draft slot the keeper
   consumes, which is what puts them on the Draft Board.

   Transcribed from ESPN's League Keepers page (keeper lock: Aug 28 2026).
   ESPN does expose this once the draft runs, but not while keepers are
   merely declared, so it lives here for now.
--------------------------------------------------------- */
const SUBMITTED_KEEPERS = {
  1: [{ playerId: 4429160, round: 1, pick: 16 }], // Kendall — De'Von Achane
  2: [{ playerId: 4431459, round: 7, pick: 8 }], //  Matt    — Tyler Warren
  8: [
    { playerId: 4374302, round: 1, pick: 12 }, //     Rohan   — Amon-Ra St. Brown
    { playerId: 4430878, round: 2, pick: 5 }, //      Rohan   — Jaxon Smith-Njigba
  ],
  19: [
    { playerId: 4723086, round: 9, pick: 9 }, //      Calvin  — Colston Loveland
    { playerId: 4360761, round: 13, pick: 9 }, //     Calvin  — Michael Wilson
  ],
  21: [
    { playerId: 4429795, round: 1, pick: 13 }, //     Henry   — Jahmyr Gibbs
    { playerId: 4685702, round: 8, pick: 4 }, //      Henry   — Quinshon Judkins
    // Both cost R5: Egbuka takes Henry's own R5, Olave the R5 from Nick.
    { playerId: 4567750, round: 5, pick: 13 }, //     Henry   — Emeka Egbuka
    { playerId: 4361370, round: 5, pick: 11 }, //     Henry   — Chris Olave
  ],
  22: [{ playerId: 4429025, round: 13, pick: 7 }], // Zack    — Quentin Johnston
};

export function submittedKeeperIdsFor(espnTeamId) {
  return (SUBMITTED_KEEPERS[espnTeamId] ?? []).map((k) => k.playerId);
}

/* ---------------------------------------------------------
   INELIGIBLE PLAYERS — kept in 2025, so they can't be kept back-to-back.

   Held as a fixed list rather than derived from current rosters: being kept
   in 2025 is a permanent fact for this offseason, but rosters are live, so
   deriving it meant players silently vanished from the list the moment
   someone dropped them. `manager` is who kept them in 2025.
--------------------------------------------------------- */
const INELIGIBLE_2026 = [
  { name: "Jameson Williams", pos: "WR", manager: "Aaron" },
  { name: "Malik Nabers", pos: "WR", manager: "Aaron" },
  { name: "Isaiah Likely", pos: "TE", manager: "Alfred" },
  { name: "George Kittle", pos: "TE", manager: "Anthony" },
  { name: "Jakobi Meyers", pos: "WR", manager: "Anthony" },
  { name: "Derrick Henry", pos: "RB", manager: "Calvin" },
  { name: "Josh Allen", pos: "QB", manager: "Joey" },
  { name: "Drake London", pos: "WR", manager: "John" },
  { name: "Xavier Worthy", pos: "WR", manager: "John" },
  { name: "Brock Bowers", pos: "TE", manager: "Kendall" },
  { name: "Bucky Irving", pos: "RB", manager: "Kendall" },
  { name: "CeeDee Lamb", pos: "WR", manager: "Kendall" },
  { name: "Ja'Marr Chase", pos: "WR", manager: "Kendall" },
  { name: "Jayden Daniels", pos: "QB", manager: "Kendall" },
  { name: "Alvin Kamara", pos: "RB", manager: "Matt" },
  { name: "Justin Jefferson", pos: "WR", manager: "Matt" },
  { name: "Joe Burrow", pos: "QB", manager: "Nick" },
  { name: "Josh Jacobs", pos: "RB", manager: "Nick" },
  { name: "Tee Higgins", pos: "WR", manager: "Nick" },
  { name: "Aaron Jones Sr.", pos: "RB", manager: "Prashant" },
  { name: "Brian Thomas Jr.", pos: "WR", manager: "Prashant" },
  { name: "Justin Herbert", pos: "QB", manager: "Prashant" },
  { name: "Tony Pollard", pos: "RB", manager: "Rohan" },
  { name: "Zach Charbonnet", pos: "RB", manager: "Rohan" },
  { name: "Ladd McConkey", pos: "WR", manager: "Shaun" },
  { name: "Saquon Barkley", pos: "RB", manager: "Shaun" },
  { name: "Lamar Jackson", pos: "QB", manager: "Zack" },
];

export function ineligibleKeepers() {
  return INELIGIBLE_2026;
}

/** Keepers indexed by the draft slot they occupy, for the Draft Board. */
export function keepersBySlot() {
  const map = new Map();
  Object.entries(SUBMITTED_KEEPERS).forEach(([teamId, keepers]) => {
    keepers.forEach((k) => map.set(`${k.round}.${k.pick}`, { ...k, espnTeamId: Number(teamId) }));
  });
  return map;
}
