import { NextResponse } from "next/server";
import {
  loadFighterByTokenId,
  MetadataLoadError,
  NO_STORE_HEADERS,
} from "@/lib/chog-loader";

type Params = { params: Promise<{ tokenId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { tokenId: raw } = await params;
  const tokenId = Number(raw);
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 100_000) {
    return NextResponse.json(
      { error: "Invalid tokenId" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const source =
      new URL(_request.url).searchParams.get("source") === "practice"
        ? "practice"
        : "onchain";
    const fighter = await loadFighterByTokenId(tokenId, source);
    return NextResponse.json(
      { fighter },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof MetadataLoadError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Load failed";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
