# Welcome to Ledgerd

## 🧾 Ledgerd — Verifiable On-Chain Certificates

Ledgerd is an open-source MiniApp for issuing and verifying on-chain certificates — digital proofs of internships, hackathons, courses, and other achievements — built on Base.

Traditional certificates and résumés are easy to fake and hard to verify. Ledgerd replaces fragile PDFs with verifiable NFTs or on-chain attestations that can be trusted, shared, and checked instantly.
**URL**: https://proofwise-link.vercel.app/

### 🔗 How It Works

Issuer verification: Every certificate comes from a verified Base address (e.g. a company, university, or hackathon).

Credential minting: Organizations issue certificates as ERC-721 NFTs containing metadata like recipient, title, description, dates, and skills.

Verification: Anyone can confirm authenticity directly on the blockchain — no middleman or email verification needed.

Storage: Certificate metadata and images are stored on IPFS via NFT.Storage for transparency and immutability.

### 🧩 Key Features

Factory architecture: Any organization can create its own certificate collection through a shared on-chain Factory contract.

Decentralized verification: Recipients and employers can instantly verify issuer authenticity via the blockchain.

Integrated wallet flow: Built with Wagmi and Viem for seamless wallet connections and minting on Base.

IPFS integration: Metadata automatically uploaded to IPFS; each certificate has a permanent ipfs:// link.

MiniApp-ready: Designed for Farcaster MiniApps and compatible with dTech.vision’s on-chain distribution layer.

### 🚀 Vision

Ledgerd makes credentials portable, verifiable, and composable — turning every achievement into an on-chain proof of skill and trust.
