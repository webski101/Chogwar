"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChogPortrait } from "@/components/chog-portrait";
import {
  ARCHETYPE_LABEL,
  DEMO_CHOGS,
  getChogById,
  pickRival,
  type ChogFighter,
} from "@/lib/chogs";
import {
  createBattle,
  finishResult,
  playTurn,
  type BattleResult,
  type LiveBattle,
} from "@/lib/battle";
import { KIND_BEATS, maxHpFor, movesFor, type Move } from "@/lib/moves";
import { useLocalGame } from "@/hooks/use-local-game";
import { useWallet } from "@/hooks/use-wallet";
import { CHOG_REMATCH_COST } from "@/lib/monad";
import { cn } from "@/lib/utils";

type Phase = "ready" | "fighting" | "result";

function HpBar({
  current,
  max,
  tone,
}: {
  current: number;
  max: number;
  tone: "you" | "rival";
}) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-[#a89f94]">
        <span>HP</span>
        <span className="tabular-nums">
          {current}/{max}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-sm bg-[#2a2622]">
        <div
          className={cn(
            "h-full transition-all duration-300",
            tone === "you" ? "bg-[#6b7c5e]" : "bg-[#e85d04]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FighterPick({
  chog,
  selected,
  onSelect,
}: {
  chog: ChogFighter;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-[150px] shrink-0 flex-col gap-2 text-left transition sm:w-[170px]",
        selected ? "opacity-100" : "opacity-65 hover:opacity-100",
      )}
    >
      <div
        className={cn(
          "aspect-[4/5] overflow-hidden rounded-xl bg-[#211e1b] transition",
          selected ? "outline outline-2 outline-[#e85d04] outline-offset-2" : "",
        )}
      >
        {chog.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chog.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-end p-3"
            style={{
              background: `linear-gradient(165deg, ${chog.accent}, #211e1b 75%)`,
            }}
          >
            <span className="font-heading text-2xl font-semibold text-[#f3ebe2]">
              #{chog.tokenId}
            </span>
          </div>
        )}
      </div>
      <div>
        <p className="font-heading text-sm font-semibold text-[#f3ebe2]">{chog.name}</p>
        <p className="text-xs text-[#a89f94]">
          {ARCHETYPE_LABEL[chog.archetype]} · {chog.stats.power}/{chog.stats.speed}/
          {chog.stats.chaos}/{chog.stats.grit}
        </p>
        {chog.source === "onchain" && (
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[#e85d04]">
            Genesis
          </p>
        )}
      </div>
    </button>
  );
}

