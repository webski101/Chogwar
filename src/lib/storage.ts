import type { BattleResult } from "./battle";
import { todayKey } from "./chogs";

const SELECTED_KEY = "chog-rivalry:selected";
const DUELS_KEY = "chog-rivalry:duels";
const BOARD_KEY = "chog-rivalry:board";
const REMATCH_KEY = "chog-rivalry:rematch";

export type DuelRecord = {
  dayKey: string;
  playerId: string;
  rivalId: string;
  winnerId: string;
  playedAt: string;
  result: BattleResult;
};

export type BoardEntry = {
  chogId: string;
  tokenId?: number;
  name?: string;
  accent?: string;
  wins: number;
  losses: number;
  lastPlayed: string;
};

export function loadSelectedId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_KEY);
}

export function saveSelectedId(id: string) {
  localStorage.setItem(SELECTED_KEY, id);
}

export function loadDuels(): DuelRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DUELS_KEY);
    return raw ? (JSON.parse(raw) as DuelRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveDuel(record: DuelRecord) {
  const all = loadDuels().filter(
    (d) => !(d.dayKey === record.dayKey && d.playerId === record.playerId),
  );
  all.unshift(record);
  localStorage.setItem(DUELS_KEY, JSON.stringify(all.slice(0, 40)));
}

export function getTodayDuel(playerId: string): DuelRecord | undefined {
  const day = todayKey();
  return loadDuels().find((d) => d.dayKey === day && d.playerId === playerId);
}

export function loadBoard(): BoardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    return raw ? (JSON.parse(raw) as BoardEntry[]) : [];
  } catch {
    return [];
  }
}

export function applyBoardResult(
  playerId: string,
  rivalId: string,
  winnerId: string,
  meta?: Record<string, { tokenId?: number; name?: string; accent?: string }>,
) {
  const board = loadBoard();
  const touch = (id: string, won: boolean) => {
    const existing = board.find((b) => b.chogId === id);
    const info = meta?.[id];
    if (existing) {
      existing.wins += won ? 1 : 0;
      existing.losses += won ? 0 : 1;
      existing.lastPlayed = new Date().toISOString();
      if (info?.name) existing.name = info.name;
      if (info?.tokenId != null) existing.tokenId = info.tokenId;
      if (info?.accent) existing.accent = info.accent;
    } else {
      board.push({
        chogId: id,
        tokenId: info?.tokenId,
        name: info?.name,
        accent: info?.accent,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        lastPlayed: new Date().toISOString(),
      });
    }
  };
  touch(playerId, winnerId === playerId);
  touch(rivalId, winnerId === rivalId);
  board.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  localStorage.setItem(BOARD_KEY, JSON.stringify(board));
  return board;
}

export function resetSeason() {
  localStorage.removeItem(DUELS_KEY);
  localStorage.removeItem(BOARD_KEY);
  localStorage.removeItem(REMATCH_KEY);
}

export type RematchUnlock = {
  dayKey: string;
  playerId: string;
  wallet: string;
  used: boolean;
};

function loadRematches(): RematchUnlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMATCH_KEY);
    return raw ? (JSON.parse(raw) as RematchUnlock[]) : [];
  } catch {
    return [];
  }
}

export function getRematchUnlock(
  playerId: string,
  dayKey: string,
): RematchUnlock | undefined {
  return loadRematches().find(
    (r) => r.playerId === playerId && r.dayKey === dayKey,
  );
}

export function unlockRematch(playerId: string, dayKey: string, wallet: string) {
  const all = loadRematches().filter(
    (r) => !(r.playerId === playerId && r.dayKey === dayKey),
  );
  all.push({ dayKey, playerId, wallet, used: false });
  localStorage.setItem(REMATCH_KEY, JSON.stringify(all));
}

export function consumeRematch(playerId: string, dayKey: string) {
  const all = loadRematches().map((r) =>
    r.playerId === playerId && r.dayKey === dayKey ? { ...r, used: true } : r,
  );
  localStorage.setItem(REMATCH_KEY, JSON.stringify(all));
}

/** Clears today's duel so a rematch can run. */
export function clearTodayDuel(playerId: string, dayKey: string) {
  const all = loadDuels().filter(
    (d) => !(d.dayKey === dayKey && d.playerId === playerId),
  );
  localStorage.setItem(DUELS_KEY, JSON.stringify(all));
}
