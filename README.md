# Chog Rivalry

Pokémon battles, but your Chog NFT is the Pokémon.

Built for [Chogathon 2026](https://chogathon.chog.xyz) — a daily duel arena where Chog Genesis traits become combat DNA. Remove the NFT and there is no fighter.

## Why the Chog NFT matters

Your Chog isn’t a login badge — it’s the fighter. Its traits set the stats, so a different Chog means a different battle.

## Features

- Demo Chog roster with archetype + trait-derived stats (power, speed, chaos, grit)
- Deterministic daily rival matchups
- Animated duel with match log + HP bars
- Local season leaderboard
- Hook points for optional `$CHOG` stakes / rematch boosts / cosmetics (disabled in v1)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

## Stack

Next.js · TypeScript · Tailwind CSS · shadcn/ui

## What’s next

- Wallet connect + real Chog Genesis ownership on Monad
- On-chain season board
- Meaningful `$CHOG` wagering and boosts
