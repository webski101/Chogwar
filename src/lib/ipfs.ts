/** IPFS helpers: Pinata + dweb.link (no ipfs.io — SW gateway only). */

/** JSON metadata: 4everland first (Pinata often 429s under burst). */
const JSON_GATEWAYS = [
  (cidPath: string) => `https://4everland.io/ipfs/${cidPath}`,
  (cidPath: string) => `https://gateway.pinata.cloud/ipfs/${cidPath}`,
  (cidPath: string) => `https://dweb.link/ipfs/${cidPath}`,
] as const;

/** Browser image URLs: Pinata serves collection webp reliably. */
const IMAGE_GATEWAYS = [
  (cidPath: string) => `https://gateway.pinata.cloud/ipfs/${cidPath}`,
  (cidPath: string) => `https://dweb.link/ipfs/${cidPath}`,
  (cidPath: string) => `https://4everland.io/ipfs/${cidPath}`,
] as const;

/** Collection metadata CID (files 1.json … 1969.json). */
export const CHOG_METADATA_CID =
  "bafybeid4ybujnscdipkno7ps5utqelp5ry5ryreqhay3zhgk3a6x4jruqu";

export function ipfsCidPath(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) return uri.slice("ipfs://".length);
  const m = uri.match(/\/ipfs\/(.+)$/);
  return m ? m[1] : uri;
}

/** Basename like `1462.json` from a tokenURI. */
export function metadataFileFromUri(uri: string): string | null {
  const path = ipfsCidPath(uri);
  const base = path.split("/").pop() ?? "";
  return /^\d+\.json$/i.test(base) ? base.toLowerCase() : null;
}

/** Numeric art id from metadata image / tokenURI path (…/1290.webp). */
export function artIdFromUri(uri: string): number | null {
  const path = ipfsCidPath(uri);
  const m = path.match(/(?:^|\/)(\d+)\.(?:webp|png|jpe?g|gif|json)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** Same-origin art proxy — long-cache Pinata webp. */
export function artProxyPath(artId: number | string): string {
  return `/api/art/${artId}`;
}

export function ipfsHttpUrls(
  uri: string,
  kind: "json" | "image" = "json",
): string[] {
  const gateways = kind === "image" ? IMAGE_GATEWAYS : JSON_GATEWAYS;
  if (!uri) return [];
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const path = ipfsCidPath(uri);
    if (path !== uri) {
      return [uri, ...gateways.map((g) => g(path)).filter((u) => u !== uri)];
    }
    return [uri];
  }
  const path = ipfsCidPath(uri);
  return gateways.map((g) => g(path));
}

/** Prefer Pinata for art (webp); JSON fetch uses JSON_GATEWAYS. */
export function ipfsToHttp(uri: string): string {
  const looksLikeImage = /\.(webp|png|jpe?g|gif)(\?|$)/i.test(uri);
  return ipfsHttpUrls(uri, looksLikeImage ? "image" : "json")[0] ?? uri;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch JSON from IPFS with 2 retries and gateway failover.
 * Successful responses use a long Next fetch revalidate window.
 */
export async function fetchIpfsJson<T>(uri: string): Promise<T> {
  const urls = ipfsHttpUrls(uri);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          next: { revalidate: 2_592_000 },
        });
        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status}`);
          continue;
        }
        return (await res.json()) as T;
      } catch (err) {
        lastError = err;
      }
    }
    if (attempt === 0) await sleep(350 * (attempt + 1));
  }

  void lastError;
  throw new Error("Metadata fetch failed");
}
