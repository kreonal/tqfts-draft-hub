import { managerFor, keeperSlotsFor, picksFor, submittedKeeperIdsFor } from "./leagueData";
import { PICK_YEARS } from "./rules";

const LEAGUE_ID = import.meta.env.VITE_ESPN_LEAGUE_ID || "";
const SEASON = import.meta.env.VITE_ESPN_SEASON || "";

export const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "D/ST", "FLEX"];

/** Groups a roster into [{ pos, players }] in standard lineup order. */
export function byPosition(roster) {
  return POSITION_ORDER.map((pos) => ({
    pos,
    players: roster.filter((p) => p.pos === pos),
  })).filter((g) => g.players.length > 0);
}

/**
 * Pulls the league from our serverless proxy and folds in the
 * commissioner-managed data ESPN doesn't track (real manager names, keeper
 * slots, true pick inventories, submitted keepers).
 */
export async function fetchLeague() {
  const params = new URLSearchParams();
  if (LEAGUE_ID) params.set("leagueId", LEAGUE_ID);
  if (SEASON) params.set("season", SEASON);

  const resp = await fetch(`/api/espn-sync?${params}`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Sync failed (${resp.status})`);
  }
  const data = await resp.json();

  const teams = data.teams.map((team) => {
    const submitted = new Set(submittedKeeperIdsFor(team.espnTeamId));
    return {
      ...team,
      manager: managerFor(team.espnTeamId, team.espnManager),
      keeperSlotsAvailable: keeperSlotsFor(team.espnTeamId),
      picks: picksFor(team.espnTeamId, PICK_YEARS),
      roster: team.roster.map((p) => ({ ...p, submittedKeeper: submitted.has(p.espnPlayerId) })),
    };
  });

  return { league: data.league, drafted: data.drafted, draftSourceSeason: data.draftSourceSeason, teams };
}
