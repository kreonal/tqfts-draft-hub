import React, { useState, useEffect, useCallback } from "react";
import { fetchLeague } from "./lib/espn";
import { CURRENT_SEASON, NEXT_SEASON } from "./lib/rules";
import TeamView from "./views/TeamView";
import KeeperView from "./views/KeeperView";
import DraftBoardView from "./views/DraftBoardView";
import TradeView from "./views/TradeView";

// `hidden` tabs stay fully wired below — they're just not linked in the nav.
// Flip the flag to bring them back for the regular season.
const TABS = [
  { id: "teams", label: "Teams" },
  { id: "keepers", label: "Keepers" },
  { id: "board", label: "Draft Board" },
  { id: "trade", label: "Trade Machine", hidden: true },
  { id: "rules", label: "Bylaws", hidden: true },
];

const VISIBLE_TABS = TABS.filter((t) => !t.hidden);

function RuleBlock({ title, children }) {
  return (
    <section className="card p-4">
      <h3 className="text-sm font-bold text-ink mb-1.5">{title}</h3>
      <p className="text-sm text-sub leading-relaxed">{children}</p>
    </section>
  );
}

function Splash({ children }) {
  return <div className="min-h-screen flex items-center justify-center p-6">{children}</div>;
}

export default function App() {
  const [tab, setTab] = useState("teams");
  const [league, setLeague] = useState(null);
  const [teams, setTeams] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    fetchLeague()
      .then((data) => {
        setTeams(data.teams);
        setLeague(data.league);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err.message || "Failed to sync with ESPN");
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  const teamById = useCallback((id) => teams.find((t) => t.id === id), [teams]);
  const teamByEspnId = useCallback((espnId) => teams.find((t) => t.espnTeamId === espnId), [teams]);

  if (status === "loading") {
    return (
      <Splash>
        <div className="text-sm text-sub">Loading league…</div>
      </Splash>
    );
  }

  if (status === "error") {
    return (
      <Splash>
        <div className="card max-w-md w-full p-6 text-center">
          <div className="text-base font-bold text-espn mb-1.5">Couldn't reach ESPN</div>
          <p className="text-sm text-sub mb-4">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 bg-espn text-white text-sm font-semibold rounded hover:bg-espndark"
          >
            Try again
          </button>
        </div>
      </Splash>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Dark masthead */}
      <header className="bg-nav">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-baseline gap-2.5 min-w-0">
          <span className="self-center bg-espn text-white text-[11px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm shrink-0">
            TQFTS
          </span>
          <span className="self-center text-white font-bold text-[15px] shrink-0">Draft Hub</span>
          <span className="self-center text-white/50 text-[12px] truncate hidden sm:inline">{league?.name}</span>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-white border-b border-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 flex gap-6 overflow-x-auto">
          {VISIBLE_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative py-3 text-[13px] whitespace-nowrap transition-colors ${
                  active ? "text-ink font-bold" : "text-sub font-medium hover:text-ink"
                }`}
              >
                {t.label}
                {active && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-espn rounded-t" />}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {tab === "teams" && <TeamView teams={teams} teamByEspnId={teamByEspnId} />}
        {tab === "keepers" && <KeeperView teams={teams} />}
        {tab === "board" && <DraftBoardView teams={teams} />}
        {tab === "trade" && <TradeView teams={teams} teamById={teamById} />}
        {tab === "rules" && (
          <div className="max-w-3xl space-y-3">
            <RuleBlock title="Keepers">
              Each owner has keeper slots (commissioner-tracked). A player's keeper cost is the round they
              were drafted the previous year, or Round 10 if they went undrafted. No back-to-back keeps —
              anyone kept in 2025 is ineligible this year. Starting with the {CURRENT_SEASON} draft, Rounds
              1–2 selections aren't keeper eligible the following year.
            </RuleBlock>
            <RuleBlock title="Offseason player trades">
              Players can't be traded until a keeper slot is used on them. A keeper-traded player must
              travel with a {CURRENT_SEASON} pick in exactly their keeper-cost round, to the same receiving
              team — a Round 1 keeper travels with the sender's {CURRENT_SEASON} R1 pick. The slot travels
              with the player, so the recipient doesn't need an open slot of their own. Keeper slots can
              also be traded on their own.
            </RuleBlock>
            <RuleBlock title="Draft picks">
              In the offseason both the {CURRENT_SEASON} and {NEXT_SEASON} drafts are tradeable, except{" "}
              {NEXT_SEASON} Rounds 1–2, which stay locked until that offseason. Any number of teams can be
              in a trade, but every team's picks must balance per draft year — whatever a team sends out in
              a given year, they must receive back the same count that same year. Keeper-tied picks count
              toward that balance.
            </RuleBlock>
            <RuleBlock title="FAAB">Tradeable. Does not roll over between seasons.</RuleBlock>
            <RuleBlock title="Once the season starts">
              Only {NEXT_SEASON} picks stay tradeable (still no Rounds 1–2), and the keeper-slot
              requirement on player trades goes away. Flip <code className="text-[12px] bg-hair px-1 py-0.5 rounded">TRADEABLE_YEARS</code> in{" "}
              <code className="text-[12px] bg-hair px-1 py-0.5 rounded">src/lib/rules.js</code> when that happens.
            </RuleBlock>
          </div>
        )}
      </main>
    </div>
  );
}
