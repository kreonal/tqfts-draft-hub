import React, { useState } from "react";
import { byPosition } from "../lib/espn";
import { keeperStatus, pickLockReason, PICK_YEARS } from "../lib/rules";
import { PositionTag, KeeperBadge, PickChip, Legend, Stat } from "../components/ui";

function PickInventory({ team, teamByEspnId }) {
  return (
    <div className="space-y-1.5">
      {PICK_YEARS.map((year) => {
        const picks = team.picks.filter((p) => p.year === year).sort((a, b) => a.round - b.round);
        return (
          <div key={year} className="flex flex-wrap items-center gap-1">
            <span className="w-9 shrink-0 text-[11px] font-semibold text-sub tabular-nums">{year}</span>
            {picks.map((pick) => (
              <PickChip
                key={pick.id}
                pick={pick}
                locked={pickLockReason(pick)}
                origin={pick.fromTeamId ? teamByEspnId(pick.fromTeamId)?.manager : null}
              />
            ))}
          </div>
        );
      })}
      <Legend />
    </div>
  );
}

function PlayerRow({ player }) {
  const status = keeperStatus(player);
  // Kept as a tooltip: the badge shows the cost, this explains where it came from.
  const drafted =
    player.draftRound != null
      ? `Drafted 2025 · Round ${player.draftRound}`
      : "Undrafted in 2025 — keeper cost is Round 10";
  return (
    <tr className={player.submittedKeeper ? "bg-[#f0f9f2]" : undefined}>
      <td className="py-1.5 pl-4 pr-3">
        <span className="font-semibold text-[13px] text-ink">{player.name}</span>
        {player.submittedKeeper && (
          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-good">Keeper</span>
        )}
      </td>
      <td className="py-1.5 pr-3 text-right">
        <KeeperBadge status={status} title={drafted} />
      </td>
    </tr>
  );
}

function TeamCard({ team, teamByEspnId }) {
  const groups = byPosition(team.roster);
  const eligible = team.roster.filter((p) => keeperStatus(p).eligible).length;

  return (
    <div className="card overflow-hidden">
      <div className="cardhead">
        <div className="text-lg font-bold text-ink truncate leading-tight">{team.manager}</div>
        <div className="text-[11px] text-sub truncate">{team.name}</div>
      </div>

      <div className="px-4 py-2.5 border-b border-hair bg-row flex flex-wrap gap-x-6 gap-y-1">
        <Stat label={`keeper slot${team.keeperSlotsAvailable === 1 ? "" : "s"}`} value={team.keeperSlotsAvailable} tone="espn" />
        <Stat label="FAAB" value={`$${team.faab}`} tone="good" />
        <Stat label={`of ${team.roster.length} eligible`} value={eligible} />
      </div>

      <div className="px-4 py-3 border-b border-hair">
        <div className="label mb-2">Draft picks</div>
        <PickInventory team={team} teamByEspnId={teamByEspnId} />
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-hair">
            <th className="label text-left py-1.5 pl-4">2025 Roster</th>
            <th className="label text-right py-1.5 pr-3">Keeper Value</th>
          </tr>
        </thead>
        {groups.map(({ pos, players }) => (
          <tbody key={pos} className="border-b border-hair last:border-0">
            <tr>
              <td colSpan={2} className="bg-row px-4 py-1 border-y border-hair">
                <PositionTag pos={pos} />
              </td>
            </tr>
            {players.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export default function TeamView({ teams, teamByEspnId }) {
  // One team at a time. The select is controlled by this id, so re-selecting
  // simply swaps which team is shown.
  const [selectedId, setSelectedId] = useState("");
  const selected = teams.find((t) => t.id === selectedId);

  return (
    <div>
      <div className="card p-3 mb-4 flex items-center gap-3">
        <label htmlFor="team-select" className="label shrink-0">
          Team
        </label>
        <select
          id="team-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="text-[13px] px-2.5 py-1.5 w-full max-w-sm"
        >
          <option value="">Select a team…</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.manager} — {team.name}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <TeamCard team={selected} teamByEspnId={teamByEspnId} />
      ) : (
        <div className="card py-20 text-center">
          <div className="text-[15px] font-semibold text-ink">Select a team to see their keeper options</div>
          <div className="text-[12px] text-sub mt-1">Rosters, keeper values, slots and draft picks</div>
        </div>
      )}
    </div>
  );
}
