import React from "react";
import { draftBoard, DRAFT_ORDER } from "../lib/leagueData";
import { CURRENT_SEASON } from "../lib/rules";

const COL = 108; // px per team column — keeps the grid readable while scrolling

function Cell({ cell, managerOf }) {
  const traded = cell.currentTeamId !== cell.originalTeamId;
  const owner = managerOf(cell.currentTeamId);
  const original = managerOf(cell.originalTeamId);

  return (
    <div
      style={{ width: COL }}
      title={traded ? `${cell.label} — originally ${original}'s, now ${owner}'s` : `${cell.label} — ${owner}`}
      className={`shrink-0 border-r border-b border-hair px-2 py-1.5 ${traded ? "bg-[#fff6f6]" : "bg-white"}`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] tabular-nums text-faint">{cell.label}</span>
        <span className="text-[9px] tabular-nums text-faint">#{cell.overall}</span>
      </div>
      <div className={`text-[12px] font-semibold truncate leading-tight ${traded ? "text-espn" : "text-ink"}`}>
        {owner}
      </div>
      {traded ? (
        <div className="text-[9px] leading-tight text-espn/70 truncate">acquired from {original}</div>
      ) : (
        <div className="text-[9px] leading-tight text-transparent select-none">·</div>
      )}
    </div>
  );
}

export default function DraftBoardView({ teams }) {
  const managerOf = (espnTeamId) =>
    teams.find((t) => t.espnTeamId === espnTeamId)?.manager ?? `Team ${espnTeamId}`;

  const rounds = draftBoard(CURRENT_SEASON);
  const tradedCount = rounds.flatMap((r) => r.cells).filter((c) => c.currentTeamId !== c.originalTeamId).length;

  return (
    <div>
      <div className="card p-3 mb-4">
        <div className="text-[15px] font-bold text-ink leading-tight">{CURRENT_SEASON} Draft Board</div>
        <div className="text-[11px] text-sub">
          Snake · {rounds.length} rounds · {DRAFT_ORDER.length} teams ·{" "}
          <span className="text-espn font-semibold">{tradedCount} traded picks</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 44 + DRAFT_ORDER.length * COL }}>
            {/* Column headers = draft slot order */}
            <div className="flex sticky top-0 z-10">
              <div className="shrink-0 w-11 bg-nav border-b border-hair" />
              {DRAFT_ORDER.map((id, i) => (
                <div
                  key={id}
                  style={{ width: COL }}
                  className="shrink-0 bg-nav text-white border-r border-white/10 border-b border-hair px-2 py-1.5"
                >
                  <div className="text-[9px] text-white/50 tabular-nums">Pick {i + 1}</div>
                  <div className="text-[12px] font-semibold truncate">{managerOf(id)}</div>
                </div>
              ))}
            </div>

            {rounds.map(({ round, cells }) => (
              <div key={round} className="flex">
                <div className="shrink-0 w-11 bg-row border-r border-b border-hair flex items-center justify-center">
                  <span className="text-[11px] font-bold text-sub tabular-nums">R{round}</span>
                </div>
                {cells.map((cell) => (
                  <Cell key={cell.overall} cell={cell} managerOf={managerOf} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2.5 text-[11px] text-sub">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-line bg-white" />
          original owner
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-espn/30 bg-[#fff6f6]" />
          traded pick
        </span>
        <span className="text-faint">Columns are draft slots · scroll sideways for later picks</span>
      </div>
    </div>
  );
}
