import type { ChogFighter } from "@/lib/chogs";
import { cn } from "@/lib/utils";

type Props = {
  chog: ChogFighter;
  className?: string;
  size?: "sm" | "md" | "lg";
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
    size === "sm" ? "h-16 w-16" : size === "lg" ? "h-44 w-44" : "h-28 w-28";

  return (
    <div
      className={cn(
        "relative shrink-0",
        dim,
        bouncing && "animate-chog-bounce",
        hit && "animate-chog-hit",
        className,
      )}
      style={{ filter: `drop-shadow(0 0 18px ${chog.glow})` }}
      aria-hidden
    >
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <radialGradient id={`bg-${chog.id}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={chog.accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0b1f14" stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="52" fill={`url(#bg-${chog.id})`} />
        <ellipse cx="60" cy="68" rx="34" ry="30" fill="#12261a" />
        {/* ears */}
        <ellipse
          cx="34"
          cy="34"
          rx="12"
          ry="16"
          fill={chog.accent}
          transform="rotate(-18 34 34)"
        />
        <ellipse
          cx="86"
          cy="34"
          rx="12"
          ry="16"
          fill={chog.accent}
          transform="rotate(18 86 34)"
        />
        {/* face */}
        <ellipse cx="60" cy="62" rx="28" ry="24" fill="#1a3324" />
        {/* eyes */}
        <circle cx="48" cy="58" r="6" fill="#f7fee7" />
        <circle cx="72" cy="58" r="6" fill="#f7fee7" />
        <circle cx="49" cy="59" r="2.5" fill="#052e16" />
        <circle cx="73" cy="59" r="2.5" fill="#052e16" />
        {/* mouth by vibe */}
        <path
          d={
            chog.archetype === "tank"
              ? "M48 74 H72"
              : chog.archetype === "brute"
                ? "M46 72 Q60 86 74 72"
                : "M48 72 Q60 82 72 72"
          }
          stroke="#f7fee7"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {/* accessory hint */}
        <circle cx="60" cy="42" r="4" fill={chog.accent} opacity="0.9" />
      </svg>
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#0b1f14]/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#b8f000] ring-1 ring-[#b8f000]/40">
        #{chog.tokenId}
      </span>
    </div>
  );
}
