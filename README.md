# Chog Rivalry

**Live:** [https://chogwarr.vercel.app](https://chogwarr.vercel.app)

Pokémon-style daily duels where your **Chog Genesis NFT is the fighter**.  
Repo name: **Chogwar**. Built for [Chogathon 2026](https://chogathon.chog.xyz) on Monad.

**Demo video:** _(add link)_

**Team:** webski101 — X @webski101, Discord webski101

## Try it in 30 seconds

1. Open [https://chogwarr.vercel.app](https://chogwarr.vercel.app)
2. Click **Sample holder** (loads a real Genesis wallet, view-only)
3. Pick a Chog → **Enter the ring** → Strike / Disrupt / Guard

No wallet install required for the sample path. Sample fights are **not ranked**.

## Why the NFT is essential

If you remove the Chog NFT, the game has no fighters.

| Without NFT | Breaks |
| --- | --- |
| Daily rival | Deterministic pick of a real `tokenId` (1…totalSupply) on Genesis `0xc96d…` |
| Practice roster | Real Genesis tokenIds + real metadata (**Practice — unranked**) |
| Stats / kits | Score-based mapping from on-chain attributes |
| Ranked board | Server replays moves after `ownerOf` + signed nonce; needs KV |

Practice never writes the season board, daily duel lock, or rematch. Ranked play needs a wallet that owns Genesis (Sample holder is view-only).

## Trait → archetype / stats

Matching is **case-insensitive**. Archetype is **score-based** (highest wins; ties break by `tokenId` hash). Whole-word / exact matches only — e.g. `"horn"` does not match `"Horny Cap"`; mouth `"wo"` matches only the exact value `wo`.

| Archetype | Strong signals (examples) | Base feel |
| --- | --- | --- |
| **Chaos** | laser eyes (fire / Purple / Green / cyan), Plasma visor, radioactive / 1:1 base, naked Yes, Epic/Legendary tier, Red Candle / SB accessory | High chaos |
| **Tank** | mouth Worried (exact) / Flat; head Crown / Spartan / Helmet; body Inmate / Prisoner | High grit |
| **Brute** | mouth Gold tooth / Rainbow puke; eyes Angry / Thug; head Horns (whole word); aura Fire; Knife / Cigar | High power |
| **Trickster** | eyes Side eye / Frog / Tired / Anime Glass; mouth Clown / wo (exact); head JEET / MMGA / Clown; Fwog / Heart | Chaos + speed |
| **Speed** | eyes Modern VR / Retro glass / BTC Glass; skin Yellow / Multi / Jade; aura Wind / Aqua; Coin accessory | High speed |

Stat bonuses (shown as **Why these stats**) still apply on top of lowered archetype bases with a soft cap above 90 so values spread ~45–99.

| Trait | Bonus |
| --- | --- |
| fire laser eyes | +8 power |
| Purple laser eyes | +7 chaos |
| Plasma visor / Anime Glass | +5 / +4 chaos (not Speed) |
| Modern VR / BTC Glass | +6 speed |
| Worried / Flat mouth | +8 grit |
| Clown Mouth | +6 chaos |
| wo (exact) | +4 chaos |
| Crown | +8 grit |
| JEET / MMGA Cap | +6 chaos |
| BTC Cap / Star Cap | +5 speed |
| Fwog / Heart / Cigar / Knife / Red Candle / Coin / SB | +3 relevant stat |
| Uncommon / Rare / Epic / Legendary tier | +3 / +6 / +9 / +12 all |

Rules live in `src/lib/traits.ts`. Measure with:

```bash
npm run trait-distribution
```

### Sample output (n=320 cached metadata)

```
## Archetypes
- brute: 74 (23.1%)
- chaos: 62 (19.4%)
- speed: 52 (16.3%)
- tank: 50 (15.6%)
- trickster: 82 (25.6%)

## Laser eyes → Chaos: 39/49 (79.6%)

## power (min 45 max 96, n@99=0)
## speed (min 33 max 96, n@99=0)
## chaos (min 35 max 98, n@99=0)
## grit (min 37 max 96, n@99=0)
```

## $CHOG rematch

Hold **≥ 1,000 $CHOG** → unlock **+1 rematch/day** (hold-to-unlock, **no transaction**).

- Balance checked **server-side** at unlock (`/api/rematch/verify` → `balanceOf`)
- Live balance shown in the arena

## Screenshots

| | |
| --- | --- |
| Fighter cards + Why these stats | `public/screenshots/fighter-cards.png` |
| Mid-fight crit | `public/screenshots/mid-fight-crit.png` |
| Result card | `public/screenshots/result-card.png` |

Submission banner (1200×630, real Genesis art): `public/chogathon-banner.png`.  
Open Graph: `/opengraph-image`.

## Architecture

```
Monad RPC (chain 143)
  → Route Handlers (/api/owned-chogs, /api/chog/[tokenId], /api/rival, /api/practice,
                    /api/chog-balance, /api/rematch/verify, /api/leaderboard*)
  → Client game (Arena): pick fighter → daily rival → turn-based duel → optional ranked submit
```

- Metadata: `tokenURI` → IPFS (Pinata → ipfs.io → dweb.link), retries, **502 + no-store** on failure (never trait-less success). Art id ≠ token id — image always from metadata.
- Daily rival: hash → tokenId ≠ player; on metadata failure, advance to next id.
- Ranked: server issues nonce, client signs day + token + nonce + move ids; server reloads fighters, replays `createBattle`/`playTurn`, derives winner. Client `won` is ignored.
- Leaderboard storage: **Upstash Redis / Vercel KV required**. Without env vars the UI shows **Leaderboard offline**.

### Env (required for ranked leaderboard)

```
KV_REST_API_URL + KV_REST_API_TOKEN
# or
UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
```

## Contracts

| Asset | Address |
| --- | --- |
| Chog Genesis NFT | `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763` |
| $CHOG | `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777` |

All reads are **view-only** — no write transactions.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

```bash
npm run build
npm run lint
npm run trait-distribution
```

## What’s next

- Wire Upstash on the Vercel project for durable ranked storage
- Spend/burn `$CHOG` for rematch instead of hold-to-unlock
- WalletConnect / mobile deep links

## Built with

Built with AI coding tools (**Cursor**). Pre-existing: **create-next-app**, **shadcn/ui**, **viem**.
