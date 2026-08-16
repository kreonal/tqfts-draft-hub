// Vercel serverless function — proxies ESPN's fantasy football API server-side
// so cookies/secrets (for private leagues) never reach the client, and so the
// browser doesn't have to deal with ESPN's CORS restrictions.
//
// GET /api/espn-sync?leagueId=90528&season=2026
//
// Returns teams + rosters shaped for the app, with each player's keeper-relevant
// draft round pulled from the most recently completed draft (this season's if
// already drafted, otherwise last season's — since keeper cost is based on
// "the round drafted the previous year").
//
// ESPN has no concept of multi-year tradeable draft picks or this league's
// custom keeper-slot rule, so those stay locally managed on the client.

const POSITION_MAP = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST" };

// This app serves one league, so the defaults are baked in and deployment
// needs no env vars. Env/query still override for local experimentation.
// Bump DEFAULT_SEASON alongside CURRENT_SEASON in src/lib/rules.js — don't
// derive it from the clock, since the fantasy season spans the new year.
const DEFAULT_LEAGUE_ID = "90528";
const DEFAULT_SEASON = 2026;

export default async function handler(req, res) {
  const leagueId = req.query.leagueId || process.env.ESPN_LEAGUE_ID || DEFAULT_LEAGUE_ID;
  const season = Number(req.query.season) || Number(process.env.ESPN_SEASON) || DEFAULT_SEASON;

  try {
    const data = await fetchLeague(leagueId, season, ["mTeam", "mRoster", "mSettings"]);

    const draftSourceSeason = data.draftDetail?.drafted ? season : season - 1;
    const draftData = await fetchLeague(leagueId, draftSourceSeason, ["mDraftDetail"]).catch(() => null);

    const draftMap = new Map();
    (draftData?.draftDetail?.picks || []).forEach((pick) => {
      draftMap.set(pick.playerId, { round: pick.roundId, keeper: !!pick.keeper });
    });

    const membersById = new Map((data.members || []).map((m) => [m.id, m]));
    const totalFaabBudget = data.settings?.acquisitionSettings?.acquisitionBudget ?? 0;

    const teams = (data.teams || []).map((team) => {
      const owner = membersById.get(team.primaryOwner);
      const espnManager = [owner?.firstName, owner?.lastName].filter(Boolean).join(" ").trim();
      const spent = team.transactionCounter?.acquisitionBudgetSpent ?? 0;

      const roster = (team.roster?.entries || []).map((entry) => {
        const player = entry.playerPoolEntry?.player;
        const draftInfo = draftMap.get(entry.playerId);
        return {
          id: `pl${entry.playerId}`,
          espnPlayerId: entry.playerId,
          name: player?.fullName ?? "Unknown Player",
          pos: POSITION_MAP[player?.defaultPositionId] ?? "FLEX",
          // null draftRound => undrafted waiver pickup; app treats that as Round 10 keeper cost.
          draftYear: draftInfo ? draftSourceSeason : null,
          draftRound: draftInfo ? draftInfo.round : null,
          keptLastYear: draftInfo?.keeper ?? false,
        };
      });

      return {
        id: `t${team.id}`,
        espnTeamId: team.id,
        name: (team.name || `Team ${team.id}`).trim(),
        // Real name off the ESPN account. Several are joke handles, so the
        // client overrides these via MANAGERS in src/lib/leagueData.js.
        espnManager: espnManager || owner?.displayName || null,
        faab: Math.max(0, totalFaabBudget - spent),
        roster,
      };
    });

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.status(200).json({
      league: { id: Number(leagueId), season, name: data.settings?.name ?? null },
      // false during the offseason (this season's draft hasn't happened yet) —
      // the client uses this to pick offseason vs in-season trade rules.
      drafted: !!data.draftDetail?.drafted,
      draftSourceSeason,
      teams,
    });
  } catch (err) {
    res.status(502).json({ error: "ESPN fetch failed", detail: String(err?.message || err) });
  }
}

async function fetchLeague(leagueId, season, views) {
  const params = views.map((v) => `view=${v}`).join("&");
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?${params}`;
  const headers = {};
  // Only needed for private leagues; harmless no-op for public ones.
  if (process.env.ESPN_S2 && process.env.ESPN_SWID) {
    headers.Cookie = `espn_s2=${process.env.ESPN_S2}; SWID=${process.env.ESPN_SWID}`;
  }
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`ESPN responded ${resp.status} for season ${season}`);
  return resp.json();
}
