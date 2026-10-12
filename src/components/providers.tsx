"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { publicEnv, rpcFor, type Cluster } from "@/lib/client-env";

type NetworkContextValue = {
  network: Cluster;
  setNetwork: (network: Cluster) => void;
  mainnetLocked: boolean;
};

const NetworkContext = createContext<NetworkContextValue>({
  network: "devnet",
  setNetwork: () => undefined,
  mainnetLocked: true,
});

export function useNetwork() {
  return useContext(NetworkContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<Cluster>(publicEnv.defaultNetwork);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  const endpoint = rpcFor(network) || publicEnv.rpcDevnet;

  useEffect(() => {
    const stored = window.localStorage.getItem("np-network");
    if (stored === "devnet") setNetworkState("devnet");
    if (stored === "mainnet-beta" && publicEnv.allowMainnet && publicEnv.rpcMainnet) setNetworkState("mainnet-beta");
  }, []);

  const setNetwork = (next: Cluster) => {
    if (next === "mainnet-beta" && (!publicEnv.allowMainnet || !publicEnv.rpcMainnet)) return;
    setNetworkState(next);
    window.localStorage.setItem("np-network", next);
  };

  return (
    <NetworkContext.Provider value={{ network, setNetwork, mainnetLocked: !publicEnv.allowMainnet || !publicEnv.rpcMainnet }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          {children}
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
}
