import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, base, bsc } from '@reown/appkit/networks'

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'b56e18d47c72ab683b10814fe9495694';

import type { AppKitNetwork } from '@reown/appkit/networks';

export const networks = [base, bsc, mainnet] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
    ssr: true,
    projectId,
    networks
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
