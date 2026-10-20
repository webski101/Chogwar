/** IPFS helpers: multi-gateway fetch with retries. */

const GATEWAYS = [
  (cidPath: string) => `https://gateway.pinata.cloud/ipfs/${cidPath}`,
  (cidPath: string) => `https://ipfs.io/ipfs/${cidPath}`,
  (cidPath: string) => `https://dweb.link/ipfs/${cidPath}`,
] as const;

export function ipfsCidPath(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) return uri.slice("ipfs://".length);
  const m = uri.match(/\/ipfs\/(.+)$/);
  return m ? m[1] : uri;
}

export function ipfsHttpUrls(uri: string): string[] {
  if (!uri) return [];
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const path = ipfsCidPath(uri);
    if (path !== uri) {
      return [uri, ...GATEWAYS.map((g) => g(path)).filter((u) => u !== uri)];
    }
    return [uri];
  }
  const path = ipfsCidPath(uri);
  return GATEWAYS.map((g) => g(path));
}

export function ipfsToHttp(uri: string): string {
  return ipfsHttpUrls(uri)[0] ?? uri;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch JSON from IPFS with 2 retries and gateway failover.
 * Throws if every attempt fails.
 */
export async function fetchIpfsJson<T>(uri: string): Promise<T> {
  const urls = ipfsHttpUrls(uri);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status} from ${url}`);
          continue;
        }
        return (await res.json()) as T;
      } catch (err) {
        lastError = err;
      }
    }
    if (attempt === 0) await sleep(350 * (attempt + 1));
  }

  const msg =
    lastError instanceof Error ? lastError.message : "IPFS fetch failed";
  throw new Error(msg);
}
