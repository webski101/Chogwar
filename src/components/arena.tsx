"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChogPortrait } from "@/components/chog-portrait";
import {
  ARCHETYPE_LABEL,
  DEMO_CHOGS,
  getChogById,
  pickRival,
  type ChogFighter,
} from "@/lib/chogs";
import { simulateBattle, type BattleResult } from "@/lib/battle";
import { useLocalGame } from "@/hooks/use-local-game";
import { useWallet } from "@/hooks/use-wallet";
import { CHOG_REMATCH_COST } from "@/lib/monad";
import { cn } from "@/lib/utils";

type Phase = "ready" | "fighting" | "result";

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] uppercase tracking-wide text-[#c5d6c8]/80">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#0b1f14]/70">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

function FighterPanel({
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
        "group relative flex w-full flex-col items-center gap-3 rounded-2xl border px-3 py-4 text-left transition-all duration-300",
        "bg-[#0f2418]/70 backdrop-blur-sm hover:-translate-y-1 hover:border-[#b8f000]/50",
        selected
          ? "border-[#b8f000] shadow-[0_0_0_1px_#b8f000,0_12px_40px_rgba(184,240,0,0.15)]"
          : "border-white/10",
      )}
    >
      {chog.source === "onchain" && (
        <span className="absolute right-2 top-2 rounded-full bg-[#b8f000] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0b1f14]">
          Owned
        </span>
      )}
      <ChogPortrait chog={chog} bouncing={selected} />
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading text-sm font-semibold text-[#f4ffe8]">{chog.name}</p>
          <Badge
            variant="outline"
            className="border-[#b8f000]/30 bg-[#b8f000]/10 text-[10px] text-[#b8f000]"
          >
            {ARCHETYPE_LABEL[chog.archetype]}
          </Badge>
        </div>
        <StatBar label="Power" value={chog.stats.power} color={chog.accent} />
        <StatBar label="Speed" value={chog.stats.speed} color={chog.accent} />
        <StatBar label="Chaos" value={chog.stats.chaos} color={chog.accent} />
        <StatBar label="Grit" value={chog.stats.grit} color={chog.accent} />
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

  const [liveResult, setLiveResult] = useState<BattleResult | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [visibleLog, setVisibleLog] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [rivalHp, setRivalHp] = useState(100);
  const [hitSide, setHitSide] = useState<"player" | "rival" | null>(null);
  const [animatingFor, setAnimatingFor] = useState<string | null>(null);
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
        if (fighters.length > 0) {
          chooseFighter(fighters[0].id);
        }
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

  const result = todayRecord?.result ?? liveResult;
  const showingFight =
    animatingFor === player.id && (phase === "fighting" || phase === "result");
  const effectivePhase: Phase = showingFight
    ? phase
    : todayRecord
      ? "result"
      : "ready";

  const displayPlayerHp =
    effectivePhase === "ready" ? 100 : showingFight ? playerHp : (result?.playerHpEnd ?? 100);
  const displayRivalHp =
    effectivePhase === "ready" ? 100 : showingFight ? rivalHp : (result?.rivalHpEnd ?? 100);
  const displayLogCount =
    showingFight && phase === "fighting"
      ? visibleLog
      : result?.log.length ?? 0;

  function resetFightUi() {
    setAnimatingFor(null);
    setLiveResult(null);
    setPhase("ready");
    setPlayerHp(100);
    setRivalHp(100);
    setVisibleLog(0);
  }

  function startFight() {
    if (todayRecord || phase === "fighting") return;
    const battle = simulateBattle(player, rival, day);
    setLiveResult(battle);
    setAnimatingFor(player.id);
    setPhase("fighting");
    setPlayerHp(100);
    setRivalHp(100);
    setVisibleLog(0);

    let hpP = 100;
    let hpR = 100;
    battle.log.forEach((event, index) => {
      window.setTimeout(() => {
        setVisibleLog(index + 1);
        if (event.actorId === player.id) {
          hpR = Math.max(0, hpR - event.damage);
          setRivalHp(hpR);
          setHitSide("rival");
        } else {
          hpP = Math.max(0, hpP - event.damage);
          setPlayerHp(hpP);
          setHitSide("player");
        }
        window.setTimeout(() => setHitSide(null), 280);

        if (index === battle.log.length - 1) {
          recordDuel(player.id, rival.id, battle, {
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
          setPhase("result");
        }
      }, 700 * (index + 1));
    });
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
  const ranked = board.map((entry) => {
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
          accent: entry.accent ?? "#b8f000",
          glow: "rgba(184,240,0,0.35)",
        }
      : undefined;
    return { ...entry, chog: fromRoster ?? fallback };
  }).filter((e) => e.chog);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-20 sm:px-6">
      <section className="space-y-4" id="pick">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b8f000]">
              Your fighter
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-[#f4ffe8] sm:text-3xl">
              {connected ? "Battle with your Chog Genesis" : "Pick the Chog NFT you battle as"}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[#c5d6c8]">
              {connected
                ? ownedStatus === "loading"
                  ? "Reading your Monad wallet…"
                  : ownedCount > 0
                    ? `Found ${ownedCount} Chog Genesis · traits become combat DNA.`
                    : "No Chog Genesis in this wallet — practice roster still works."
                : "Connect a Monad wallet to load real Chog Genesis NFTs, or practice with the demo roster."}
            </p>
            {ownedError && (
              <p className="mt-1 text-sm text-[#ff6b4a]">{ownedError}</p>
            )}
          </div>
          <Badge className="bg-[#ff6b4a] text-[#1a0a06] hover:bg-[#ff6b4a]">
            Daily duel · {day}
          </Badge>
        </div>

        {owned.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b8f000]/80">
              Wallet owned
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {owned.map((chog) => (
                <FighterPanel
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
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa392]">
            Practice roster
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_CHOGS.map((chog) => (
              <FighterPanel
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
        </div>
      </section>

      <section
        id="arena"
        className={cn(
          "relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07150e]/85 p-5 sm:p-8",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 20%, rgba(184,240,0,0.18), transparent 45%), radial-gradient(ellipse at 80% 30%, rgba(255,107,74,0.16), transparent 40%), repeating-linear-gradient(120deg, transparent, transparent 14px, rgba(255,255,255,0.02) 14px, rgba(255,255,255,0.02) 15px)",
          }}
        />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-[#b8f000]/80">You</p>
            <ChogPortrait
              chog={player}
              size="lg"
              bouncing={effectivePhase === "fighting"}
              hit={hitSide === "player"}
            />
            <p className="font-heading text-xl font-bold text-[#f4ffe8]">{player.name}</p>
            <div className="w-full max-w-[220px] space-y-1">
              <div className="flex justify-between text-xs text-[#c5d6c8]">
                <span>HP</span>
                <span>{displayPlayerHp}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#0b1f14]">
                <div
                  className="h-full rounded-full bg-[#b8f000] transition-all duration-300"
                  style={{ width: `${displayPlayerHp}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="font-heading text-4xl font-black tracking-tighter text-[#ff6b4a] sm:text-5xl">
              VS
            </p>
            {effectivePhase === "ready" && (
              <Button
                size="lg"
                onClick={startFight}
                className="h-12 rounded-xl bg-[#b8f000] px-8 text-base font-bold text-[#0b1f14] hover:bg-[#d4ff4d]"
              >
                Fight today’s rival
              </Button>
            )}
            {effectivePhase === "fighting" && (
              <p className="animate-pulse text-sm font-semibold uppercase tracking-widest text-[#b8f000]">
                Chaos in progress…
              </p>
            )}
            {effectivePhase === "result" && result && (
              <div className="max-w-[240px] space-y-3 text-center">
                <p
                  className={cn(
                    "font-heading text-2xl font-black",
                    won ? "text-[#b8f000]" : "text-[#ff6b4a]",
                  )}
                >
                  {won ? "You win!" : "Rival wins"}
                </p>
                <p className="text-xs text-[#c5d6c8]">
                  One free duel per Chog per day. Hold $CHOG to unlock a rematch.
                </p>
                {rematch && !rematch.used ? (
                  <Button
                    size="lg"
                    onClick={onUseRematch}
                    className="h-11 rounded-xl bg-[#ff6b4a] px-6 font-bold text-[#1a0a06] hover:bg-[#ff8566]"
                  >
                    Use $CHOG rematch
                  </Button>
                ) : !rematch && todayRecord ? (
                  <Button
                    size="lg"
                    disabled={!connected || !canRematchToken || balanceStatus === "loading"}
                    onClick={onUnlockRematch}
                    className="h-11 rounded-xl bg-[#b8f000]/90 px-6 font-bold text-[#0b1f14] hover:bg-[#d4ff4d] disabled:opacity-40"
                  >
                    {!connected
                      ? "Connect for $CHOG rematch"
                      : canRematchToken
                        ? `Unlock rematch (${CHOG_REMATCH_COST.toString()} $CHOG)`
                        : "Need 1,000 $CHOG"}
                  </Button>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-[#ff6b4a]/80">Rival</p>
            <ChogPortrait
              chog={rival}
              size="lg"
              bouncing={effectivePhase === "fighting"}
              hit={hitSide === "rival"}
            />
            <p className="font-heading text-xl font-bold text-[#f4ffe8]">{rival.name}</p>
            <div className="w-full max-w-[220px] space-y-1">
              <div className="flex justify-between text-xs text-[#c5d6c8]">
                <span>HP</span>
                <span>{displayRivalHp}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#0b1f14]">
                <div
                  className="h-full rounded-full bg-[#ff6b4a] transition-all duration-300"
                  style={{ width: `${displayRivalHp}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-8 min-h-[140px] rounded-2xl border border-white/10 bg-[#041008]/70 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b8f000]/70">
            Match log
          </p>
          {result && displayLogCount > 0 ? (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm text-[#dcead9]">
              {result.log.slice(0, displayLogCount).map((event, i) => (
                <li
                  key={`${event.round}-${i}`}
                  className={cn(
                    "animate-log-in border-l-2 pl-3",
                    event.crit ? "border-[#ff6b4a] text-[#ffd2c6]" : "border-[#b8f000]/40",
                  )}
                >
                  <span className="mr-2 text-[10px] uppercase text-[#8aa392]">
                    R{event.round}
                  </span>
                  {event.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#8aa392]">
              Today’s rival is locked to your Chog. Hit fight to roll the chaos.
            </p>
          )}
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-3">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8aa392]">$CHOG</p>
          <span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#c5d6c8]">
            {connected
              ? balanceStatus === "loading"
                ? "Reading balance…"
                : chogBalance != null
                  ? `Balance ${chogBalance}`
                  : "Balance unavailable"
              : "Connect wallet to read balance"}
          </span>
          <span className="rounded-lg border border-dashed border-[#b8f000]/30 px-3 py-1.5 text-xs text-[#b8f000]/90">
            Rematch unlock · {CHOG_REMATCH_COST.toString()} held
          </span>
          <span className="rounded-lg border border-dashed border-white/15 px-3 py-1.5 text-xs text-[#8aa392]">
            Wagers · soon
          </span>
        </div>
      </section>

      <section className="space-y-4" id="board">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b8f000]">
              Season board
            </p>
            <h2 className="font-heading text-2xl font-bold text-[#f4ffe8]">
              Climb with the Chog you own
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetSeason}
            className="border-white/15 bg-transparent text-[#c5d6c8] hover:bg-white/5 hover:text-[#f4ffe8]"
          >
            Reset local season
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f2418]/80 text-[11px] uppercase tracking-wider text-[#8aa392]">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Chog</th>
                <th className="px-4 py-3 font-medium">Archetype</th>
                <th className="px-4 py-3 font-medium">W</th>
                <th className="px-4 py-3 font-medium">L</th>
              </tr>
            </thead>
            <tbody>
              {ranked.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#8aa392]">
                    No fights yet. Win a duel to claim the board.
                  </td>
                </tr>
              ) : (
                ranked.map((row, i) => (
                  <tr
                    key={row.chogId}
                    className="border-t border-white/5 bg-[#07150e]/50 text-[#e8f5e4]"
                  >
                    <td className="px-4 py-3 font-heading font-bold text-[#b8f000]">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ChogPortrait chog={row.chog!} size="sm" />
                        <span className="font-medium">{row.chog!.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#c5d6c8]">
                      {ARCHETYPE_LABEL[row.chog!.archetype]}
                    </td>
                    <td className="px-4 py-3">{row.wins}</td>
                    <td className="px-4 py-3">{row.losses}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