export function Arena() {
  const {
    selectedId,
    board,
    todayRecord,
    day,
    rematch,
    chooseFighter,
    recordDuel,
    clearSeason,
    grantRematch,
    startRematchFight,
  } = useLocalGame();
  const { address, connected } = useWallet();

  const [owned, setOwned] = useState<ChogFighter[]>([]);
  const [ownedCount, setOwnedCount] = useState(0);
  const [ownedStatus, setOwnedStatus] = useState<"idle" | "loading" | "error">("idle");
  const [ownedError, setOwnedError] = useState<string | null>(null);
  const [chogBalance, setChogBalance] = useState<string | null>(null);
  const [canRematchToken, setCanRematchToken] = useState(false);
  const [balanceStatus, setBalanceStatus] = useState<"idle" | "loading" | "error">("idle");

  const roster = useMemo(() => {
    const map = new Map<string, ChogFighter>();
    for (const c of DEMO_CHOGS) map.set(c.id, c);
    for (const c of owned) map.set(c.id, c);
    return map;
  }, [owned]);

  const player =
    roster.get(selectedId) ??
    owned[0] ??
    getChogById(selectedId) ??
    DEMO_CHOGS[0];
  const rival = useMemo(() => pickRival(player.id, day), [player.id, day]);
  const playerMoves = useMemo(() => movesFor(player), [player]);

  const [live, setLive] = useState<LiveBattle | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [hitSide, setHitSide] = useState<"player" | "rival" | null>(null);
  const [lastResult, setLastResult] = useState<BattleResult | null>(null);
  const [turnBusy, setTurnBusy] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    if (!connected || !address) {
      queueMicrotask(() => {
        if (cancelled) return;
        setOwned([]);
        setOwnedCount(0);
        setOwnedStatus("idle");
        setOwnedError(null);
        setChogBalance(null);
        setCanRematchToken(false);
        setBalanceStatus("idle");
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setOwnedStatus("loading");
      setBalanceStatus("loading");
      setOwnedError(null);
    });

    fetch(`/api/owned-chogs?address=${address}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load NFTs");
        if (cancelled) return;
        const fighters = data.fighters as ChogFighter[];
        setOwned(fighters);
        setOwnedCount(data.count as number);
        setOwnedStatus("idle");
        if (fighters.length > 0) chooseFighter(fighters[0].id);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setOwnedStatus("error");
        setOwnedError(err.message);
      });

    fetch(`/api/chog-balance?address=${address}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Balance failed");
        if (cancelled) return;
        setChogBalance(
          Number(data.formatted).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          }),
        );
        setCanRematchToken(Boolean(data.canRematch));
        setBalanceStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setBalanceStatus("error");
        setCanRematchToken(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connected, address, chooseFighter]);

  const result = todayRecord?.result ?? lastResult;
  const inFight = Boolean(phase === "fighting" && live && !live.done);
  const showResult =
    phase === "result" || (Boolean(todayRecord) && phase === "ready");

  const displayPlayerHp = inFight && live
    ? live.playerHp
    : showResult && result
      ? result.playerHpEnd
      : maxHpFor(player);
  const displayRivalHp = inFight && live
    ? live.rivalHp
    : showResult && result
      ? result.rivalHpEnd
      : maxHpFor(rival);
  const playerMax = inFight && live ? live.playerMax : maxHpFor(player);
  const rivalMax = inFight && live ? live.rivalMax : maxHpFor(rival);
  const log = inFight && live ? live.log : result?.log ?? [];

  function resetFightUi() {
    setLive(null);
    setLastResult(null);
    setPhase("ready");
    setHitSide(null);
    setTurnBusy(false);
  }

  function beginFight() {
    if (todayRecord || phase === "fighting") return;
    setLive(createBattle(player, rival, day));
    setPhase("fighting");
    setLastResult(null);
  }

  function chooseMove(move: Move) {
    if (!live || live.done || turnBusy) return;
    setTurnBusy(true);
    const next = playTurn(live, player, rival, move);
    const last = next.log[next.log.length - 1];
    if (last) {
      setHitSide(last.actorId === player.id ? "rival" : "player");
      window.setTimeout(() => setHitSide(null), 320);
    }
    setLive(next);

    if (next.done) {
      const finished = finishResult(next, player, rival);
      window.setTimeout(() => {
        recordDuel(player.id, rival.id, finished, {
          [player.id]: {
            tokenId: player.tokenId,
            name: player.name,
            accent: player.accent,
          },
          [rival.id]: {
            tokenId: rival.tokenId,
            name: rival.name,
            accent: rival.accent,
          },
        });
        setLastResult(finished);
        setPhase("result");
        setTurnBusy(false);
      }, 450);
    } else {
      window.setTimeout(() => setTurnBusy(false), 280);
    }
  }

  function onUnlockRematch() {
    if (!address || !canRematchToken || !todayRecord) return;
    grantRematch(player.id, address);
  }

  function onUseRematch() {
    if (!rematch || rematch.used) return;
    startRematchFight(player.id);
    resetFightUi();
  }

  function onResetSeason() {
    startTransition(() => {
      clearSeason();
      resetFightUi();
    });
  }

  const won = result?.winnerId === player.id;
  const ranked = board
    .map((entry) => {
      const fromRoster = roster.get(entry.chogId) ?? getChogById(entry.chogId);
      const fallback: ChogFighter | undefined = entry.name
        ? {
            id: entry.chogId,
            tokenId: entry.tokenId ?? 0,
            name: entry.name,
            archetype: "chaos",
            traits: {
              eyes: "?",
              mouth: "?",
              fur: "?",
              vibe: "?",
              accessory: "?",
            },
            stats: { power: 50, speed: 50, chaos: 50, grit: 50 },
            accent: entry.accent ?? "#e85d04",
            glow: "transparent",
          }
        : undefined;
      return { ...entry, chog: fromRoster ?? fallback };
    })
    .filter((e) => e.chog);

  const pickList = owned.length > 0 ? [...owned, ...DEMO_CHOGS] : DEMO_CHOGS;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-14 px-4 pb-24 sm:px-6">
      {/* Roster */}
      <section id="pick" className="space-y-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e85d04]">
            Choose fighter
          </p>
          <h2 className="mt-1 font-heading text-3xl font-semibold tracking-tight text-[#f3ebe2]">
            Your Chog steps into the ring
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#a89f94]">
            {connected
              ? ownedStatus === "loading"
                ? "Reading Genesis from Monad…"
                : ownedCount > 0
                  ? `${ownedCount} Genesis loaded. Traits set HP, damage, and move kits.`
                  : "No Genesis in this wallet — practice fighters below still work."
              : "Connect on Monad for real Genesis art & traits, or pick a practice fighter."}
          </p>
          {ownedError && <p className="mt-2 text-sm text-[#c45c4a]">{ownedError}</p>}
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {pickList.map((chog) => (
            <FighterPick
              key={chog.id}
              chog={chog}
              selected={chog.id === player.id}
              onSelect={() => {
                chooseFighter(chog.id);
                resetFightUi();
              }}
            />
          ))}
        </div>
      </section>

      {/* Stage */}
      <section id="arena" className="relative overflow-hidden rounded-2xl bg-[#211e1b]">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="animate-stage-pulse absolute inset-x-0 bottom-0 h-2/3"
            style={{
              background:
                "radial-gradient(ellipse at 50% 100%, rgba(232,93,4,0.22), transparent 55%)",
            }}
          />
          <div className="grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
        </div>

        <div className="relative z-10 grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_1.1fr_1fr] lg:items-end">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#a89f94]">You</p>
            <ChogPortrait
              chog={player}
              size="xl"
              bouncing={inFight}
              hit={hitSide === "player"}
            />
            <div className="w-full max-w-[240px] space-y-1">
              <p className="font-heading text-xl font-semibold">{player.name}</p>
              <p className="text-xs text-[#a89f94]">
                {ARCHETYPE_LABEL[player.archetype]} · max {playerMax} HP
              </p>
              <HpBar current={displayPlayerHp} max={playerMax} tone="you" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 order-first lg:order-none">
            <p className="font-heading text-5xl font-semibold tracking-tight text-[#e85d04]">
              vs
            </p>
            <p className="text-center text-xs text-[#a89f94]">
              Strike beats Disrupt · Disrupt beats Guard · Guard beats Strike
            </p>

            {phase === "ready" && !todayRecord && (
              <Button
                size="lg"
                onClick={beginFight}
                className="h-12 rounded-md bg-[#e85d04] px-8 text-base font-semibold text-[#1a0c04] hover:bg-[#ff7a2f]"
              >
                Enter the ring
              </Button>
            )}

            {inFight && live && (
              <div className="w-full max-w-md space-y-3">
                <p className="text-center text-sm font-medium text-[#f3ebe2]">
                  Round {live.round + 1} · pick your move
                </p>
                <div className="grid gap-2">
                  {playerMoves.map((move) => (
                    <button
                      key={move.id}
                      type="button"
                      disabled={turnBusy}
                      onClick={() => chooseMove(move)}
                      className="rounded-md border border-white/10 bg-[#171412]/80 px-4 py-3 text-left transition hover:border-[#e85d04]/50 hover:bg-[#171412] disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-heading font-semibold text-[#f3ebe2]">
                          {move.name}
                        </span>
                        <span className="text-[11px] uppercase tracking-wider text-[#e85d04]">
                          {move.kind} → {KIND_BEATS[move.kind]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#a89f94]">{move.blurb}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showResult && result && !inFight && (
              <div className="max-w-sm space-y-3 text-center">
                <p
                  className={cn(
                    "font-heading text-3xl font-semibold",
                    won ? "text-[#6b7c5e]" : "text-[#e85d04]",
                  )}
                >
                  {won ? "You take the ring" : "Rival holds the ring"}
                </p>
                <p className="text-sm text-[#a89f94]">
                  One free duel per Chog each day. Hold $CHOG for a rematch.
                </p>
                {rematch && !rematch.used ? (
                  <Button
                    size="lg"
                    onClick={onUseRematch}
                    className="h-11 rounded-md bg-[#e85d04] px-6 font-semibold text-[#1a0c04] hover:bg-[#ff7a2f]"
                  >
                    Rematch now
                  </Button>
                ) : !rematch && todayRecord ? (
                  <Button
                    size="lg"
                    disabled={!connected || !canRematchToken || balanceStatus === "loading"}
                    onClick={onUnlockRematch}
                    className="h-11 rounded-md bg-[#f3ebe2] px-6 font-semibold text-[#171412] hover:bg-white disabled:opacity-40"
                  >
                    {!connected
                      ? "Connect to unlock rematch"
                      : canRematchToken
                        ? `Unlock rematch (${CHOG_REMATCH_COST.toString()} $CHOG)`
                        : "Need 1,000 $CHOG"}
                  </Button>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#a89f94]">Rival</p>
            <ChogPortrait
              chog={rival}
              size="xl"
              bouncing={inFight}
              hit={hitSide === "rival"}
            />
            <div className="w-full max-w-[240px] space-y-1">
              <p className="font-heading text-xl font-semibold">{rival.name}</p>
              <p className="text-xs text-[#a89f94]">
                {ARCHETYPE_LABEL[rival.archetype]} · max {rivalMax} HP
              </p>
              <HpBar current={displayRivalHp} max={rivalMax} tone="rival" />
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 px-5 py-4 sm:px-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a89f94]">
            Fight log · {day}
          </p>
          {log.length > 0 ? (
            <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm text-[#d9d0c5]">
              {log.map((event, i) => (
                <li
                  key={`${event.round}-${i}-${event.move}`}
                  className={cn(
                    "animate-log-in border-l-2 pl-3",
                    event.crit ? "border-[#e85d04]" : "border-white/15",
                  )}
                >
                  <span className="mr-2 text-[10px] uppercase text-[#a89f94]">
                    R{event.round}
                  </span>
                  {event.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#a89f94]">
              Pick a move each round. Speed decides who hits first. Traits tip damage.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#a89f94]">
            <span>
              $CHOG{" "}
              {connected
                ? balanceStatus === "loading"
                  ? "…"
                  : chogBalance != null
                    ? chogBalance
                    : "—"
                : "connect to read"}
            </span>
            <span>·</span>
            <span>Rematch at {CHOG_REMATCH_COST.toString()} held</span>
          </div>
        </div>
      </section>

      {/* Board */}
      <section id="board" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e85d04]">
              Season
            </p>
            <h2 className="font-heading text-2xl font-semibold text-[#f3ebe2]">
              Ring record
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetSeason}
            className="border-white/15 bg-transparent text-[#a89f94] hover:bg-white/5 hover:text-[#f3ebe2]"
          >
            Reset local season
          </Button>
        </div>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {ranked.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#a89f94]">
              No fights yet. Win a duel to open the record.
            </p>
          ) : (
            ranked.map((row, i) => (
              <div
                key={row.chogId}
                className="flex items-center gap-4 py-3"
              >
                <span className="w-6 font-heading text-lg font-semibold text-[#e85d04]">
                  {i + 1}
                </span>
                <ChogPortrait chog={row.chog!} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#f3ebe2]">{row.chog!.name}</p>
                  <p className="text-xs text-[#a89f94]">
                    {ARCHETYPE_LABEL[row.chog!.archetype]}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-[#a89f94]">
                  {row.wins}W · {row.losses}L
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
