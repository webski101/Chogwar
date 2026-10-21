import { NextResponse } from "next/server";
import { CHOG_IMAGE_CID } from "@/lib/chogs";

type Params = { params: Promise<{ artId: string }> };

const PINATA = (artId: number) =>
  `https://gateway.pinata.cloud/ipfs/${CHOG_IMAGE_CID}/${artId}.webp`;
const DWEB = (artId: number) =>
  `https://dweb.link/ipfs/${CHOG_IMAGE_CID}/${artId}.webp`;

export async function GET(_request: Request, { params }: Params) {
  const { artId: raw } = await params;
  const artId = Number(raw);
  if (!Number.isInteger(artId) || artId < 1 || artId > 100_000) {
    return new NextResponse("Invalid artId", { status: 400 });
  }

  let lastStatus = 502;
  for (const url of [PINATA(artId), DWEB(artId)]) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 31_536_000 },
        headers: { Accept: "image/webp,image/*" },
      });
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": res.headers.get("Content-Type") || "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      /* try next gateway */
    }
  }

  return new NextResponse("Art unavailable", {
    status: lastStatus >= 400 ? lastStatus : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
