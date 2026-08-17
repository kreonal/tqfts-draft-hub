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
   SUBMITTED KEEPERS — players formally declared as keepers for 2026.
   Keyed by ESPN team id, listing ESPN player ids. Add entries as owners
   confirm their keepers; the Keepers screen reads straight from this.
     18: [3117251, 4426348],
--------------------------------------------------------- */
const SUBMITTED_KEEPERS = {};

export function submittedKeeperIdsFor(espnTeamId) {
  return SUBMITTED_KEEPERS[espnTeamId] ?? [];
}
