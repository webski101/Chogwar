import { readFile } from "node:fs/promises";
import path from "node:path";
import { metadataFileFromUri } from "@/lib/ipfs";
import type { ChogMetadata } from "@/lib/onchain-chog";

/**
 * Load metadata from the repo snapshot at data/metadata/<id>.json
 * when the tokenURI points at that file under the collection CID.
 */
export async function loadBundledMetadata(
  tokenURI: string,
): Promise<ChogMetadata | null> {
  const file = metadataFileFromUri(tokenURI);
  if (!file) return null;

  try {
    const abs = path.join(process.cwd(), "data", "metadata", file);
    const raw = await readFile(abs, "utf8");
    const parsed = JSON.parse(raw) as ChogMetadata;
    return parsed;
  } catch {
    return null;
  }
}
