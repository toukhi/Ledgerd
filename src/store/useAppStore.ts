import { create } from 'zustand';
import { Certificate, Notification } from '@/types/certificate';
import { getMockCertificates, getMockPendingCertificates } from '@/lib/mockChain';

interface AppState {
  certificates: Certificate[];
  notifications: Notification[];
  useMockData: boolean;
  
  // Actions
  setCertificates: (certificates: Certificate[]) => void;
  addCertificate: (certificate: Certificate) => void;
  updateCertificate: (id: string, updates: Partial<Certificate>) => void;
  loadNotifications: (address: `0x${string}`) => void;
  markNotificationRead: (id: string) => void;
  toggleMockData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  certificates: getMockCertificates(),
  notifications: [],
  useMockData: true,

  setCertificates: (certificates) => set({ certificates }),

  addCertificate: (certificate) => 
    set((state) => ({ 
      certificates: [...state.certificates, certificate] 
    })),

  updateCertificate: (id, updates) =>
    set((state) => ({
      certificates: state.certificates.map((cert) =>
        cert.id === id ? { ...cert, ...updates } : cert
      ),
    })),

  loadNotifications: (address) => {
    const pending = getMockPendingCertificates(address);
    const notifications: Notification[] = pending.map((cert) => ({
      id: `notif-${cert.id}`,
      certificate: cert,
      read: false,
    }));
    set({ notifications });
  },

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      ),
    })),

  toggleMockData: () => set((state) => ({ useMockData: !state.useMockData })),
}));
