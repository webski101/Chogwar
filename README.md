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

Target production URL: **[chogwar.vercel.app](https://chogwar.vercel.app)**

Claim the latest build as `chogwar` (sets the project name):  
[Claim → name it chogwar](https://vercel.com/claim-deployment?code=55435b53-95a0-4ae1-bda9-d876df00e9af&name=chogwar)

Or in the Vercel dashboard: open your project → **Settings → General → Project Name** → set to `chogwar`.

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
