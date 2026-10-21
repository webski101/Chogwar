"use client";

import { useState } from "react";
import type { ChogFighter } from "@/lib/chogs";
import { cn } from "@/lib/utils";

type Props = {
  chog: ChogFighter;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  bouncing?: boolean;
  hit?: boolean;
};

export function ChogPortrait({
  chog,
  className,
  size = "md",
  bouncing,
  hit,
}: Props) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = Boolean(chog.image && loadedSrc === chog.image);
  const dim =
    size === "sm"
      ? "h-14 w-14"
      : size === "lg"
        ? "h-40 w-40 sm:h-52 sm:w-52"
        : size === "xl"
          ? "h-52 w-52 sm:h-64 sm:w-64"
          : "h-24 w-24";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl",
        dim,
        bouncing && "animate-chog-bounce",
        hit && "animate-chog-hit",
        className,
      )}
      aria-hidden
    >
      {/* Skeleton until onLoad — never an empty box */}
      <div
        className={cn(
          "absolute inset-0 animate-pulse bg-[#2a2622]",
          loaded && chog.image ? "opacity-0" : "opacity-100",
        )}
        style={
          !chog.image
            ? {
                background: `linear-gradient(160deg, ${chog.accent} 0%, #211e1b 70%)`,
                animation: "none",
              }
            : undefined
        }
      />
      {chog.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={chog.image}
          src={chog.image}
          alt=""
          decoding="async"
          onLoad={() => setLoadedSrc(chog.image ?? null)}
          className={cn(
            "relative h-full w-full object-cover shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <span className="relative flex h-full w-full items-end justify-center pb-4 font-heading text-3xl font-bold text-[#f3ebe2]/90">
          #{chog.tokenId}
        </span>
      )}
    </div>
  );
}
