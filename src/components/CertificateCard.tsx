import { Certificate } from '@/types/certificate';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CertificateCardProps {
  certificate: Certificate;
  view: 'collected' | 'issued';
}

export function CertificateCard({ certificate, view }: CertificateCardProps) {
  const navigate = useNavigate();
  const { meta, status, createdAt, issuer, recipient } = certificate;

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/cert/${certificate.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleCardClick = () => {
    navigate(`/cert/${certificate.id}`);
  };

  return (
    <Card 
      className="glass-card hover:shadow-elevated transition-all duration-300 cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
    >
      {meta.image && (
        <div className="w-full h-48 overflow-hidden">
          <img 
            src={meta.image} 
            alt={meta.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 truncate">{meta.title}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {view === 'collected' ? meta.issuerName : `To: ${recipient.slice(0, 6)}...${recipient.slice(-4)}`}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {meta.category && (
          <div className="mb-3">
            <span className="inline-block px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground">
              {meta.category}
            </span>
          </div>
        )}

        {meta.skills && meta.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {meta.skills.slice(0, 3).map((skill, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {skill}
              </span>
            ))}
            {meta.skills.length > 3 && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                +{meta.skills.length - 3}
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {meta.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {format(new Date(createdAt), 'MMM d, yyyy')}
          </span>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={copyLink}
              className="h-8 gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy Link
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
