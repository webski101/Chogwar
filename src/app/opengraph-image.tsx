import { ImageResponse } from "next/og";

export const alt = "Chog Rivalry — Your Genesis is the fighter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 72,
          background:
            "linear-gradient(135deg, #171412 0%, #2a1a12 45%, #e85d04 160%)",
          color: "#f3ebe2",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 78% 30%, rgba(232,93,4,0.35), transparent 42%)",
          }}
        />
        <p
          style={{
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#e85d04",
            margin: 0,
            fontFamily: "sans-serif",
            fontWeight: 700,
          }}
        >
          Chogathon 2026
        </p>
        <p
          style={{
            fontSize: 96,
            fontWeight: 700,
            margin: "12px 0 0",
            lineHeight: 0.95,
            letterSpacing: -2,
          }}
        >
          Chog Rivalry
        </p>
        <p
          style={{
            fontSize: 32,
            margin: "20px 0 0",
            maxWidth: 720,
            color: "#d9d0c5",
            fontFamily: "sans-serif",
            fontWeight: 500,
          }}
        >
          Your Genesis NFT is the fighter. Traits set the fight.
        </p>
        <p
          style={{
            fontSize: 22,
            margin: "28px 0 0",
            color: "#a89f94",
            fontFamily: "sans-serif",
          }}
        >
          chogwarr.vercel.app · Monad · #Chogathon
        </p>
      </div>
    ),
    { ...size },
  );
}
