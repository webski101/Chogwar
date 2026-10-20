# Chog Rivalry

**Live:** [https://chogwarr.vercel.app](https://chogwarr.vercel.app)

Pokémon-style daily duels where your **Chog Genesis NFT is the fighter**.  
Repo name: **Chogwar**. Built for [Chogathon 2026](https://chogathon.chog.xyz) on Monad.

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
| Practice roster | Real Genesis tokenIds + real metadata (labeled **Practice — unranked**) |
| Stats / kits | Mapped from on-chain attributes (eyes, mouth, head, tier, …) |
| Ranked board | One result per token per day after `ownerOf` + signed message |

Practice never writes the season board, daily duel lock, or rematch. Ranked play needs a wallet that owns Genesis (Sample holder is view-only).

## Trait → archetype / stats

Matching is **case-insensitive**. Base stats come from archetype; traits add visible bonuses. Rarer **tier** adds a small all-stat bump.

| Archetype | Triggered by (examples) | Base feel |
| --- | --- | --- |
| **Tank** | mouth Worried / Flat; head Spartan / Helmet; body Inmate | High grit, low speed |
| **Speed** | eyes Visor / VR / glasses; skin Yellow / Multi / Jade; aura Wind / Aqua | High speed |
| **Brute** | mouth Gold tooth / Rainbow puke; eyes Angry / Thug; head Horns; aura Fire | High power |
| **Trickster** | eyes Side eye / Frog / Tired; mouth Clown / wo; head JEET / MMGA / Clown | Chaos + speed |
| **Chaos** | eyes *laser* / Plasma; tier Rare+; naked Yes; radioactive base | High chaos |

### Bonus examples (shown as “Why these stats”)

| Trait | Bonus |
| --- | --- |
| fire laser eyes | +8 power |
| Purple laser eyes | +7 chaos |
| Modern VR / visor | +6 speed |
| Frog / Tired eyes | +4 grit |
| Worried / Flat mouth | +8 grit |
| Clown Mouth | +6 chaos |
| Crown | +8 grit |
| JEET Cap / MMGA Cap / etc. | +6 chaos |
| BTC Cap / Star Cap | +5 speed |
| Uncommon tier | +3 all |
| Rare tier | +6 all |
| Epic / Legendary | +9 / +12 all |

Full rules live in `src/lib/traits.ts` (sampled across ~200 metadata files for the real vocabulary: background, aura, base, skin, side, body, mouth, eyes, head, form, tier, naked).

## $CHOG rematch

Hold **≥ 1,000 $CHOG** → unlock **+1 rematch/day** (hold-to-unlock, **no transaction**).

- Balance is checked **server-side** at unlock (`/api/rematch/verify` → `balanceOf`)
- Live balance shown in the arena
- Rematch does not spend or burn tokens

## Screenshots

Open the live site for the current UI. Submission banner: `public/chogathon-banner.png` (1200×630). Open Graph image is generated at `/opengraph-image`.

## Architecture

```
Monad RPC (chain 143)
  → Route Handlers (/api/owned-chogs, /api/chog/[tokenId], /api/rival, /api/practice,
                    /api/chog-balance, /api/rematch/verify, /api/leaderboard*)
  → Client game (Arena): pick fighter → daily rival → turn-based duel → optional ranked submit
```

- Metadata: `tokenURI` → IPFS (Pinata) → cached 1 day on `/api/chog/[tokenId]`
- Daily rival: hash(`playerTokenId:day`) → tokenId ≠ player
- Leaderboard: Vercel KV / Upstash Redis when env is set; otherwise in-memory (local / cold)

### Env (optional, for durable leaderboard)

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
```

## What’s next

- Durable season board with KV by default in prod
- Spend/burn `$CHOG` for rematch instead of hold-to-unlock
- WalletConnect / mobile deep links
- On-chain wagers (optional; out of scope for this read-only entry)

## Built with

Built with AI coding tools (**Cursor**). Pre-existing: **create-next-app**, **shadcn/ui**, **viem**.
}