"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { shortenAddress } from "@/lib/monad";

export function WalletBar() {
  const {
    address,
    connected,
    isSample,
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
          {isSample && (
            <span className="rounded border border-[#e85d04]/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#e85d04]">
              Sample · view-only
            </span>
          )}
          <span className="font-mono text-xs text-[#d9d0c5]">
            {shortenAddress(address)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={disconnect}
            className="border-white/15 bg-transparent text-[#a89f94] hover:bg-white/5 hover:text-[#f3ebe2]"
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
            className="border-white/20 bg-transparent text-[#d9d0c5] hover:bg-white/5"
          >
            Sample holder
          </Button>
          <Button
            size="sm"
            onClick={connect}
            disabled={status === "connecting"}
            className="bg-[#e85d04] font-semibold text-[#1a0c04] hover:bg-[#ff7a2f]"
          >
            {status === "connecting" ? "Connecting…" : "Connect"}
          </Button>
        </div>
      )}
      {error && (
        <p className="max-w-[220px] text-right text-[11px] text-[#c45c4a]">{error}</p>
      )}
      {!hasProvider && !connected && (
        <p className="max-w-[240px] text-right text-[11px] text-[#a89f94]">
          No wallet? Sample holder loads real Genesis.
        </p>
      )}
    </div>
  );
}
