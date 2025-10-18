import { useAccount, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shield, AlertCircle } from 'lucide-react';
import { base, baseSepolia } from 'wagmi/chains';
import logoSmall from "../../public/logo-small.png";
import { useSwitchChain } from 'wagmi';
import { BubbleBackground } from "@/components/animate-ui/components/backgrounds/bubble";

const SUPPORTED_CHAINS = [8453, 84532] as const;

interface WalletGuardProps {
  children: React.ReactNode;
}

export function WalletGuard({ children }: WalletGuardProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <BubbleBackground color="#c7395c" >
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center gradient-mesh">
        <Card className="max-w-md w-full p-8 glass-card text-center space-y-6">
          <div className="flex items-center justify-center">
            <img src={logoSmall} alt="Logo" className="h-20 w-20 rounded-lg" />
          </div>
          
          <div>
            
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#c7395c] to-[#a9667e] bg-clip-text text-transparent">
              Welcome to Ledgerd
            </h1>
            <p className="text-muted-foreground">
              Connect your wallet to view and manage your on-chain certificates
            </p>
          </div>


          <div className="flex justify-center">
            <ConnectButton />
          </div>


          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Powered by Base • Secured by blockchain
            </p>
          </div>
        </Card>
      </div>
      </BubbleBackground>
    );
  }

  if (!SUPPORTED_CHAINS.includes(chainId as 8453 | 84532)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center gradient-mesh">
        <Card className="max-w-md w-full p-8 glass-card text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-destructive/20 mx-auto flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Wrong Network</h2>
            <p className="text-muted-foreground">
              Please switch to Base or Base Sepolia to continue
            </p>
          </div>

          <Button 
            onClick={() => switchChain?.({ chainId: 8453 })}
            className="w-full"
          >
            Switch to Base
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
