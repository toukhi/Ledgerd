import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getMockCertificateById } from '@/lib/mockChain';
import { Certificate } from '@/types/certificate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Copy, ExternalLink, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function CertificateDetail() {
  const { id } = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    if (id) {
      const cert = getMockCertificateById(id);
      setCertificate(cert || null);
    }
  }, [id]);

  const copyLink = () => {
    const url = `${window.location.origin}/cert/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const viewOnBaseScan = () => {
    if (certificate?.txHash) {
      window.open(`https://basescan.org/tx/${certificate.txHash}`, '_blank');
    }
  };

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Certificate not found</p>
      </div>
    );
  }

  const { meta, status, createdAt, issuer, recipient, txHash } = certificate;

  return (
    <div className="min-h-screen gradient-mesh">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Certificates
          </Button>
        </Link>

        <Card className="glass-card p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{meta.title}</h1>
              <p className="text-lg text-muted-foreground">{meta.issuerName}</p>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Certificate Image */}
          {meta.image && (
            <div className="w-full rounded-lg overflow-hidden shadow-elevated">
              <img 
                src={meta.image} 
                alt={meta.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Verification Badge */}
          {status === 'ACCEPTED' && (
            <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-medium text-success">Verified on-chain</span>
            </div>
          )}

          {status === 'PENDING' && (
            <div className="flex items-center gap-2 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <span className="font-medium text-warning">Pending acceptance</span>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Recipient</h3>
              <p className="font-mono text-sm break-all">{recipient}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Issuer</h3>
              <p className="font-mono text-sm break-all">{issuer}</p>
            </div>
            {meta.startDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Start Date</h3>
                <p>{format(new Date(meta.startDate), 'MMMM d, yyyy')}</p>
              </div>
            )}
            {meta.endDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">End Date</h3>
                <p>{format(new Date(meta.endDate), 'MMMM d, yyyy')}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Issued On</h3>
              <p>{format(new Date(createdAt), 'MMMM d, yyyy')}</p>
            </div>
            {meta.category && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Category</h3>
                <Badge variant="secondary">{meta.category}</Badge>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
            <p className="text-foreground whitespace-pre-wrap">{meta.description}</p>
          </div>

          {/* Skills */}
          {meta.skills && meta.skills.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {meta.skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Evidence URLs */}
          {meta.evidenceUrls && meta.evidenceUrls.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Evidence</h3>
              <div className="space-y-2">
                {meta.evidenceUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="truncate">{url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-border/50">
            <Button onClick={copyLink} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
            {txHash && (
              <Button onClick={viewOnBaseScan} variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View on BaseScan
              </Button>
            )}
          </div>

          {/* Demo Notice */}
          <div className="p-4 bg-muted/50 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Demo mode:</strong> This is using mock data. Wire the contract to enable real on-chain verification.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
