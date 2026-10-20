import { NextResponse } from "next/server";
import { loadFighterByTokenId } from "@/lib/chog-loader";

export const revalidate = 86400;

type Params = { params: Promise<{ tokenId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { tokenId: raw } = await params;
  const tokenId = Number(raw);
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 100_000) {
    return NextResponse.json({ error: "Invalid tokenId" }, { status: 400 });
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
    const message = error instanceof Error ? error.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
