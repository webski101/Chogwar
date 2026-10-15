import { Arena } from "@/components/arena";
import { WalletBar } from "@/components/wallet-bar";
import { chogArtUrl } from "@/lib/chogs";

const HERO_CHOG = chogArtUrl(883);

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-x-hidden bg-[#171412]">
      <div className="pointer-events-none absolute inset-0 -z-10 grain opacity-[0.04]" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <p className="font-heading text-xl font-semibold tracking-tight text-[#f3ebe2]">
          Chog Rivalry
        </p>
        <WalletBar />
      </header>

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-2 sm:px-6 sm:pb-16">
        <div className="relative min-h-[78vh] overflow-hidden rounded-2xl">
          {/* Full-bleed Chog art */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_CHOG}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, rgba(23,20,18,0.92) 0%, rgba(23,20,18,0.72) 42%, rgba(23,20,18,0.25) 70%, rgba(23,20,18,0.55) 100%)",
            }}
          />

          <div className="relative z-10 flex min-h-[78vh] max-w-xl flex-col justify-end gap-5 p-6 sm:justify-center sm:p-12">
            <p className="animate-fade-up font-heading text-6xl font-semibold leading-[0.92] tracking-tight text-[#f3ebe2] sm:text-7xl">
              Chog Rivalry
            </p>
            <h1 className="animate-fade-up-delay font-heading text-2xl font-medium leading-snug text-[#f3ebe2]/95 sm:text-3xl">
              Your Genesis isn’t a ticket. It’s the fighter in the ring.
            </h1>
            <p className="animate-fade-up-delay-2 max-w-md text-base leading-relaxed text-[#d9d0c5]">
              Turn-based duels. Traits set HP and kits. Strike, disrupt, or guard —
              read the rival and take the round.
            </p>
            <div className="animate-fade-up-delay-2 flex flex-wrap gap-3 pt-1">
              <a
                href="#pick"
                className="inline-flex h-12 items-center justify-center rounded-md bg-[#e85d04] px-7 text-base font-semibold text-[#1a0c04] transition hover:bg-[#ff7a2f]"
              >
                Choose your Chog
              </a>
              <a
                href="#arena"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 px-7 text-base font-medium text-[#f3ebe2] transition hover:bg-white/5"
              >
                How fights work
              </a>
            </div>
          </div>
        </div>
      </section>

      <Arena />

      <footer className="mt-auto border-t border-white/10 py-8 text-center text-xs text-[#a89f94]">
        Chogathon 2026 · Monad Genesis traits · practice roster when you need it
      </footer>
    </div>
  );
}
