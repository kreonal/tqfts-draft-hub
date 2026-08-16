import React, { useState, useMemo } from "react";
import { Check, X, Plus, Trash2, ChevronUp } from "lucide-react";
import {
  keeperStatus,
  keeperCost,
  pickLockReason,
  validateMultiTrade,
  CURRENT_SEASON,
  PICK_YEARS,
} from "../lib/rules";
import { PositionTag, PickChip } from "../components/ui";

/* ---------------------------------------------------------
   TRADE RECAP IMAGE
--------------------------------------------------------- */
function describeTransfer(t, teamById) {
  if (t.kind === "player") {
    const player = teamById(t.fromTeamId)?.roster.find((p) => p.id === t.playerId);
    return player ? `${player.name} (${player.pos}) — keeper at R${keeperCost(player)}` : "Unknown player";
  }
  if (t.kind === "pick") {
    const pick = teamById(t.fromTeamId)?.picks.find((p) => p.id === t.pickId);
    return pick ? `${pick.year} Round ${pick.round} pick` : "Unknown pick";
  }
  if (t.kind === "faab") return `$${t.amount} FAAB`;
  if (t.kind === "slot") return "1 keeper slot";
  return "";
}

function drawTradeRecap({ participantIds, transfers, result, teamById }) {
  const scale = 2;
  const W = 900;

  // Height is computed from the exact same step sizes the draw loop below
  // uses, so the image ends snugly under the last line.
  const BODY_TOP = 140;
  const listHeight = (n) => (n === 0 ? 21 : n * 20);
  const teamsHeight = participantIds.reduce((sum, teamId, idx) => {
    const gets = transfers.filter((t) => t.toTeamId === teamId).length;
    const gives = transfers.filter((t) => t.fromTeamId === teamId).length;
    const separator = idx < participantIds.length - 1 ? 22 : 0;
    return sum + 22 + 17 + listHeight(gets) + 17 + listHeight(gives) + 6 + separator;
  }, 0);
  const H = BODY_TOP + teamsHeight + 30 + 20 + result.checks.length * 19 + 46;

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  const bg = "#ffffff", line = "#d6d7d8", hair = "#e9eaeb";
  const ink = "#1d1d1d", sub = "#6c6c6c", accent = "#d50a0a", green = "#1a7f37";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dark masthead
  ctx.fillStyle = "#1a1d21";
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = accent;
  ctx.fillRect(32, 22, 52, 20);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px Arial";
  ctx.fillText("TQFTS", 40, 36);
  ctx.font = "bold 19px Arial";
  ctx.fillText("Trade Recap", 96, 38);

  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const meta = `${CURRENT_SEASON} Offseason  ·  ${dateStr}  ·  ${participantIds.length}-team trade`;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "12px Arial";
  ctx.fillText(meta, W - 32 - ctx.measureText(meta).width, 38);

  // Verdict pill
  const pass = result.allPass;
  const label = pass ? "LEGAL" : "NEEDS REVIEW";
  ctx.font = "bold 12px Arial";
  const pillW = ctx.measureText(label).width + 20;
  ctx.fillStyle = pass ? green : accent;
  ctx.beginPath();
  ctx.roundRect(32, 84, pillW, 22, 3);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, 42, 99);

  let y = BODY_TOP;
  participantIds.forEach((teamId, idx) => {
    const team = teamById(teamId);
    ctx.fillStyle = ink;
    ctx.font = "bold 16px Arial";
    ctx.fillText(team.manager, 32, y);
    // Measure while the bold face is still active, then step past it.
    const managerWidth = ctx.measureText(team.manager).width;
    ctx.fillStyle = sub;
    ctx.font = "12px Arial";
    ctx.fillText(team.name, 32 + managerWidth + 10, y);
    y += 22;

    [
      ["RECEIVES", transfers.filter((t) => t.toTeamId === teamId), "+", (t) => teamById(t.fromTeamId).manager, "from", green],
      ["SENDS", transfers.filter((t) => t.fromTeamId === teamId), "−", (t) => teamById(t.toTeamId).manager, "to", accent],
    ].forEach(([heading, list, sign, otherName, preposition, color]) => {
      ctx.fillStyle = sub;
      ctx.font = "bold 10px Arial";
      ctx.fillText(heading, 32, y);
      y += 17;
      if (list.length === 0) {
        ctx.fillStyle = "#9a9a9a";
        ctx.font = "italic 13px Arial";
        ctx.fillText("Nothing", 48, y);
        y += 21;
      } else {
        list.forEach((t) => {
          ctx.fillStyle = color;
          ctx.font = "bold 13px Arial";
          ctx.fillText(sign, 48, y);
          const description = describeTransfer(t, teamById);
          ctx.fillStyle = ink;
          ctx.font = "13px Arial";
          ctx.fillText(description, 62, y);
          ctx.fillStyle = sub;
          ctx.fillText(`  (${preposition} ${otherName(t)})`, 62 + ctx.measureText(description).width, y);
          y += 20;
        });
      }
    });

    y += 6;
    if (idx < participantIds.length - 1) {
      ctx.strokeStyle = hair;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, y);
      ctx.lineTo(W - 32, y);
      ctx.stroke();
      y += 22;
    }
  });

  y += 8;
  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(32, y);
  ctx.lineTo(W - 32, y);
  ctx.stroke();
  y += 22;

  ctx.fillStyle = sub;
  ctx.font = "bold 10px Arial";
  ctx.fillText("BYLAW CHECKS", 32, y);
  y += 20;
  result.checks.forEach((c) => {
    ctx.fillStyle = c.pass ? green : accent;
    ctx.font = "bold 12px Arial";
    ctx.fillText(c.pass ? "✓" : "✕", 32, y);
    ctx.fillStyle = c.pass ? "#3d3d3d" : accent;
    ctx.font = "12px Arial";
    ctx.fillText(c.label, 48, y);
    y += 19;
  });

  ctx.fillStyle = "#9a9a9a";
  ctx.font = "italic 12px Arial";
  ctx.fillText("Reply to this message to confirm — all owners must agree before it's processed.", 32, H - 26);

  return canvas.toDataURL("image/png");
}

