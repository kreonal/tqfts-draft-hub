// League bylaws, encoded. The app is currently in OFFSEASON mode — the 2026
// draft hasn't happened yet. When the regular season starts, see the
// IN-SEASON note on TRADEABLE_YEARS and pickLockReason below.

export const CURRENT_SEASON = 2026;
export const NEXT_SEASON = CURRENT_SEASON + 1;
export const PICK_YEARS = [CURRENT_SEASON, NEXT_SEASON];

// Offseason: both draft years are tradeable.
// In-season: change to [NEXT_SEASON] — once the 2026 draft happens, only
// next season's picks can move.
export const TRADEABLE_YEARS = [CURRENT_SEASON, NEXT_SEASON];

const LOCKED_ROUNDS_NEXT_YEAR = [1, 2];
const UNDRAFTED_KEEPER_ROUND = 10;

// R1/R2 selections from this draft forward can't be kept the following year.
// Players on rosters now were drafted in 2025, so this doesn't bite yet — it
// starts mattering for keepers declared after the 2026 draft.
const ROUND1_2_KEEPER_BAN_START_YEAR = 2026;

/** Keeper cost: the round they were drafted last year, or R10 if undrafted. */
export function keeperCost(player) {
  return player.draftRound ?? UNDRAFTED_KEEPER_ROUND;
}

export function keeperStatus(player) {
  if (player.keptLastYear) {
    return {
      eligible: false,
      short: "Kept in 2025",
      reason: "Kept in 2025 — no back-to-back keeps",
    };
  }
  if (
    player.draftYear >= ROUND1_2_KEEPER_BAN_START_YEAR &&
    player.draftRound != null &&
    player.draftRound <= 2
  ) {
    return {
      eligible: false,
      short: "R1–R2 pick",
      reason: `R${player.draftRound} in ${player.draftYear} — R1/R2 not keeper eligible`,
    };
  }
  const cost = keeperCost(player);
  return { eligible: true, short: `R${cost}`, reason: `Keepable at Round ${cost}`, cost };
}

export function pickLockReason(pick) {
  if (pick.year === NEXT_SEASON && LOCKED_ROUNDS_NEXT_YEAR.includes(pick.round)) {
    return `${NEXT_SEASON} R1–R2 are locked until the ${NEXT_SEASON} offseason`;
  }
  // In-season: also lock every CURRENT_SEASON pick once the draft has happened.
  return null;
}

/**
 * transfers: [{ id, kind: 'player'|'pick'|'faab'|'slot', fromTeamId, toTeamId,
 *               playerId?, pickId?, amount? }]
 */
