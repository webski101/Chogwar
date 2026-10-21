/**
 * Server leaderboard store — Upstash / Vercel KV only.
 * No silent memory fallback (UI shows "Leaderboard offline" when unset).
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

export function kvConfigured() {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

function kvUrl() {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
}

function kvToken() {
  return (
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ""
  );
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

async function kvSet(key: string, value: string, exSeconds?: number) {
  if (!kvConfigured()) return;
  // Upstash REST stores the request body verbatim — pass the string as-is
  // (do not JSON.stringify an already-stringified value).
  const url = exSeconds
    ? `${kvUrl()}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${exSeconds}`
    : `${kvUrl()}/set/${encodeURIComponent(key)}`;
  if (exSeconds) {
    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken()}` },
      cache: "no-store",
    });
    return;
  }
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kvToken()}`,
      "Content-Type": "application/json",
    },
    body: value,
    cache: "no-store",
  });
}

async function kvDel(key: string) {
  if (!kvConfigured()) return;
  await fetch(`${kvUrl()}/del/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${kvToken()}` },
    cache: "no-store",
  });
}

function dayKeyName(dayKey: string) {
  return `chog-rivalry:board:${dayKey}`;
}

function nonceKey(address: string, dayKey: string) {
  return `chog-rivalry:nonce:${address.toLowerCase()}:${dayKey}`;
}

export async function issueNonce(
  address: string,
  dayKey: string,
): Promise<string | null> {
  if (!kvConfigured()) return null;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  await kvSet(nonceKey(address, dayKey), nonce, 60 * 60 * 6);
  return nonce;
}

export async function consumeNonce(
  address: string,
  dayKey: string,
  nonce: string,
): Promise<boolean> {
  if (!kvConfigured()) return false;
  const key = nonceKey(address, dayKey);
  const stored = await kvGet(key);
  if (!stored || stored !== nonce) return false;
  await kvDel(key);
  return true;
}

function parseBoard(raw: string, dayKey: string): DayBoard {
  try {
    let parsed: unknown = JSON.parse(raw);
    // Guard: if a previous bug double-stringified, parse again.
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      "byToken" in (parsed as DayBoard)
    ) {
      return parsed as DayBoard;
    }
  } catch {
    /* fall through */
  }
  return { dayKey, byToken: {} };
}

export async function loadDayBoard(dayKey: string): Promise<DayBoard | null> {
  if (!kvConfigured()) return null;
  const raw = await kvGet(dayKeyName(dayKey));
  if (!raw) return { dayKey, byToken: {} };
  return parseBoard(raw, dayKey);
}

async function saveDayBoard(board: DayBoard) {
  if (!kvConfigured()) return;
  await kvSet(dayKeyName(board.dayKey), JSON.stringify(board));
}

export async function recordRankedResult(input: {
  dayKey: string;
  tokenId: number;
  wallet: string;
  won: boolean;
  name: string;
}): Promise<LeaderEntry | null> {
  if (!kvConfigured()) return null;
  const board = (await loadDayBoard(input.dayKey)) ?? {
    dayKey: input.dayKey,
    byToken: {},
  };
  const id = String(input.tokenId);
  const prev = board.byToken[id];
  if (prev) {
    return prev;
  }
  const streakKey = `chog-rivalry:streak:${input.tokenId}`;
  const prevStreak = await kvGet(streakKey);
  const n = prevStreak ? Number(prevStreak) : 0;
  const streak = input.won ? (Number.isFinite(n) ? n + 1 : 1) : 0;
  await kvSet(streakKey, String(streak));

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

export async function topEntries(
  dayKey: string,
  limit = 20,
): Promise<LeaderEntry[]> {
  const board = await loadDayBoard(dayKey);
  if (!board) return [];
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
  if (!board) return [];
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

export function storageMode(): "redis" | "offline" {
  return kvConfigured() ? "redis" : "offline";
}