function TradeRecapModal({ participantIds, transfers, result, teamById, onClose }) {
  const [imgUrl, setImgUrl] = useState(null);
  React.useEffect(() => {
    setImgUrl(drawTradeRecap({ participantIds, transfers, result, teamById }));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-lg w-full p-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {imgUrl && <img src={imgUrl} alt="Trade recap" className="w-full rounded border border-line mb-3" />}
        <div className="flex gap-2">
          <a
            href={imgUrl}
            download={`trade-${Date.now()}.png`}
            className="flex-1 text-center bg-espn text-white text-[13px] font-semibold py-2.5 rounded hover:bg-espndark"
          >
            Save image
          </a>
          <button onClick={onClose} className="px-4 py-2.5 border border-line rounded text-[13px] font-medium text-sub hover:text-ink">
            Close
          </button>
        </div>
        <p className="text-[11px] text-faint mt-2.5 text-center">
          On iPhone: tap and hold the image, then "Add to Photos"
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   TEAM PANEL
--------------------------------------------------------- */
function RecipientSelect({ value, onChange, options, disabled, compact }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className={`shrink-0 text-[11px] ${compact ? "px-1 py-0.5 max-w-[7.5rem]" : "px-2 py-1 max-w-[9rem]"} ${
        value ? "border-espn/50 text-espn font-semibold" : "text-sub"
      }`}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          → {o.manager}
        </option>
      ))}
    </select>
  );
}

