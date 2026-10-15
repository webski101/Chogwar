"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { DEMO_CHOGS, todayKey } from "@/lib/chogs";
import type { BattleResult } from "@/lib/battle";
import {
  applyBoardResult,
  clearTodayDuel,
  consumeRematch,
  getRematchUnlock,
  getTodayDuel,
  loadBoard,
  loadDuels,
  loadSelectedId,
  resetSeason,
  saveDuel,
  saveSelectedId,
  unlockRematch,
  type BoardEntry,
  type DuelRecord,
} from "@/lib/storage";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (
      e.key?.startsWith("chog-rivalry:") ||
      e.key === null
    ) {
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return JSON.stringify({
    selectedId: loadSelectedId() ?? DEMO_CHOGS[0].id,
    board: loadBoard(),
    duels: loadDuels(),
    rematchTick: localStorage.getItem("chog-rivalry:rematch") ?? "",
    day: todayKey(),
  });
}

function getServerSnapshot() {
  return JSON.stringify({
    selectedId: DEMO_CHOGS[0].id,
    board: [] as BoardEntry[],
    duels: [] as DuelRecord[],
    rematchTick: "",
    // Stable during prerender — real day is read only on the client.
    day: "1970-01-01",
  });
}

export function useLocalGame() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const data = useMemo(() => {
    return JSON.parse(snap) as {
      selectedId: string;
      board: BoardEntry[];
      duels: DuelRecord[];
      day: string;
    };
  }, [snap]);

  const day = data.day;
  const todayRecord = useMemo(
    () =>
      data.duels.find(
        (d) => d.dayKey === day && d.playerId === data.selectedId,
      ),
    [data.duels, data.selectedId, day],
  );

  const chooseFighter = useCallback((id: string) => {
    saveSelectedId(id);
    emit();
  }, []);

  const recordDuel = useCallback(
    (
      playerId: string,
      rivalId: string,
      result: BattleResult,
      meta?: Record<string, { tokenId?: number; name?: string; accent?: string }>,
    ): DuelRecord => {
      const record: DuelRecord = {
        dayKey: todayKey(),
        playerId,
        rivalId,
        winnerId: result.winnerId,
        playedAt: new Date().toISOString(),
        result,
      };
      saveDuel(record);
      applyBoardResult(playerId, rivalId, result.winnerId, meta);
      emit();
      return record;
    },
    [],
  );

  const clearSeason = useCallback(() => {
    resetSeason();
    emit();
  }, []);

  const rematch = getRematchUnlock(data.selectedId, day);

  const grantRematch = useCallback(
    (playerId: string, wallet: string) => {
      unlockRematch(playerId, todayKey(), wallet);
      emit();
    },
    [],
  );

  const startRematchFight = useCallback((playerId: string) => {
    const key = todayKey();
    clearTodayDuel(playerId, key);
    consumeRematch(playerId, key);
    emit();
  }, []);

  return {
    selectedId: data.selectedId,
    board: data.board,
    todayRecord,
    day,
    rematch,
    chooseFighter,
    recordDuel,
    clearSeason,
    grantRematch,
    startRematchFight,
    peekTodayDuel: (playerId: string) => getTodayDuel(playerId),
  };
}