export function validateMultiTrade(participantIds, transfers, teamById) {
  const checks = [];

  const pickTransfers = transfers
    .filter((t) => t.kind === "pick")
    .map((t) => ({ ...t, pick: teamById(t.fromTeamId)?.picks.find((p) => p.id === t.pickId) }))
    .filter((t) => t.pick);

  const playerTransfers = transfers
    .filter((t) => t.kind === "player")
    .map((t) => ({ ...t, player: teamById(t.fromTeamId)?.roster.find((p) => p.id === t.playerId) }))
    .filter((t) => t.player);

  // 1. Tradeable draft years
  const badYear = pickTransfers.filter((t) => !TRADEABLE_YEARS.includes(t.pick.year));
  checks.push({
    label: "Picks are within the tradeable window (upcoming + next draft)",
    pass: badYear.length === 0,
    detail: badYear.length
      ? `${badYear.map((t) => `${t.pick.year} R${t.pick.round}`).join(", ")} not tradeable`
      : `Only ${TRADEABLE_YEARS.join(" & ")} picks involved`,
  });

  // 2. Next year's R1/R2 lock
  const locked = pickTransfers.filter((t) => pickLockReason(t.pick));
  checks.push({
    label: `${NEXT_SEASON} Round 1–2 picks are locked`,
    pass: locked.length === 0,
    detail: locked.length
      ? `${locked.map((t) => `${t.pick.year} R${t.pick.round}`).join(", ")} can't be traded yet`
      : "No locked rounds included",
  });

  // 3. Per-team, per-year pick balance (keeper-tied picks count too)
  const years = [...new Set(pickTransfers.map((t) => t.pick.year))];
  const imbalances = [];
  participantIds.forEach((teamId) => {
    years.forEach((year) => {
      const sent = pickTransfers.filter((t) => t.fromTeamId === teamId && t.pick.year === year).length;
      const received = pickTransfers.filter((t) => t.toTeamId === teamId && t.pick.year === year).length;
      if (sent !== received) {
        imbalances.push(`${teamById(teamId).manager} — ${year}: sends ${sent}, receives ${received}`);
      }
    });
  });
  checks.push({
    label: "Each team's picks balance per draft year (sent = received)",
    pass: imbalances.length === 0,
    detail: imbalances.length ? imbalances.join(" · ") : "All teams balanced across every year involved",
  });

  // 4. Offseason: traded players must be keeper-eligible
  const ineligible = playerTransfers.filter((t) => !keeperStatus(t.player).eligible);
  checks.push({
    label: "Traded players are keeper-eligible",
    pass: ineligible.length === 0,
    detail: ineligible.length
      ? ineligible.map((t) => `${t.player.name}: ${keeperStatus(t.player).reason}`).join(" · ")
      : playerTransfers.length
      ? "All traded players can have a keeper slot applied"
      : "No players in trade",
  });

  // 5. Offseason: each player travels with a pick in their keeper-cost round,
  //    from the same sender to the same recipient.
  const missingTied = [];
  const groups = new Map();
  playerTransfers
    .filter((t) => keeperStatus(t.player).eligible)
    .forEach((t) => {
      const cost = keeperCost(t.player);
      const key = `${t.fromTeamId}|${t.toTeamId}|${cost}`;
      const group = groups.get(key) || { ...t, cost, names: [] };
      group.names.push(t.player.name);
      groups.set(key, group);
    });
  groups.forEach((g) => {
    const attached = pickTransfers.filter(
      (p) =>
        p.fromTeamId === g.fromTeamId &&
        p.toTeamId === g.toTeamId &&
        p.pick.year === CURRENT_SEASON &&
        p.pick.round === g.cost
    ).length;
    g.names.slice(attached).forEach((name) => {
      missingTied.push(`${name} needs ${teamById(g.fromTeamId).manager}'s ${CURRENT_SEASON} R${g.cost} pick attached`);
    });
  });
  checks.push({
    label: "Each traded player travels with their keeper-cost pick",
    pass: missingTied.length === 0,
    detail: missingTied.length
      ? missingTied.join(" · ")
      : playerTransfers.length
      ? "Every traded player has their tied pick attached"
      : "No players in trade",
  });

  // 6. Keeper slots: each traded player consumes one, plus any bare slots sent.
  const overCap = [];
  participantIds.forEach((teamId) => {
    const team = teamById(teamId);
    if (!team) return;
    const used =
      playerTransfers.filter((t) => t.fromTeamId === teamId).length +
      transfers.filter((t) => t.kind === "slot" && t.fromTeamId === teamId).length;
    if (used > team.keeperSlotsAvailable) {
      overCap.push(`${team.manager}: needs ${used}, has ${team.keeperSlotsAvailable}`);
    }
  });
  checks.push({
    label: "Keeper slots cover traded players + traded slots",
    pass: overCap.length === 0,
    detail: overCap.length ? overCap.join(" · ") : "All teams within their available keeper slots",
  });

  // 7. FAAB can't be overdrawn
  const overdrawn = [];
  participantIds.forEach((teamId) => {
    const team = teamById(teamId);
    if (!team) return;
    const sent = transfers
      .filter((t) => t.kind === "faab" && t.fromTeamId === teamId)
      .reduce((sum, t) => sum + t.amount, 0);
    if (sent > team.faab) overdrawn.push(`${team.manager}: sends $${sent}, has $${team.faab}`);
  });
  checks.push({
    label: "FAAB sent is within each team's budget",
    pass: overdrawn.length === 0,
    detail: overdrawn.length ? overdrawn.join(" · ") : "No team is overdrawn",
  });

  return { checks, allPass: checks.every((c) => c.pass), pickTransfers };
}
