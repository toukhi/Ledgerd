import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { acceptMockCertificate, declineMockCertificate } from '@/lib/mockChain';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, FileCheck } from 'lucide-react';

export function NotificationsDrawer() {
  const notifications = useAppStore((state) => state.notifications);
  const updateCertificate = useAppStore((state) => state.updateCertificate);
  const markNotificationRead = useAppStore((state) => state.markNotificationRead);

  const handleAccept = (id: string, notifId: string) => {
    if (acceptMockCertificate(id)) {
      updateCertificate(id, { status: 'ACCEPTED' });
      markNotificationRead(notifId);
      toast.success('Certificate accepted!');
    }
  };

  const handleDecline = (id: string, notifId: string) => {
    if (declineMockCertificate(id)) {
      updateCertificate(id, { status: 'DECLINED' });
      markNotificationRead(notifId);
      toast.success('Certificate declined');
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileCheck className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No pending notifications</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {notifications.map((notification) => {
        const { certificate } = notification;
        const { meta, issuer, createdAt } = certificate;

        return (
          <Card key={notification.id} className="p-4 glass-card">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-1">{meta.title}</h4>
                <p className="text-sm text-muted-foreground">
                  From: {meta.issuerName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(createdAt), 'MMM d, yyyy')}
                </p>
              </div>

              <p className="text-sm line-clamp-2">{meta.description}</p>

              {meta.category && (
                <span className="inline-block px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground">
                  {meta.category}
                </span>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(certificate.id, notification.id)}
                  className="flex-1 gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecline(certificate.id, notification.id)}
                  className="flex-1 gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
