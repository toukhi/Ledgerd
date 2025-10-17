import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Proofs - On-Chain Certificates',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'GET_YOUR_PROJECT_ID_FROM_WALLETCONNECT_CLOUD',
  chains: [base, baseSepolia],
  ssr: false,
});
