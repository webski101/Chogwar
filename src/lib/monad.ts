export const MONAD_CHAIN_ID = 143;
export const MONAD_CHAIN_HEX = "0x8f";

export const MONAD_RPC = "https://rpc.monad.xyz";

export const CHOG_GENESIS_ADDRESS =
  "0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763" as const;

export const CHOG_TOKEN_ADDRESS =
  "0x350035555E10d9AfAF1566AaebfCeD5BA6C27777" as const;

/** Rematch unlock if wallet holds at least this many $CHOG (whole tokens). */
export const CHOG_REMATCH_COST = BigInt(1000);

export const MONAD_CHAIN = {
  id: MONAD_CHAIN_ID,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [MONAD_RPC] },
  },
  blockExplorers: {
    default: { name: "MonadScan", url: "https://monadscan.com" },
  },
} as const;

export const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokensOfOwner(address owner) view returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)",
] as const;

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
] as const;

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export { ipfsToHttp } from "@/lib/ipfs";
