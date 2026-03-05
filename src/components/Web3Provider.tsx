'use client';

import React, { ReactNode } from 'react';
import { wagmiAdapter, projectId, networks } from '@/lib/web3/config';
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Setup queryClient
const queryClient = new QueryClient();

if (!projectId) {
    throw new Error('Project ID is not defined');
}

// Create modal
createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    features: {
        analytics: true
    }
});

export default function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
