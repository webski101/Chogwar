# Chog Rivalry

Pokémon battles, but your Chog NFT is the Pokémon.

Built for [Chogathon 2026](https://chogathon.chog.xyz) — a daily duel arena where Chog Genesis traits become combat DNA. Remove the NFT and there is no fighter.

## Why the Chog NFT matters

Your Chog isn’t a login badge — it’s the fighter. Its traits set the stats, so a different Chog means a different battle.

## Features

- Connect an injected wallet on **Monad** (chain id `143`)
- Load real **Chog Genesis** NFTs (`tokensOfOwner` + IPFS traits → combat stats / HP)
- **Turn-based fights**: pick Strike / Disrupt / Guard each round (RPS + trait edges)
- Rival AI reads HP and archetype
- Practice roster when you don’t hold Genesis
- Local season board + **`$CHOG` rematch** (hold ≥ 1,000)

## Deploy

- **Your claimed project (live):** [agile-opal-34j1u87.vercel.app](https://agile-opal-34j1u87.vercel.app) — older build (before fighter-art fix)
- **Latest preview (with fighter art):** [temporary-nimble-citrine-v91u9ya.vercel.app](https://temporary-nimble-citrine-v91u9ya.vercel.app) · [Claim it](https://vercel.com/claim-deployment?code=19af8ad8-0068-4b5b-8e23-f4e3f3dded1b)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

## Stack

Next.js · TypeScript · Tailwind CSS · shadcn/ui

## Contracts

| Asset | Address |
| --- | --- |
| Chog Genesis NFT | `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763` |
| $CHOG | `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777` |

## What’s next

- On-chain season board / wagers
- Spend/burn `$CHOG` for rematch instead of hold-to-unlock
- WalletConnect / mobile deep links
