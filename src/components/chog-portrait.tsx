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
        "relative shrink-0",
        dim,
        bouncing && "animate-chog-bounce",
        hit && "animate-chog-hit",
        className,
      )}
      aria-hidden
    >
      {chog.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chog.image}
          alt=""
          className="h-full w-full rounded-xl object-cover shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
        />
      ) : (
        <div
          className="flex h-full w-full items-end justify-center rounded-xl"
          style={{
            background: `linear-gradient(160deg, ${chog.accent} 0%, #211e1b 70%)`,
          }}
        >
          <span className="pb-4 font-heading text-3xl font-bold text-[#f3ebe2]/90">
            #{chog.tokenId}
          </span>
        </div>
      )}
    </div>
  );
}
