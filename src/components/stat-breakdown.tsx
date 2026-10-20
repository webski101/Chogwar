import type { ChogFighter } from "@/lib/chogs";

export function StatBreakdown({
  chog,
  compact,
}: {
  chog: ChogFighter;
  compact?: boolean;
}) {
  const lines = chog.bonuses?.length
    ? chog.bonuses.map((b) => b.label)
    : ["Base archetype stats (no trait bonuses)"];

  return (
    <div
      className={
        compact
          ? "mt-1 space-y-0.5 text-[10px] leading-snug text-[#a89f94]"
          : "mt-2 space-y-1 rounded-md border border-white/10 bg-[#171412]/60 px-3 py-2 text-xs text-[#d9d0c5]"
      }
    >
      <p
        className={
          compact
            ? "font-medium uppercase tracking-wide text-[#e85d04]/90"
            : "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e85d04]"
        }
      >
        Why these stats
      </p>
      <ul className={compact ? "list-none" : "list-disc pl-4"}>
        {lines.slice(0, compact ? 3 : 8).map((line) => (
          <li key={line}>{line}</li>
        ))}
        {lines.length > (compact ? 3 : 8) && (
          <li className="text-[#a89f94]">+{lines.length - (compact ? 3 : 8)} more</li>
        )}
      </ul>
    </div>
  );
}
