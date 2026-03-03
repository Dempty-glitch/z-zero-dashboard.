'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { createConfig, WagmiProvider, http } from 'wagmi';
import { base, mainnet, bsc } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
    chains: [base, mainnet, bsc],
    connectors: [injected()],
    transports: {
        [base.id]: http(),
        [mainnet.id]: http(),
        [bsc.id]: http(),
    },
    ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
