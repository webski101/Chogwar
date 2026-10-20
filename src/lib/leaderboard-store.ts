/**
 * Server leaderboard store.
 * Prefers Vercel KV / Upstash Redis REST when env is set.
 * Falls back to an in-process Map (fine for local; cold starts reset on serverless).
 */

export type LeaderEntry = {
  tokenId: number;
  dayKey: string;
  wallet: string;
  wins: number;
  losses: number;
  streak: number;
  lastResult: "win" | "loss";
  updatedAt: string;
  name: string;
};

type DayBoard = {
  dayKey: string;
  byToken: Record<string, LeaderEntry>;
};

const g = globalThis as unknown as {
  __chogBoard?: Map<string, DayBoard>;
};

function mem() {
  if (!g.__chogBoard) g.__chogBoard = new Map();
  return g.__chogBoard;
}

function kvConfigured() {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

function kvUrl() {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
}

function kvToken() {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
}

async function kvGet(key: string): Promise<string | null> {
  if (!kvConfigured()) return null;
  const res = await fetch(`${kvUrl()}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${kvToken()}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: string | null };
  return data.result ?? null;
}

async function kvSet(key: string, value: string) {
  if (!kvConfigured()) return;
  await fetch(`${kvUrl()}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kvToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
}

function dayKeyName(dayKey: string) {
  return `chog-rivalry:board:${dayKey}`;
}

export async function loadDayBoard(dayKey: string): Promise<DayBoard> {
  const key = dayKeyName(dayKey);
  if (kvConfigured()) {
    const raw = await kvGet(key);
    if (raw) {
      try {
        return JSON.parse(raw) as DayBoard;
      } catch {
        /* fall through */
      }
    }
  }
  return mem().get(dayKey) ?? { dayKey, byToken: {} };
}

async function saveDayBoard(board: DayBoard) {
  mem().set(board.dayKey, board);
  if (kvConfigured()) {
    await kvSet(dayKeyName(board.dayKey), JSON.stringify(board));
  }
}

export async function recordRankedResult(input: {
  dayKey: string;
  tokenId: number;
  wallet: string;
  won: boolean;
  name: string;
}): Promise<LeaderEntry> {
  const board = await loadDayBoard(input.dayKey);
  const id = String(input.tokenId);
  const prev = board.byToken[id];
  if (prev) {
    // One ranked result per token per day — keep first submit
    return prev;
  }
  const streakKey = `chog-rivalry:streak:${input.tokenId}`;
  let streak = 1;
  if (kvConfigured()) {
    const prevStreak = await kvGet(streakKey);
    const n = prevStreak ? Number(prevStreak) : 0;
    streak = input.won ? (Number.isFinite(n) ? n + 1 : 1) : 0;
    await kvSet(streakKey, String(streak));
  } else {
    streak = input.won ? 1 : 0;
  }

  const entry: LeaderEntry = {
    tokenId: input.tokenId,
    dayKey: input.dayKey,
    wallet: input.wallet,
    wins: input.won ? 1 : 0,
    losses: input.won ? 0 : 1,
    streak,
    lastResult: input.won ? "win" : "loss",
    updatedAt: new Date().toISOString(),
    name: input.name,
  };
  board.byToken[id] = entry;
  await saveDayBoard(board);
  return entry;
}

export async function topEntries(dayKey: string, limit = 20): Promise<LeaderEntry[]> {
  const board = await loadDayBoard(dayKey);
  return Object.values(board.byToken)
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        a.losses - b.losses ||
        b.streak - a.streak ||
        a.tokenId - b.tokenId,
    )
    .slice(0, limit);
}

export async function entriesForTokens(
  dayKey: string,
  tokenIds: number[],
): Promise<LeaderEntry[]> {
  const board = await loadDayBoard(dayKey);
  const all = Object.values(board.byToken).sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses,
  );
  const rank = new Map(all.map((e, i) => [e.tokenId, i + 1]));
  return tokenIds
    .map((id) => board.byToken[String(id)])
    .filter(Boolean)
    .map((e) => ({ ...e!, rank: rank.get(e!.tokenId) }) as LeaderEntry & {
      rank?: number;
    });
}

export function storageMode() {
  return kvConfigured() ? "redis" : "memory";
}
