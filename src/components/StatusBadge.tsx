import { CertificateStatus } from '@/types/certificate';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: CertificateStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    PENDING: {
      variant: 'secondary' as const,
      icon: Clock,
      label: 'Pending',
    },
    ACCEPTED: {
      variant: 'default' as const,
      icon: CheckCircle2,
      label: 'Accepted',
    },
    DECLINED: {
      variant: 'destructive' as const,
      icon: XCircle,
      label: 'Declined',
    },
  };

  const config = variants[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
