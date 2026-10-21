"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChogPortrait } from "@/components/chog-portrait";
import { StatBreakdown } from "@/components/stat-breakdown";
import {
  ARCHETYPE_LABEL,
  secondsUntilNextUtcDay,
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
import type { LeaderEntry } from "@/lib/leaderboard-store";

type Phase = "ready" | "fighting" | "result";

type FloatDmg = {
  id: number;
  side: "player" | "rival";
  text: string;
  crit: boolean;
};

const MOVE_ICON: Record<string, string> = {
  strike: "⚔",
  disrupt: "✧",
  guard: "🛡",
};

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

function SkeletonCard() {
  return (
    <div className="w-[150px] shrink-0 animate-pulse sm:w-[170px]">
      <div className="aspect-[4/5] rounded-xl bg-[#2a2622]" />
      <div className="mt-2 h-3 w-2/3 rounded bg-[#2a2622]" />
      <div className="mt-1 h-2 w-1/2 rounded bg-[#2a2622]" />
    </div>
  );
}

function FighterPick({
  chog,
  selected,
  onSelect,
  practice,
}: {
  chog: ChogFighter;
  selected: boolean;
  onSelect: () => void;
  practice?: boolean;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgLoaded = Boolean(chog.image && loadedSrc === chog.image);
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
          "relative aspect-[4/5] overflow-hidden rounded-xl bg-[#211e1b] transition",
          selected ? "outline outline-2 outline-[#e85d04] outline-offset-2" : "",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 animate-pulse bg-[#2a2622]",
            imgLoaded && chog.image ? "opacity-0" : "opacity-100",
          )}
        />
        {chog.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={chog.image}
            src={chog.image}
            alt=""
            decoding="async"
            onLoad={() => setLoadedSrc(chog.image ?? null)}
            className={cn(
              "relative h-full w-full object-cover transition-opacity duration-300",
              imgLoaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          <div
            className="relative flex h-full w-full items-end p-3"
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
        <p className="font-heading text-sm font-semibold text-[#f3ebe2]">
          {chog.name}
        </p>
        {chog.oneOfOneTitle ? (
          <p className="truncate text-[11px] text-[#f3ebe2]/90">
            {chog.oneOfOneTitle}
          </p>
        ) : chog.metaName ? (
          <p className="truncate text-[11px] text-[#a89f94]">{chog.metaName}</p>
        ) : null}
        <p className="text-xs text-[#a89f94]">
          {ARCHETYPE_LABEL[chog.archetype]} · {chog.stats.power}/
          {chog.stats.speed}/{chog.stats.chaos}/{chog.stats.grit}
        </p>
        {practice ? (
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[#a89f94]">
            Practice — unranked
          </p>
        ) : chog.legendaryOneOfOne ? (
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[#e85d04]">
            Legendary 1/1
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[#e85d04]">
            Genesis
          </p>
        )}
        <StatBreakdown chog={chog} compact />
      </div>
    </button>
  );
}

function formatCountdown(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function signRankedMessage(
  address: string,
  dayKey: string,
  tokenId: number,
  rivalTokenId: number,
  nonce: string,
  moveIds: string[],
): Promise<{ message: string; signature: string } | null> {
  const eth = (
    window as unknown as {
      ethereum?: {
        request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }
  ).ethereum;
  if (!eth) return null;
  const message = `Chog Rivalry ranked result\nDay: ${dayKey}\nToken: ${tokenId}\nRival: ${rivalTokenId}\nNonce: ${nonce}\nMoves: ${moveIds.join(",")}`;
  const signature = (await eth.request({
    method: "personal_sign",
    params: [message, address],
  })) as string;
  return { message, signature };
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
  const { address, connected, isSample } = useWallet();

  const [practice, setPractice] = useState<ChogFighter[]>([]);
  const [practiceStatus, setPracticeStatus] = useState<"loading" | "idle" | "error">(
    "loading",
  );
  const [owned, setOwned] = useState<ChogFighter[]>([]);
  const [ownedCount, setOwnedCount] = useState(0);
  const [ownedStatus, setOwnedStatus] = useState<"idle" | "loading" | "error">("idle");
  const [ownedError, setOwnedError] = useState<string | null>(null);
  const [chogBalance, setChogBalance] = useState<string | null>(null);
  const [canRematchToken, setCanRematchToken] = useState(false);
  const [balanceStatus, setBalanceStatus] = useState<"idle" | "loading" | "error">("idle");
  const [rival, setRival] = useState<ChogFighter | null>(null);
  const [rivalStatus, setRivalStatus] = useState<"idle" | "loading" | "error">("idle");
  const [leaderTop, setLeaderTop] = useState<LeaderEntry[]>([]);
  const [leaderYours, setLeaderYours] = useState<LeaderEntry[]>([]);
  const [leaderOffline, setLeaderOffline] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [floatDmg, setFloatDmg] = useState<FloatDmg[]>([]);
  const [critShake, setCritShake] = useState(false);
  const floatSeq = useRef(0);
  const rankedMovesRef = useRef<string[]>([]);

  const roster = useMemo(() => {
    const map = new Map<string, ChogFighter>();
    for (const c of practice) map.set(c.id, c);
    for (const c of owned) map.set(c.id, c);
    return map;
  }, [practice, owned]);

  const player =
    roster.get(selectedId) ??
    owned[0] ??
    practice[0] ??
    null;

  const isPractice = player?.source === "practice";
  const canRank =
    Boolean(player) &&
    player?.source === "onchain" &&
    connected &&
    !isSample;

  const playerMoves = useMemo(
    () => (player ? movesFor(player) : []),
    [player],
  );

  const [live, setLive] = useState<LiveBattle | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [hitSide, setHitSide] = useState<"player" | "rival" | null>(null);
  const [lastResult, setLastResult] = useState<BattleResult | null>(null);
  const [turnBusy, setTurnBusy] = useState(false);
  const [, startTransition] = useTransition();

  // Practice roster
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPracticeStatus("loading");
    });
    fetch("/api/practice")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Practice failed");
        if (cancelled) return;
        setPractice(data.fighters as ChogFighter[]);
        setPracticeStatus("idle");
        // Preload images
        for (const f of data.fighters as ChogFighter[]) {
          if (f.image) {
            const img = new Image();
            img.referrerPolicy = "no-referrer";
            img.src = f.image;
          }
        }
      })
      .catch(() => {
        if (!cancelled) setPracticeStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Owned + balance
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
          for (const f of fighters) {
            if (f.image) {
              const img = new Image();
              img.referrerPolicy = "no-referrer";
              img.src = f.image;
            }
          }
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

  // Daily rival from real Genesis
  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setRivalStatus("loading");
    });
    fetch(`/api/rival?tokenId=${player.tokenId}&day=${day}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Rival failed");
        if (cancelled) return;
        const f = data.fighter as ChogFighter;
        setRival(f);
        setRivalStatus("idle");
        if (data.secondsUntilNextRival != null) {
          setCountdown(Number(data.secondsUntilNextRival));
        }
        // Preload rival art as soon as /api/rival returns (same-origin proxy)
        if (f.image) {
          const img = new Image();
          img.src = f.image;
        }
      })
      .catch(() => {
        if (!cancelled) setRivalStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [player?.tokenId, day, player]);

  // Leaderboard
  useEffect(() => {
    const tokens = owned.map((o) => o.tokenId).join(",");
    const q = tokens ? `?tokens=${tokens}&day=${day}` : `?day=${day}`;
    fetch(`/api/leaderboard${q}`)
      .then((r) => r.json())
      .then((data) => {
        setLeaderOffline(Boolean(data.offline) || data.storage === "offline");
        setLeaderTop((data.top as LeaderEntry[]) ?? []);
        setLeaderYours((data.yours as LeaderEntry[]) ?? []);
        if (data.secondsUntilNextRival != null) {
          setCountdown(Number(data.secondsUntilNextRival));
        }
      })
      .catch(() => setLeaderOffline(true));
  }, [owned, day, todayRecord, lastResult]);

  useEffect(() => {
    const tick = () => setCountdown(secondsUntilNextUtcDay());
    const t = window.setInterval(tick, 1000);
    queueMicrotask(tick);
    return () => window.clearInterval(t);
  }, []);

  const result = todayRecord?.result ?? lastResult;
  const inFight = Boolean(phase === "fighting" && live && !live.done);
  const showResult =
    phase === "result" || (Boolean(todayRecord) && phase === "ready" && canRank);

  const displayPlayerHp =
    inFight && live
      ? live.playerHp
      : showResult && result
        ? result.playerHpEnd
        : player
          ? maxHpFor(player)
          : 0;
  const displayRivalHp =
    inFight && live
      ? live.rivalHp
      : showResult && result
        ? result.rivalHpEnd
        : rival
          ? maxHpFor(rival)
          : 0;
  const playerMax = inFight && live ? live.playerMax : player ? maxHpFor(player) : 1;
  const rivalMax = inFight && live ? live.rivalMax : rival ? maxHpFor(rival) : 1;
  const log = inFight && live ? live.log : result?.log ?? [];

  function resetFightUi() {
    setLive(null);
    setLastResult(null);
    setPhase("ready");
    setHitSide(null);
    setTurnBusy(false);
    setFloatDmg([]);
    setCritShake(false);
    rankedMovesRef.current = [];
  }

  function beginFight() {
    if (!player || !rival) return;
    if (canRank && todayRecord) return;
    if (phase === "fighting") return;
    rankedMovesRef.current = [];
    setLive(createBattle(player, rival, day));
    setPhase("fighting");
    setLastResult(null);
  }

  function pushFloat(side: "player" | "rival", text: string, crit: boolean) {
    floatSeq.current += 1;
    const id = floatSeq.current;
    setFloatDmg((prev) => [...prev, { id, side, text, crit }]);
    window.setTimeout(() => {
      setFloatDmg((prev) => prev.filter((f) => f.id !== id));
    }, 900);
  }

  function chooseMove(move: Move) {
    if (!live || !player || !rival || live.done || turnBusy) return;
    setTurnBusy(true);
    rankedMovesRef.current = [...rankedMovesRef.current, move.id];
    const next = playTurn(live, player, rival, move);
    const last = next.log[next.log.length - 1];
    if (last) {
      const side = last.actorId === player.id ? "rival" : "player";
      setHitSide(side);
      pushFloat(side, last.crit ? `CRIT −${last.damage}` : `−${last.damage}`, last.crit);
      if (last.crit) {
        setCritShake(true);
        window.setTimeout(() => setCritShake(false), 320);
      }
      window.setTimeout(() => setHitSide(null), 320);
    }
    setLive(next);

    if (next.done) {
      const finished = finishResult(next, player, rival);
      window.setTimeout(async () => {
        const ranked = canRank;
        recordDuel(
          player.id,
          rival.id,
          finished,
          {
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
          },
          ranked,
        );

        if (ranked && address && !isSample && !leaderOffline) {
          try {
            const nonceRes = await fetch(
              `/api/leaderboard/nonce?address=${address}`,
            );
            const nonceData = await nonceRes.json();
            if (!nonceRes.ok || !nonceData.nonce) {
              throw new Error(nonceData.error || "Nonce unavailable");
            }
            const moveIds = rankedMovesRef.current;
            const signed = await signRankedMessage(
              address,
              nonceData.dayKey || day,
              player.tokenId,
              rival.tokenId,
              nonceData.nonce as string,
              moveIds,
            );
            if (signed) {
              await fetch("/api/leaderboard/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  address,
                  tokenId: player.tokenId,
                  rivalTokenId: rival.tokenId,
                  name: player.name,
                  message: signed.message,
                  signature: signed.signature,
                  isSample: false,
                  moves: moveIds,
                  nonce: nonceData.nonce,
                }),
              });
            }
          } catch {
            /* ranking optional if user rejects sign / offline */
          }
        }

        setLastResult(finished);
        setPhase("result");
        setTurnBusy(false);
      }, 450);
    } else {
      window.setTimeout(() => setTurnBusy(false), 280);
    }
  }

  async function onUnlockRematch() {
    if (!address || !player || !todayRecord || isSample) return;
    setBalanceStatus("loading");
    try {
      const res = await fetch(`/api/rematch/verify?address=${address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verify failed");
      setChogBalance(
        Number(data.formatted).toLocaleString(undefined, {
          maximumFractionDigits: 0,
        }),
      );
      setCanRematchToken(Boolean(data.canRematch));
      setBalanceStatus("idle");
      if (data.canRematch) {
        grantRematch(player.id, address);
      }
    } catch {
      setBalanceStatus("error");
    }
  }

  function onUseRematch() {
    if (!rematch || rematch.used || !player) return;
    startRematchFight(player.id);
    resetFightUi();
  }

  function onResetSeason() {
    startTransition(() => {
      clearSeason();
      resetFightUi();
    });
  }

  function shareToX() {
    if (!player || !rival || !result) return;
    const won = result.winnerId === player.id;
    const text = [
      won
        ? `I took the ring with ${player.name} vs ${rival.name} on Chog Rivalry.`
        : `${rival.name} held the ring against my ${player.name} on Chog Rivalry.`,
      "",
      "@ChogNFT #Chogathon",
      "https://chogwarr.vercel.app",
    ].join("\n");
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const won = result && player ? result.winnerId === player.id : false;
  const rankedLocal = board
    .map((entry) => {
      const fromRoster = roster.get(entry.chogId);
      return { ...entry, chog: fromRoster };
    })
    .filter((e) => e.chog);

  const pickList =
    owned.length > 0 ? [...owned, ...practice] : practice;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-14 px-4 pb-24 sm:px-6">
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
                ? "Reading your Chogs from Monad…"
                : ownedCount > 0
                  ? `${ownedCount} Genesis loaded. Real traits set HP, damage, and kits.`
                  : "No Genesis in this wallet — practice below is unranked."
              : "Connect on Monad for ranked Genesis fights, or use Sample holder / practice."}
          </p>
          {isSample && (
            <p className="mt-2 text-sm text-[#e85d04]">
              Sample holder — view-only, not ranked. Connect your own wallet
              with a Chog to rank.
            </p>
          )}
          {isPractice && player && !isSample && (
            <p className="mt-2 text-sm text-[#a89f94]">
              Practice — unranked. Connect a wallet with a Chog to fight ranked.
            </p>
          )}
          {ownedError && (
            <p className="mt-2 text-sm text-[#c45c4a]">{ownedError}</p>
          )}
          <p className="mt-2 text-xs text-[#a89f94]">
            Next daily rival in{" "}
            <span className="font-mono text-[#f3ebe2]">
              {formatCountdown(countdown)}
            </span>{" "}
            UTC
          </p>
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {(ownedStatus === "loading" || practiceStatus === "loading") &&
            pickList.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          {pickList.map((chog) => (
            <FighterPick
              key={chog.id}
              chog={chog}
              practice={chog.source === "practice"}
              selected={player?.id === chog.id}
              onSelect={() => {
                chooseFighter(chog.id);
                resetFightUi();
              }}
            />
          ))}
        </div>
      </section>

      <section
        id="arena"
        className={cn(
          "relative overflow-hidden rounded-2xl bg-[#211e1b]",
          critShake && "animate-chog-hit",
        )}
      >
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
          <div className="relative flex flex-col items-center gap-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#a89f94]">
              You
            </p>
            {player ? (
              <>
                <ChogPortrait
                  chog={player}
                  size="xl"
                  bouncing={inFight}
                  hit={hitSide === "player"}
                />
                <div className="w-full max-w-[240px] space-y-1">
                  <p className="font-heading text-xl font-semibold">
                    {player.name}
                  </p>
                  {player.oneOfOneTitle ? (
                    <p className="text-xs text-[#f3ebe2]/90">
                      {player.oneOfOneTitle}
                    </p>
                  ) : player.metaName ? (
                    <p className="text-xs text-[#a89f94]">{player.metaName}</p>
                  ) : null}
                  {player.legendaryOneOfOne ? (
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#e85d04]">
                      Legendary 1/1
                    </p>
                  ) : null}
                  <p className="text-xs text-[#a89f94]">
                    {ARCHETYPE_LABEL[player.archetype]} · max {playerMax} HP
                  </p>
                  <HpBar
                    current={displayPlayerHp}
                    max={playerMax}
                    tone="you"
                  />
                  <StatBreakdown chog={player} compact />
                </div>
              </>
            ) : (
              <SkeletonCard />
            )}
            {floatDmg
              .filter((f) => f.side === "player")
              .map((f) => (
                <span
                  key={f.id}
                  className={cn(
                    "pointer-events-none absolute top-8 animate-float-dmg font-heading text-2xl font-bold",
                    f.crit ? "text-[#ff7a2f]" : "text-[#f3ebe2]",
                  )}
                >
                  {f.text}
                </span>
              ))}
          </div>

          <div className="order-first flex flex-col items-center gap-4 lg:order-none">
            <p className="font-heading text-5xl font-semibold tracking-tight text-[#e85d04]">
              vs
            </p>
            <p className="text-center text-xs text-[#a89f94]">
              Strike beats Disrupt · Disrupt beats Guard · Guard beats Strike
            </p>

            {phase === "ready" &&
              !(canRank && todayRecord) &&
              player &&
              rival && (
                <Button
                  size="lg"
                  onClick={beginFight}
                  disabled={rivalStatus === "loading"}
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
                          <span className="mr-2 opacity-80">
                            {MOVE_ICON[move.kind]}
                          </span>
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

            {showResult && result && !inFight && player && rival && (
              <div className="max-w-sm space-y-3 text-center">
                <p
                  className={cn(
                    "font-heading text-3xl font-semibold",
                    won ? "text-[#6b7c5e]" : "text-[#e85d04]",
                  )}
                >
                  {won ? "You take the ring" : "Rival holds the ring"}
                </p>
                <div className="rounded-md border border-white/10 bg-[#171412]/50 px-3 py-2 text-left text-xs text-[#d9d0c5]">
                  <p className="mb-1 font-semibold uppercase tracking-wide text-[#e85d04]">
                    Round recap
                  </p>
                  <ul className="max-h-28 space-y-1 overflow-y-auto">
                    {result.log.map((e, i) => (
                      <li key={`${e.round}-${i}`}>
                        R{e.round}: {e.playerMove ?? "—"} vs {e.rivalMove ?? "—"}{" "}
                        · {e.damage}
                        {e.crit ? " crit" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
                {isSample ? (
                  <p className="text-sm text-[#a89f94]">
                    Sample holder — view-only, not ranked. Connect your own
                    wallet with a Chog to rank.
                  </p>
                ) : isPractice ? (
                  <p className="text-sm text-[#a89f94]">
                    Practice — unranked. Connect a wallet with a Chog to fight
                    ranked.
                  </p>
                ) : canRank ? (
                  <p className="text-sm text-[#a89f94]">
                    One free ranked duel per Chog each day. Hold 1,000 $CHOG → +1
                    rematch/day (no transaction).
                  </p>
                ) : (
                  <p className="text-sm text-[#a89f94]">
                    Connect a wallet that holds a Chog to rank this result.
                  </p>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={shareToX}
                  className="h-11 border-white/20 bg-transparent text-[#f3ebe2] hover:bg-white/5"
                >
                  Share to X
                </Button>
                {canRank && rematch && !rematch.used ? (
                  <Button
                    size="lg"
                    onClick={onUseRematch}
                    className="h-11 rounded-md bg-[#e85d04] px-6 font-semibold text-[#1a0c04] hover:bg-[#ff7a2f]"
                  >
                    Rematch now
                  </Button>
                ) : canRank && !rematch && todayRecord ? (
                  <Button
                    size="lg"
                    disabled={
                      !connected ||
                      isSample ||
                      !canRematchToken ||
                      balanceStatus === "loading"
                    }
                    onClick={onUnlockRematch}
                    className="h-11 rounded-md bg-[#f3ebe2] px-6 font-semibold text-[#171412] hover:bg-white disabled:opacity-40"
                  >
                    {!connected || isSample
                      ? "Connect real wallet for rematch"
                      : canRematchToken
                        ? `Unlock rematch (${CHOG_REMATCH_COST.toString()} $CHOG held)`
                        : "Need 1,000 $CHOG held"}
                  </Button>
                ) : null}
              </div>
            )}
          </div>

          <div className="relative flex flex-col items-center gap-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#a89f94]">
              Rival · daily Genesis
            </p>
            {rivalStatus === "loading" || !rival ? (
              <SkeletonCard />
            ) : (
              <>
                <ChogPortrait
                  chog={rival}
                  size="xl"
                  bouncing={inFight}
                  hit={hitSide === "rival"}
                />
                <div className="w-full max-w-[240px] space-y-1">
                  <p className="font-heading text-xl font-semibold">
                    {rival.name}
                  </p>
                  {rival.oneOfOneTitle ? (
                    <p className="text-xs text-[#f3ebe2]/90">
                      {rival.oneOfOneTitle}
                    </p>
                  ) : rival.metaName ? (
                    <p className="text-xs text-[#a89f94]">{rival.metaName}</p>
                  ) : null}
                  {rival.legendaryOneOfOne ? (
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#e85d04]">
                      Legendary 1/1
                    </p>
                  ) : null}
                  <p className="text-xs text-[#a89f94]">
                    {ARCHETYPE_LABEL[rival.archetype]} · max {rivalMax} HP
                  </p>
                  <HpBar
                    current={displayRivalHp}
                    max={rivalMax}
                    tone="rival"
                  />
                  <StatBreakdown chog={rival} compact />
                </div>
              </>
            )}
            {floatDmg
              .filter((f) => f.side === "rival")
              .map((f) => (
                <span
                  key={f.id}
                  className={cn(
                    "pointer-events-none absolute top-8 animate-float-dmg font-heading text-2xl font-bold",
                    f.crit ? "text-[#ff7a2f]" : "text-[#f3ebe2]",
                  )}
                >
                  {f.text}
                </span>
              ))}
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
                  <span className="mr-1 opacity-70">
                    {MOVE_ICON[
                      (event.playerMove || event.rivalMove || "")
                        .toLowerCase()
                        .includes("guard")
                        ? "guard"
                        : (event.playerMove || "")
                              .toLowerCase()
                              .includes("disrupt") ||
                            (event.rivalMove || "")
                              .toLowerCase()
                              .includes("disrupt")
                          ? "disrupt"
                          : "strike"
                    ]}
                  </span>
                  {event.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#a89f94]">
              Pick a move each round. Speed decides who hits first. Traits tip
              damage.
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
            <span>1,000 $CHOG held → +1 rematch/day</span>
          </div>
        </div>
      </section>

      <section id="leaderboard" className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e85d04]">
            Global · by tokenId
          </p>
          <h2 className="font-heading text-2xl font-semibold text-[#f3ebe2]">
            Today&apos;s leaderboard
          </h2>
          <p className="mt-1 text-sm text-[#a89f94]">
            One ranked result per Genesis per day. Sample holder & practice never
            write here. Server replays your moves — client win flags are ignored.
          </p>
        </div>
        {leaderOffline ? (
          <div className="rounded-md border border-white/10 bg-[#211e1b] px-4 py-8 text-center text-sm text-[#a89f94]">
            <p>
              Ranked board opens soon — results will be verified on the server.
            </p>
            {process.env.NODE_ENV === "development" ? (
              <p className="mt-2 text-xs text-[#a89f94]/80">
                Dev: add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or
                KV_*) to enable durable storage.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="divide-y divide-white/10 border-y border-white/10">
          {!leaderOffline && leaderTop.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#a89f94]">
              No ranked fights yet today. Win a Genesis duel to open the board.
            </p>
          ) : leaderOffline ? null : (
            leaderTop.map((row, i) => (
              <div key={row.tokenId} className="flex items-center gap-4 py-3">
                <span className="w-6 font-heading text-lg font-semibold text-[#e85d04]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#f3ebe2]">
                    {row.name || `Chog #${row.tokenId}`}
                  </p>
                  <p className="text-xs text-[#a89f94]">
                    streak {row.streak} · {row.lastResult}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-[#a89f94]">
                  {row.wins}W · {row.losses}L
                </p>
              </div>
            ))
          )}
        </div>
        {leaderYours.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a89f94]">
              Your Chogs today
            </p>
            <div className="divide-y divide-white/10 border-y border-white/10">
              {leaderYours.map((row) => (
                <div key={row.tokenId} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#f3ebe2]">
                      {row.name || `Chog #${row.tokenId}`}
                    </p>
                    <p className="text-xs text-[#a89f94]">streak {row.streak}</p>
                  </div>
                  <p className="text-sm tabular-nums text-[#a89f94]">
                    {row.wins}W · {row.losses}L
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section id="board" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e85d04]">
              Local season
            </p>
            <h2 className="font-heading text-2xl font-semibold text-[#f3ebe2]">
              This browser&apos;s ring record
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
          {rankedLocal.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#a89f94]">
              No ranked local fights yet.
            </p>
          ) : (
            rankedLocal.map((row, i) => (
              <div key={row.chogId} className="flex items-center gap-4 py-3">
                <span className="w-6 font-heading text-lg font-semibold text-[#e85d04]">
                  {i + 1}
                </span>
                <ChogPortrait chog={row.chog!} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#f3ebe2]">
                    {row.chog!.name}
                  </p>
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
