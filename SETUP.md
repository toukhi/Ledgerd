# Proofs Setup Guide

Quick setup guide to get your on-chain certificate platform running.

## 1. Initial Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

## 2. Get WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a free account
3. Create a new project
4. Copy your Project ID
5. Add to `.env.local`:
   ```
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

## 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:8080` and connect your wallet!

## 4. Test with Mock Data

The app runs in **mock mode** by default. This lets you:
- ✅ Test all features without deploying contracts
- ✅ Issue certificates and see them in notifications
- ✅ Accept/decline certificates
- ✅ View public share pages

### Using the Mock App

1. **Connect Wallet**: Click "Connect Wallet" in the navigation
2. **View Certificates**: See pre-loaded sample certificates
3. **Check Notifications**: Bell icon shows 1 pending certificate for test wallet
4. **Issue a Certificate**:
   - Click "Create" button
   - Fill in the form (use any valid address like `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4`)
   - Preview updates in real-time
   - Click "Issue Certificate"
5. **Share**: Copy the proof link and open in another tab

## 5. Deploy to Production (Lovable)

1. Click the **Publish** button in Lovable
2. Your app will be live instantly
3. Share your certificate platform!

## 6. Wire to Real Smart Contracts (Advanced)

When you're ready for real on-chain certificates:

### Step 1: Deploy the Contract

Deploy `CertificateRegistry.sol` to Base or Base Sepolia. Your contract should implement:

```solidity
contract CertificateRegistry is ERC721 {
    function issueCertificate(address recipient, string memory tokenURI) 
        public returns (uint256 tokenId);
    
    function acceptCertificate(uint256 tokenId) public;
    
    function declineCertificate(uint256 tokenId) public;
    
    function getCertificate(uint256 tokenId) 
        public view returns (address, address, string memory, uint8);
}
```

### Step 2: Update Configuration

In `.env.local`:
```env
VITE_USE_MOCK=false
VITE_CERTIFICATE_CONTRACT=0xYourContractAddress
```

In `src/lib/mockChain.ts`:
```typescript
export const CONTRACT_ADDRESS = '0xYourContractAddress';
```

### Step 3: Implement Contract Calls

Update `src/lib/chain.ts` with real wagmi contract calls. The TODO comments guide you through each function.

### Step 4: Add IPFS Storage

Update `src/lib/ipfs.ts` to use a real pinning service:
- [Pinata](https://pinata.cloud) - Easy to use
- [Web3.Storage](https://web3.storage) - Free tier
- [NFT.Storage](https://nft.storage) - Built for NFTs

### Step 5: Test on Base Sepolia

1. Switch `.env.local` to Base Sepolia contract
2. Get testnet ETH from [faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
3. Test all flows:
   - Issue certificate → Check transaction on BaseScan
   - Accept certificate → Verify on-chain status
   - View public page → Confirm data matches blockchain

### Step 6: Deploy to Base Mainnet

Once tested:
1. Deploy contract to Base Mainnet
2. Update contract address
3. Test with small amount of real ETH
4. Launch! 🚀

## Troubleshooting

### "Wrong Network" Error
- Click "Switch to Base" button
- Or manually switch to Base (Chain ID: 8453) or Base Sepolia (84532) in your wallet

### Wallet Won't Connect
- Check WalletConnect Project ID is set
- Try different wallet (MetaMask, Coinbase Wallet)
- Clear browser cache

### No Mock Certificates Showing
- The test wallet address is `0x1234567890123456789012345678901234567890`
- Connect with a different address to see issued certificates

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Project Structure

```
proofs/
├── src/
│   ├── components/        # UI components
│   │   ├── ui/           # shadcn components
│   │   ├── CertificateCard.tsx
│   │   ├── Navigation.tsx
│   │   └── ...
│   ├── pages/            # Route pages
│   │   ├── Home.tsx      # Main certificates page
│   │   ├── CertificateDetail.tsx
│   │   └── IssueCertificate.tsx
│   ├── lib/              # Utilities
│   │   ├── wagmi.ts      # Web3 config
│   │   ├── mockChain.ts  # Mock data
│   │   ├── chain.ts      # Real contract calls (TODO)
│   │   └── ipfs.ts       # IPFS helpers (TODO)
│   ├── store/            # Zustand state
│   └── types/            # TypeScript types
├── contracts/            # Contract ABI
└── .env.local           # Your config (DO NOT COMMIT)
```

## Next Steps

- ✅ You're running in mock mode - perfect for demos!
- 📝 Customize the design in `src/index.css`
- 🎨 Add your branding to Navigation component
- 🔗 Deploy contract when ready for production
- 📊 Consider adding analytics

## Resources

- [Base Documentation](https://docs.base.org)
- [wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://rainbowkit.com)
- [Lovable Documentation](https://docs.lovable.dev)

---

Built with Lovable ❤️
