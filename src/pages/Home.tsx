import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CertificateCard } from '@/components/CertificateCard';
import { getMockCollectedCertificates, getMockIssuedCertificates } from '@/lib/mockChain';
import { Certificate } from '@/types/certificate';
import { WalletGuard } from '@/components/WalletGuard';
import { useAppStore } from '@/store/useAppStore';
import { Award, FileCheck } from 'lucide-react';

export default function Home() {
  const { address } = useAccount();
  const [collectedCerts, setCollectedCerts] = useState<Certificate[]>([]);
  const [issuedCerts, setIssuedCerts] = useState<Certificate[]>([]);
  const loadNotifications = useAppStore((state) => state.loadNotifications);

  useEffect(() => {
    if (address) {
      setCollectedCerts(getMockCollectedCertificates(address));
      setIssuedCerts(getMockIssuedCertificates(address));
      loadNotifications(address);
    }
  }, [address, loadNotifications]);

  return (
    <WalletGuard>
      <div className="min-h-[calc(100vh-4rem)] gradient-mesh">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Your Certificates
            </h1>
            <p className="text-muted-foreground">
              View and manage your on-chain credentials
            </p>
          </div>

          <Tabs defaultValue="collected" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="collected" className="gap-2">
                <Award className="h-4 w-4" />
                Collected
              </TabsTrigger>
              <TabsTrigger value="issued" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Issued
              </TabsTrigger>
            </TabsList>

            <TabsContent value="collected" className="space-y-4">
              {collectedCerts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                    <Award className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No collected certificates yet</h3>
                  <p className="text-muted-foreground">
                    Ask your organization to issue you a certificate
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {collectedCerts.map((cert) => (
                    <CertificateCard key={cert.id} certificate={cert} view="collected" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="issued" className="space-y-4">
              {issuedCerts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                    <FileCheck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No issued certificates yet</h3>
                  <p className="text-muted-foreground">
                    Create your first certificate to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {issuedCerts.map((cert) => (
                    <CertificateCard key={cert.id} certificate={cert} view="issued" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </WalletGuard>
  );
}
