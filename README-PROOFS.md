# Proofs - On-Chain Certificates

A Web3 application for issuing, managing, and verifying on-chain certificates on Base L2. Organizations can mint verifiable credentials as ERC-721 NFTs, and recipients can accept or decline them with full transparency.

## Features

- 🔐 **Wallet Integration**: Connect with Coinbase Wallet, MetaMask, WalletConnect via RainbowKit
- 📜 **Certificate Management**: View collected and issued certificates
- 🔔 **Notifications**: Accept or decline pending certificates
- ✨ **Create Certificates**: Issue new credentials with rich metadata
- 🔗 **Shareable Proofs**: Public verification pages for each certificate
- 🎨 **Modern UI**: Beautiful glass morphism design with smooth animations
- 🌐 **Base Network**: Built for Base and Base Sepolia

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS with custom design system
- **Web3**: wagmi + RainbowKit + viem
- **State**: Zustand
- **UI Components**: shadcn/ui
- **Routing**: React Router

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Web3 wallet (MetaMask, Coinbase Wallet, etc.)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Connect Your Wallet

1. Click "Connect Wallet" in the top right
2. Select your preferred wallet provider
3. Approve the connection
4. Switch to Base or Base Sepolia if prompted

## Usage

### Viewing Certificates

- **Collected Tab**: View certificates you've received and accepted
- **Issued Tab**: View certificates you've issued to others

### Creating a Certificate

1. Click the "Create" button in navigation
2. Fill in the certificate details:
   - Recipient wallet address
   - Title and description
   - Organization name
   - Optional: Category, skills, dates, evidence URLs, image
3. Preview your certificate on the right
4. Click "Issue Certificate"

The recipient will receive a notification to accept or decline.

### Managing Notifications

1. Click the bell icon (shows badge with count)
2. View pending certificates
3. Accept or decline each certificate
4. Accepted certificates appear in your "Collected" tab

### Sharing Certificates

- Click "Copy Link" on any certificate card
- Share the public proof link: `https://yourapp.com/cert/[id]`
- Anyone can verify the certificate on-chain

## Mock Data Mode

The app currently runs with mock data by default. This allows you to:
- Test all features without deploying contracts
- Iterate on UI/UX quickly
- Toggle mock mode via environment variable

### Wiring to Real Contracts

To connect to deployed smart contracts:

1. **Deploy the CertificateRegistry contract** to Base or Base Sepolia
2. **Update contract address** in `src/lib/mockChain.ts`:
   ```typescript
   export const CONTRACT_ADDRESS = '0xYourContractAddress';
   ```
3. **Add contract ABI** to the same file (already has placeholder)
4. **Toggle mock mode**: Set environment variable
   ```
   VITE_USE_MOCK=false
   ```
5. **Implement real contract calls** in `src/lib/chain.ts` (TODO file to create)

### Contract Interface

The contract should implement:

```solidity
function issueCertificate(address recipient, string tokenURI) returns (uint256 tokenId)
function acceptCertificate(uint256 tokenId)
function declineCertificate(uint256 tokenId)
function getCertificate(uint256 tokenId) view returns (...)
```

With events:
```solidity
event CertificateIssued(uint256 indexed tokenId, address indexed issuer, address indexed recipient, string tokenURI)
event CertificateAccepted(uint256 indexed tokenId, address indexed recipient)
event CertificateDeclined(uint256 indexed tokenId, address indexed recipient)
```

## Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── Navigation.tsx   # Top nav with wallet connect
│   ├── CertificateCard.tsx
│   ├── StatusBadge.tsx
│   ├── NotificationsDrawer.tsx
│   └── WalletGuard.tsx  # Wallet connection guard
├── pages/               # Route pages
│   ├── Home.tsx         # Main page with tabs
│   ├── CertificateDetail.tsx  # Public share page
│   └── IssueCertificate.tsx   # Create form
├── lib/
│   ├── wagmi.ts         # wagmi configuration
│   ├── mockChain.ts     # Mock data & contract ABI
│   └── utils.ts         # Utility functions
├── store/
│   └── useAppStore.ts   # Zustand state management
├── types/
│   └── certificate.ts   # TypeScript types
└── index.css            # Design system tokens
```

## Design System

All colors, gradients, and animations are defined in the design system:

- **Colors**: Primary (blue), Secondary (purple), Accent (mint green)
- **Semantic tokens**: All in HSL format in `src/index.css`
- **Custom utilities**: `gradient-mesh`, `glass-card` classes
- **Animations**: Smooth transitions, fade-in, slide-up

## Environment Variables

Create a `.env.local` file:

```env
# Mock data toggle
VITE_USE_MOCK=true

# WalletConnect Project ID (get from cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Contract address (when ready)
VITE_CERTIFICATE_CONTRACT=0x...
```

## Deployment

Build for production:

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

## Security Considerations

- ✅ Input validation with proper type checking
- ✅ Address checksum validation
- ✅ Network switching enforcement
- ✅ Recipient verification before accepting
- ⚠️ Implement rate limiting when connecting real contracts
- ⚠️ Add IPFS pinning service for metadata storage

## Future Enhancements

- [ ] IPFS integration for metadata storage
- [ ] ENS resolution for addresses
- [ ] Auto-generated certificate SVG images
- [ ] QR codes on share pages
- [ ] Search and filter certificates
- [ ] Export certificate as PDF
- [ ] Batch certificate issuance
- [ ] Revocation mechanism
- [ ] Analytics dashboard

## Contributing

This is a Lovable project! To contribute:

1. Make changes via Lovable IDE
2. Or clone the repo and push changes
3. All changes sync automatically

## License

MIT

## Support

For issues or questions:
- Check the documentation
- Review the mock data setup
- Ensure wallet is connected to Base network
- Verify contract addresses and ABI

---

Built with ❤️ using Lovable, Base, and Web3
