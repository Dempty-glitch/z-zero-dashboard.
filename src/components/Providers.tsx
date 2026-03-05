'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { wagmiAdapter, projectId, networks } from '@/lib/web3/config';
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Initialize AppKit
if (typeof window !== 'undefined' && projectId) {
    createAppKit({
        adapters: [wagmiAdapter],
        networks,
        projectId,
        features: {
            analytics: true
        },
        themeMode: 'dark',
        themeVariables: {
            '--w3m-accent': '#10b981', // emerald-500
            '--w3m-border-radius-master': '1px'
        }
    });
}

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {mounted ? children : <div className="opacity-0">{children}</div>}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