function TeamPanel({ team, otherParticipants, transfers, setTransfers, teamByEspnId }) {
  const [faabAmount, setFaabAmount] = useState("");
  const [faabRecipient, setFaabRecipient] = useState(otherParticipants[0]?.id || "");
  const [slotRecipient, setSlotRecipient] = useState(otherParticipants[0]?.id || "");

  const assetKey = (kind, t) => (kind === "player" ? t.playerId : t.pickId);
  const getTransfer = (kind, assetId) =>
    transfers.find((t) => t.kind === kind && t.fromTeamId === team.id && assetKey(kind, t) === assetId);

  const setRecipient = (kind, assetId, toTeamId) => {
    setTransfers((prev) => {
      const filtered = prev.filter(
        (t) => !(t.kind === kind && t.fromTeamId === team.id && assetKey(kind, t) === assetId)
      );
      if (!toTeamId) return filtered;
      const next = { id: `${kind}-${assetId}-${Date.now()}`, kind, fromTeamId: team.id, toTeamId };
      if (kind === "player") next.playerId = assetId;
      if (kind === "pick") next.pickId = assetId;
      return [...filtered, next];
    });
  };

  const faabSent = transfers
    .filter((t) => t.kind === "faab" && t.fromTeamId === team.id)
    .reduce((sum, t) => sum + t.amount, 0);
  const faabRemaining = team.faab - faabSent;

  const playersSent = transfers.filter((t) => t.kind === "player" && t.fromTeamId === team.id).length;
  const bareSlots = transfers.filter((t) => t.kind === "slot" && t.fromTeamId === team.id);
  const slotsRemaining = team.keeperSlotsAvailable - playersSent - bareSlots.length;

  const addFaab = () => {
    const amount = Number(faabAmount);
    if (!amount || amount <= 0 || amount > faabRemaining || !faabRecipient) return;
    setTransfers((prev) => [
      ...prev,
      { id: `faab-${Date.now()}`, kind: "faab", fromTeamId: team.id, toTeamId: faabRecipient, amount },
    ]);
    setFaabAmount("");
  };

  const addSlot = () => {
    if (slotsRemaining <= 0 || !slotRecipient) return;
    setTransfers((prev) => [
      ...prev,
      { id: `slot-${Date.now()}`, kind: "slot", fromTeamId: team.id, toTeamId: slotRecipient },
    ]);
  };

  const rosterGroups = ["QB", "RB", "WR", "TE", "K", "D/ST", "FLEX"]
    .map((pos) => ({ pos, players: team.roster.filter((p) => p.pos === pos) }))
    .filter((g) => g.players.length);

  return (
    <div className="card overflow-hidden self-start">
      <div className="cardhead">
        <div className="font-bold text-[15px] text-ink truncate leading-tight">{team.manager}</div>
        <div className="text-[11px] text-sub truncate">{team.name}</div>
      </div>

      {/* Roster */}
      <div className="max-h-80 overflow-y-auto border-b border-hair">
        {rosterGroups.map(({ pos, players }) => (
          <div key={pos}>
            <div className="bg-row px-3 py-1 border-y border-hair sticky top-0">
              <PositionTag pos={pos} />
            </div>
            {players.map((player) => {
              const status = keeperStatus(player);
              const transfer = getTransfer("player", player.id);
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between gap-2 px-3 py-1.5 border-b border-hair last:border-0 ${
                    transfer ? "bg-espn/5" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`text-[13px] font-semibold leading-tight truncate ${status.eligible ? "text-ink" : "text-faint"}`}>
                      {player.name}
                    </div>
                    <div
                      title={status.reason}
                      className={`text-[11px] leading-tight ${status.eligible ? "text-sub" : "text-espn/70"}`}
                    >
                      {status.eligible
                        ? `Costs 1 slot + ${CURRENT_SEASON} R${keeperCost(player)}`
                        : `${status.short} — can't trade`}
                    </div>
                  </div>
                  <RecipientSelect
                    value={transfer?.toTeamId}
                    onChange={(v) => setRecipient("player", player.id, v)}
                    options={otherParticipants}
                    disabled={!status.eligible}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Picks */}
      <div className="px-3 py-2.5 border-b border-hair">
        <div className="label mb-1.5">Draft picks</div>
        {PICK_YEARS.map((year) => {
          const picks = team.picks.filter((p) => p.year === year).sort((a, b) => a.round - b.round);
          if (!picks.length) return null;
          return (
            <div key={year} className="mb-2 last:mb-0">
              <div className="text-[11px] font-semibold text-sub mb-1 tabular-nums">{year}</div>
              <div className="grid grid-cols-2 gap-1">
                {picks.map((pick) => {
                  const locked = pickLockReason(pick);
                  const transfer = getTransfer("pick", pick.id);
                  const origin = pick.fromTeamId ? teamByEspnId(pick.fromTeamId)?.manager : null;
                  return (
                    <div key={pick.id} className="flex items-center gap-1 min-w-0">
                      <PickChip pick={pick} locked={locked} origin={origin} active={!!transfer} />
                      {!locked && (
                        <RecipientSelect
                          compact
                          value={transfer?.toTeamId}
                          onChange={(v) => setRecipient("pick", pick.id, v)}
                          options={otherParticipants}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Keeper slots */}
      <div className="px-3 py-2.5 border-b border-hair">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="label">Keeper slots</span>
          <span className="text-[11px] text-sub tabular-nums">
            {slotsRemaining} of {team.keeperSlotsAvailable} open
          </span>
        </div>
        <div className="flex gap-1.5 items-center">
          <select
            value={slotRecipient}
            onChange={(e) => setSlotRecipient(e.target.value)}
            className="flex-1 text-[11px] px-2 py-1"
          >
            {otherParticipants.map((o) => (
              <option key={o.id} value={o.id}>→ {o.manager}</option>
            ))}
          </select>
          <button
            onClick={addSlot}
            disabled={slotsRemaining <= 0 || !slotRecipient}
            className="inline-flex items-center gap-1 px-2 py-1 border border-line rounded text-[11px] font-semibold text-ink hover:bg-hair disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={11} />Add
          </button>
        </div>
        {playersSent > 0 && (
          <div className="text-[11px] text-sub mt-1">
            {playersSent} used by traded player{playersSent > 1 ? "s" : ""}
          </div>
        )}
        {bareSlots.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-0.5 text-[11px] text-ink mt-0.5">
            <span>1 slot → {otherParticipants.find((o) => o.id === t.toTeamId)?.manager}</span>
            <button onClick={() => setTransfers((prev) => prev.filter((x) => x.id !== t.id))}>
              <Trash2 size={11} className="text-faint hover:text-espn" />
            </button>
          </div>
        ))}
      </div>

      {/* FAAB */}
      <div className="px-3 py-2.5">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="label">FAAB</span>
          <span className="text-[11px] text-sub tabular-nums">
            ${faabRemaining} of ${team.faab} left
          </span>
        </div>
        <div className="flex gap-1.5 items-center">
          <input
            type="number"
            min={0}
            max={faabRemaining}
            value={faabAmount}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return setFaabAmount("");
              setFaabAmount(String(Math.max(0, Math.min(faabRemaining, Number(raw)))));
            }}
            placeholder="$0"
            disabled={faabRemaining <= 0}
            className="w-16 text-[11px] px-2 py-1"
          />
          <select
            value={faabRecipient}
            onChange={(e) => setFaabRecipient(e.target.value)}
            className="flex-1 text-[11px] px-2 py-1"
          >
            {otherParticipants.map((o) => (
              <option key={o.id} value={o.id}>→ {o.manager}</option>
            ))}
          </select>
          <button
            onClick={addFaab}
            disabled={!faabAmount || Number(faabAmount) <= 0 || Number(faabAmount) > faabRemaining || !faabRecipient}
            className="inline-flex items-center gap-1 px-2 py-1 border border-line rounded text-[11px] font-semibold text-ink hover:bg-hair disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={11} />Add
          </button>
        </div>
        {transfers
          .filter((t) => t.kind === "faab" && t.fromTeamId === team.id)
          .map((t) => (
            <div key={t.id} className="flex items-center justify-between py-0.5 text-[11px] text-ink mt-0.5">
              <span>
                ${t.amount} → {otherParticipants.find((o) => o.id === t.toTeamId)?.manager}
              </span>
              <button onClick={() => setTransfers((prev) => prev.filter((x) => x.id !== t.id))}>
                <Trash2 size={11} className="text-faint hover:text-espn" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   TRADE VIEW
--------------------------------------------------------- */
export default function TradeView({ teams, teamById }) {
  const [participantIds, setParticipantIds] = useState(() => teams.slice(0, 2).map((t) => t.id));
  const [transfers, setTransfers] = useState([]);
  const [showRecap, setShowRecap] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const teamByEspnId = (espnId) => teams.find((t) => t.espnTeamId === espnId);
  const result = useMemo(
    () => validateMultiTrade(participantIds, transfers, teamById),
    [participantIds, transfers, teamById]
  );
  const hasAssets = transfers.length > 0;
  const availableToAdd = teams.filter((t) => !participantIds.includes(t.id));
  const failed = result.checks.filter((c) => !c.pass).length;

  const removeTeam = (id) => {
    if (participantIds.length <= 2) return;
    setParticipantIds((prev) => prev.filter((t) => t !== id));
    setTransfers((prev) => prev.filter((t) => t.fromTeamId !== id && t.toTeamId !== id));
  };

  return (
    <div>
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <span className="label">Teams in trade</span>
        {participantIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 bg-hair border border-line rounded-full pl-3 pr-2 py-1 text-[12px] font-semibold text-ink"
          >
            {teamById(id).manager}
            {participantIds.length > 2 && (
              <button onClick={() => removeTeam(id)} className="text-faint hover:text-espn">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {availableToAdd.length > 0 && (
          <select
            onChange={(e) => {
              if (e.target.value) setParticipantIds((prev) => [...prev, e.target.value]);
              e.target.value = "";
            }}
            defaultValue=""
            className="text-[12px] px-2.5 py-1.5 max-w-[16rem]"
          >
            <option value="" disabled>Add a team…</option>
            {availableToAdd.map((t) => (
              <option key={t.id} value={t.id}>
                {t.manager} — {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={`grid gap-4 items-start ${participantIds.length >= 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}>
        {participantIds.map((id) => (
          <TeamPanel
            key={id}
            team={teamById(id)}
            otherParticipants={participantIds.filter((p) => p !== id).map(teamById)}
            transfers={transfers}
            setTransfers={setTransfers}
            teamByEspnId={teamByEspnId}
          />
        ))}
      </div>

      {hasAssets && <div className="pb-24" />}

      {hasAssets && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-line shadow-bar" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div
            className={`overflow-y-auto transition-all duration-200 ${drawerOpen ? "max-h-[45vh]" : "max-h-0"}`}
          >
            <div className="max-w-6xl mx-auto px-5 py-3 space-y-2 border-b border-hair">
              <div className="label">{participantIds.length}-team trade · bylaw checks</div>
              {result.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-2">
                  {check.pass ? (
                    <Check size={14} className="text-good mt-0.5 shrink-0" />
                  ) : (
                    <X size={14} className="text-espn mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className={`text-[12px] font-medium ${check.pass ? "text-ink" : "text-espn"}`}>
                      {check.label}
                    </div>
                    <div className="text-[11px] text-sub">{check.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center gap-3">
            <span
              className={`shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded text-white ${
                result.allPass ? "bg-good" : "bg-espn"
              }`}
            >
              {result.allPass ? "Legal" : "Illegal"}
            </span>
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="flex-1 min-w-0 flex items-center gap-1.5 text-left text-[12px] text-sub hover:text-ink"
            >
              <span className="truncate">
                {result.allPass ? `All ${result.checks.length} checks passed` : `${failed} issue${failed > 1 ? "s" : ""} to fix`}
              </span>
              <ChevronUp size={14} className={`shrink-0 transition-transform ${drawerOpen ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => result.allPass && setShowRecap(true)}
              disabled={!result.allPass}
              title={!result.allPass ? "Trade must be legal before generating a recap" : ""}
              className="shrink-0 text-[13px] font-semibold px-4 py-2 rounded bg-espn text-white hover:bg-espndark disabled:bg-hair disabled:text-faint disabled:cursor-not-allowed"
            >
              Generate recap
            </button>
          </div>
        </div>
      )}

      {showRecap && (
        <TradeRecapModal
          participantIds={participantIds}
          transfers={transfers}
          result={result}
          teamById={teamById}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  );
}
