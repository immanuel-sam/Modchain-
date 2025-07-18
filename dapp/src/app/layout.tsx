'use client';

import React from 'react';
import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { CivicAuthProvider } from '@civic/auth-web3/nextjs';
import RetroNav from './RetroNav';

const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  connectors: [], // Civic's embeddedWallet will be used internally
});

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <CivicAuthProvider clientId={process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID!} initialChain={sepolia}>
              <RetroNav />
              {children}
            </CivicAuthProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
