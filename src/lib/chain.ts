// Real Contract Integration Layer
// TODO: Wire these functions to actual smart contract calls

import { CONTRACT_ADDRESS, CONTRACT_ABI } from './mockChain';
import { Certificate, CertificateMeta } from '@/types/certificate';

/**
 * Issue a new certificate on-chain
 * Call this from the Issue page after uploading metadata to IPFS
 * 
 * @param recipient - Recipient wallet address
 * @param tokenURI - IPFS URI containing certificate metadata
 * @returns Transaction hash and token ID
 */
export async function issueCertificateOnChain(
  recipient: `0x${string}`,
  tokenURI: string
): Promise<{ txHash: string; tokenId: string }> {
  // TODO: Implement with wagmi writeContract
  // Example:
  // const { hash } = await writeContract({
  //   address: CONTRACT_ADDRESS,
  //   abi: CONTRACT_ABI,
  //   functionName: 'issueCertificate',
  //   args: [recipient, tokenURI],
  // });
  
  console.log('TODO: Issue certificate on-chain', { recipient, tokenURI });
  
  throw new Error('Not implemented - wire to smart contract');
}

/**
 * Accept a certificate (recipient only)
 * 
 * @param tokenId - Certificate token ID
 * @returns Transaction hash
 */
export async function acceptCertificateOnChain(
  tokenId: string
): Promise<{ txHash: string }> {
  // TODO: Implement with wagmi writeContract
  // Verify msg.sender is the recipient
  
  console.log('TODO: Accept certificate on-chain', { tokenId });
  
  throw new Error('Not implemented - wire to smart contract');
}

/**
 * Decline a certificate (recipient only)
 * 
 * @param tokenId - Certificate token ID
 * @returns Transaction hash
 */
export async function declineCertificateOnChain(
  tokenId: string
): Promise<{ txHash: string }> {
  // TODO: Implement with wagmi writeContract
  
  console.log('TODO: Decline certificate on-chain', { tokenId });
  
  throw new Error('Not implemented - wire to smart contract');
}

/**
 * Get certificate data from chain
 * 
 * @param tokenId - Certificate token ID
 * @returns Certificate data
 */
export async function getCertificateFromChain(
  tokenId: string
): Promise<Certificate | null> {
  // TODO: Implement with wagmi readContract
  // Then fetch metadata from tokenURI (IPFS)
  
  console.log('TODO: Get certificate from chain', { tokenId });
  
  throw new Error('Not implemented - wire to smart contract');
}

/**
 * Get all certificates for an address
 * Consider indexing with The Graph or a backend service
 * 
 * @param address - Wallet address
 * @param type - 'collected' or 'issued'
 * @returns Array of certificates
 */
export async function getCertificatesForAddress(
  address: `0x${string}`,
  type: 'collected' | 'issued'
): Promise<Certificate[]> {
  // TODO: Query blockchain events or use an indexer
  // CertificateIssued events for issued
  // Filter by recipient/issuer
  
  console.log('TODO: Get certificates for address', { address, type });
  
  throw new Error('Not implemented - wire to smart contract or indexer');
}

// Integration checklist:
// [ ] Deploy CertificateRegistry contract to Base
// [ ] Update CONTRACT_ADDRESS in mockChain.ts
// [ ] Add WalletConnect Project ID to .env.local
// [ ] Implement writeContract calls with wagmi
// [ ] Add transaction confirmation toasts
// [ ] Handle gas estimation and errors
// [ ] Test on Base Sepolia testnet first
// [ ] Set VITE_USE_MOCK=false when ready
