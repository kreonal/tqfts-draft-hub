import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { keeperStatus } from "../lib/rules";
import { POSITION_COLORS } from "../components/ui";

function Table({ entries, tone }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full zebra table-fixed">
        <thead>
          <tr className="border-b border-line bg-white">
            <th className="label text-left py-2 pl-3">Player</th>
            <th className="label text-left py-2 pr-2 w-[28%]">Manager</th>
            <th className="label text-right py-2 pr-3 w-[30%]">
              {tone === "ineligible" ? "Status" : "Keeper cost"}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ player, team, label, fullReason }) => (
            <tr key={player.id} className="border-b border-hair last:border-0 align-middle">
              <td className="py-2 pl-3 pr-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ background: POSITION_COLORS[player.pos] ?? POSITION_COLORS.FLEX }}
                  />
                  <span className="font-semibold text-[13px] text-ink truncate">{player.name}</span>
                  <span className="text-[11px] text-faint shrink-0">{player.pos}</span>
                </div>
              </td>
              <td className="py-2 pr-2 text-[12px] text-ink truncate">{team.manager}</td>
              <td className="py-2 pr-3 text-right">
                <span
                  title={fullReason}
                  className={`inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                    tone === "ineligible"
                      ? "border-espn/30 bg-espn/5 text-espn"
                      : "border-good/30 bg-good/5 text-good"
                  }`}
                >
                  {label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, subtitle, entries, tone, empty }) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <span className="text-[12px] text-faint tabular-nums">({entries.length})</span>
      </div>
      <p className="text-[12px] text-sub mb-2.5 max-w-2xl">{subtitle}</p>
      {entries.length === 0 ? (
        <div className="card py-10 text-center text-[13px] text-sub">{empty}</div>
      ) : (
        <Table entries={entries} tone={tone} />
      )}
    </section>
  );
}

export default function KeeperView({ teams }) {
  const [query, setQuery] = useState("");

  const { ineligible, submitted } = useMemo(() => {
    const ineligible = [];
    const submitted = [];
    teams.forEach((team) => {
      team.roster.forEach((player) => {
        const status = keeperStatus(player);
        if (!status.eligible) {
          ineligible.push({ player, team, label: status.short, fullReason: status.reason });
        } else if (player.submittedKeeper) {
          submitted.push({ player, team, label: `Round ${status.cost}`, fullReason: status.reason });
        }
      });
    });
    const sort = (a, b) =>
      a.team.manager.localeCompare(b.team.manager) || a.player.name.localeCompare(b.player.name);
    return { ineligible: ineligible.sort(sort), submitted: submitted.sort(sort) };
  }, [teams]);

  const filter = (entries) => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.player.name.toLowerCase().includes(q) || e.team.manager.toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-7">
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by player or manager"
          className="w-full text-[13px] pl-8 pr-3 py-2 placeholder:text-faint"
        />
      </div>

      <Section
        title="Ineligible players"
        subtitle="Kept in 2025 — they can't be kept back-to-back, and can't be traded during the offseason."
        entries={filter(ineligible)}
        tone="ineligible"
        empty="No ineligible players"
      />

      <Section
        title="Submitted keepers"
        subtitle="Keepers that owners have locked in for the 2026 draft."
        entries={filter(submitted)}
        tone="submitted"
        empty="No keepers submitted yet"
      />
    </div>
  );
}
