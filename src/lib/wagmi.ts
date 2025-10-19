import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

const rawProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER = 'GET_YOUR_PROJECT_ID_FROM_WALLETCONNECT_CLOUD';
const projectId = rawProjectId && !rawProjectId.includes('GET_YOUR_PROJECT_ID') ? rawProjectId : undefined;

if (!projectId) {
  // Friendly dev-time warning to avoid noisy WalletConnect relayer errors when no project id is configured
  // (prevents the client from attempting to open a relayer socket with an invalid key)
  // Keep this console message low-volume (warn) so it's visible but not noisy compared to vendor logs.
  // If you intentionally don't want WalletConnect in this environment, set VITE_WALLETCONNECT_PROJECT_ID
  // or leave it empty to skip initialization in higher-level code.
  // eslint-disable-next-line no-console
  console.warn('[walletconnect] VITE_WALLETCONNECT_PROJECT_ID is not set or is a placeholder — WalletConnect Cloud relayer will not be available.');
}

export const config = getDefaultConfig({
  appName: 'Proofs - On-Chain Certificates',
  projectId: projectId ?? PLACEHOLDER,
  chains: [base, baseSepolia],
  ssr: false,
});
