"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { shortenAddress } from "@/lib/monad";

export function WalletBar() {
  const {
    address,
    connected,
    status,
    error,
    hasProvider,
    connect,
    disconnect,
    useSampleHolder,
  } = useWallet();

  return (
    <div className="flex flex-col items-end gap-1">
      {connected && address ? (
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-[#b8f000]/30 bg-[#b8f000]/10 px-2.5 py-1 font-mono text-xs text-[#b8f000]">
            {shortenAddress(address)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={disconnect}
            className="border-white/15 bg-transparent text-[#c5d6c8] hover:bg-white/5"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={useSampleHolder}
            className="border-[#b8f000]/35 bg-transparent text-[#b8f000] hover:bg-[#b8f000]/10"
          >
            Sample holder
          </Button>
          <Button
            size="sm"
            onClick={connect}
            disabled={status === "connecting"}
            className="bg-[#b8f000] font-semibold text-[#0b1f14] hover:bg-[#d4ff4d]"
          >
            {status === "connecting" ? "Connecting…" : "Connect wallet"}
          </Button>
        </div>
      )}
      {error && <p className="max-w-[220px] text-right text-[11px] text-[#ff6b4a]">{error}</p>}
      {!hasProvider && !connected && (
        <p className="max-w-[260px] text-right text-[11px] text-[#8aa392]">
          No injected wallet? Use Sample holder, or install MetaMask on Monad.
        </p>
      )}
    </div>
  );
}
