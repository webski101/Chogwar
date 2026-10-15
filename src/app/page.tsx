import { Arena } from "@/components/arena";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-x-hidden">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="animate-hero-drift absolute -left-1/4 top-0 h-[70vh] w-[80vw] rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(184,240,0,0.22) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute right-0 top-20 h-[50vh] w-[50vw] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,107,74,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b8f000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <p className="font-heading text-lg font-extrabold tracking-tight text-[#b8f000]">
          Chog Rivalry
        </p>
        <a
          href="#arena"
          className="text-sm font-medium text-[#c5d6c8] transition hover:text-[#b8f000]"
        >
          Enter arena
        </a>
      </header>

      {/* Hero — brand + one headline + support + CTA + dominant visual plane */}
      <section className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-10">
        <div className="relative min-h-[70vh] overflow-hidden rounded-[2.5rem] border border-white/10">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(145deg, #0b1f14 0%, #12261a 40%, #1a120e 100%)",
            }}
          />
          <div
            className="animate-hero-drift absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(ellipse at 70% 40%, rgba(184,240,0,0.35), transparent 50%), radial-gradient(ellipse at 25% 70%, rgba(255,107,74,0.28), transparent 45%)",
            }}
          />
          {/* Dominant arena silhouette */}
          <svg
            className="absolute inset-x-0 bottom-0 h-[55%] w-full opacity-40"
            viewBox="0 0 800 280"
            preserveAspectRatio="none"
            aria-hidden
          >
            <ellipse cx="400" cy="220" rx="320" ry="40" fill="#b8f000" opacity="0.15" />
            <path
              d="M80 200 Q200 80 400 120 T720 200 L720 280 L80 280 Z"
              fill="#041008"
              opacity="0.7"
            />
            <circle cx="260" cy="150" r="48" fill="#b8f000" opacity="0.35" />
            <circle cx="540" cy="145" r="48" fill="#ff6b4a" opacity="0.35" />
          </svg>

          <div className="relative z-10 flex min-h-[70vh] flex-col justify-end gap-6 p-6 sm:justify-center sm:p-12 lg:max-w-2xl">
            <p className="animate-fade-up font-heading text-5xl font-extrabold leading-[0.95] tracking-tight text-[#b8f000] sm:text-7xl">
              Chog Rivalry
            </p>
            <h1 className="animate-fade-up-delay font-heading text-2xl font-bold leading-tight text-[#f4ffe8] sm:text-4xl">
              Pokémon battles, but your Chog NFT is the Pokémon.
            </h1>
            <p className="animate-fade-up-delay-2 max-w-md text-base text-[#c5d6c8] sm:text-lg">
              Traits become combat DNA. One daily duel. Climb the season board —
              $CHOG stakes come later.
            </p>
            <div className="animate-fade-up-delay-2 flex flex-wrap gap-3">
              <a
                href="#pick"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#b8f000] px-7 text-base font-bold text-[#0b1f14] transition hover:bg-[#d4ff4d]"
              >
                Pick your Chog
              </a>
              <a
                href="#board"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-transparent px-7 text-base font-medium text-[#f4ffe8] transition hover:bg-white/5"
              >
                View board
              </a>
            </div>
          </div>
        </div>
      </section>

      <Arena />

      <footer className="mt-auto border-t border-white/10 py-8 text-center text-xs text-[#8aa392]">
        Built for Chogathon 2026 · NFT-essential daily duels · Demo roster until
        wallet connect
      </footer>
    </div>
  );
}
