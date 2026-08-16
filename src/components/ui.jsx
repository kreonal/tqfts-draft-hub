import React from "react";
import { Lock } from "lucide-react";

// ESPN's fantasy position colors.
export const POSITION_COLORS = {
  QB: "#f8719d",
  RB: "#36ced0",
  WR: "#58a7ff",
  TE: "#ffaf4b",
  K: "#bd66ff",
  "D/ST": "#a9b0b7",
  FLEX: "#c0c6cc",
};

/** Small colored square + label, the way ESPN tags positions. */
export function PositionTag({ pos }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-[2px] shrink-0"
        style={{ background: POSITION_COLORS[pos] ?? POSITION_COLORS.FLEX }}
      />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-sub">{pos}</span>
    </span>
  );
}

/** Keeper cost, or a muted "ineligible" flag. */
export function KeeperBadge({ status }) {
  if (!status.eligible) {
    return (
      <span
        title={status.reason}
        className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-espn/30 bg-espn/5 text-espn whitespace-nowrap"
      >
        Ineligible
      </span>
    );
  }
  return (
    <span className="shrink-0 text-xs font-bold tabular-nums px-2 py-0.5 rounded border border-line bg-white text-ink">
      R{status.cost}
    </span>
  );
}

/** One draft pick. Own picks are plain; acquired picks carry the source. */
export function PickChip({ pick, origin, locked, active }) {
  const base = "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] tabular-nums";
  if (locked) {
    return (
      <span title={locked} className={`${base} border-hair bg-hair text-faint`}>
        <Lock size={9} />R{pick.round}
      </span>
    );
  }
  return (
    <span
      title={origin ? `Acquired from ${origin}` : "Own pick"}
      className={`${base} ${
        active
          ? "border-espn bg-espn text-white font-semibold"
          : origin
          ? "border-[#b9d9f5] bg-[#eef6fd] text-[#0b5c9e]"
          : "border-line bg-white text-ink"
      }`}
    >
      R{pick.round}
      {origin && <span className={active ? "opacity-90" : "text-[#5b8db8]"}>·{origin}</span>}
    </span>
  );
}

export function Legend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-faint pt-0.5">
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm border border-line bg-white" />own
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm border border-[#b9d9f5] bg-[#eef6fd]" />acquired
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm border border-hair bg-hair" />locked
      </span>
    </div>
  );
}

export function Stat({ label, value, tone }) {
  const toneClass = tone === "good" ? "text-good" : tone === "espn" ? "text-espn" : "text-ink";
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-sm font-bold tabular-nums ${toneClass}`}>{value}</span>
      <span className="text-[11px] text-sub">{label}</span>
    </div>
  );
}
