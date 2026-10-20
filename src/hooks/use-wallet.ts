"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  MONAD_CHAIN_HEX,
  MONAD_CHAIN_ID,
  MONAD_RPC,
} from "@/lib/monad";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getProvider(): EthProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthProvider }).ethereum;
}

type WalletSnap = {
  address: string | null;
  hasProvider: boolean;
  /** Sample holder mode — view-only, never ranked. */
  isSample: boolean;
};

let snap: WalletSnap = { address: null, hasProvider: false, isSample: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setSnap(next: Partial<WalletSnap>) {
  snap = { ...snap, ...next };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return JSON.stringify(snap);
}

function getServerSnapshot() {
  return JSON.stringify({
    address: null,
    hasProvider: false,
    isSample: false,
  } satisfies WalletSnap);
}

async function ensureMonad(provider: EthProvider) {
  const chainIdHex = (await provider.request({ method: "eth_chainId" })) as string;
  const chainId = Number.parseInt(chainIdHex, 16);
  if (chainId === MONAD_CHAIN_ID) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MONAD_CHAIN_HEX }],
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: MONAD_CHAIN_HEX,
            chainName: "Monad",
            nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
            rpcUrls: [MONAD_RPC],
            blockExplorerUrls: ["https://monadscan.com"],
          },
        ],
      });
      return;
    }
    throw error;
  }
}

export function useWallet() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { address, hasProvider, isSample } = JSON.parse(raw) as WalletSnap;
  const [status, setStatus] = useState<"idle" | "connecting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = getProvider();
    setSnap({ hasProvider: Boolean(provider) });
    if (!provider) return;

    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      setSnap({ address: accounts?.[0] ?? null, isSample: false });
    };
    const onChain = () => {
      emit();
    };

    provider.request({ method: "eth_accounts" }).then((accounts) => {
      const list = accounts as string[];
      setSnap({ address: list[0] ?? null, hasProvider: true });
    });

    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setStatus("error");
      setError("No wallet found. Install MetaMask or another injected wallet.");
      return;
    }
    setStatus("connecting");
    setError(null);
    try {
      await ensureMonad(provider);
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      setSnap({
        address: accounts[0] ?? null,
        hasProvider: true,
        isSample: false,
      });
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Connect failed");
    }
  }, []);

  const disconnect = useCallback(() => {
    setSnap({ address: null, isSample: false });
    setError(null);
    setStatus("idle");
  }, []);

  /** Load a known Genesis holder without a browser wallet (view-only, not ranked). */
  const useSampleHolder = useCallback(() => {
    setSnap({
      address: "0xfa30b6ecBc2038e349Aa41a45DBeb859B3a9D9aE",
      hasProvider: snap.hasProvider,
      isSample: true,
    });
    setError(null);
    setStatus("idle");
  }, []);

  return {
    address,
    connected: Boolean(address),
    isSample,
    status,
    error,
    hasProvider,
    connect,
    disconnect,
    useSampleHolder,
  };
}
