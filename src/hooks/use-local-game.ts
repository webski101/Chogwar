"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { DEMO_CHOGS, todayKey } from "@/lib/chogs";
import type { BattleResult } from "@/lib/battle";
import {
  applyBoardResult,
  getTodayDuel,
  loadBoard,
  loadDuels,
  loadSelectedId,
  resetSeason,
  saveDuel,
  saveSelectedId,
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
  });
}

function getServerSnapshot() {
  return JSON.stringify({
    selectedId: DEMO_CHOGS[0].id,
    board: [] as BoardEntry[],
    duels: [] as DuelRecord[],
  });
}

export function useLocalGame() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const data = useMemo(() => {
    return JSON.parse(snap) as {
      selectedId: string;
      board: BoardEntry[];
      duels: DuelRecord[];
    };
  }, [snap]);

  const day = todayKey();
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
      applyBoardResult(playerId, rivalId, result.winnerId);
      emit();
      return record;
    },
    [],
  );

  const clearSeason = useCallback(() => {
    resetSeason();
    emit();
  }, []);

  return {
    selectedId: data.selectedId,
    board: data.board,
    todayRecord,
    day,
    chooseFighter,
    recordDuel,
    clearSeason,
    // helper kept for callers that already import getTodayDuel pattern
    peekTodayDuel: (playerId: string) => getTodayDuel(playerId),
  };
}
