export type CertificateStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export type CertificateCategory = 
  | 'Internship' 
  | 'Hackathon' 
  | 'Course' 
  | 'Volunteering' 
  | 'Other';

export interface CertificateMeta {
  title: string;
  description: string;
  issuerName: string;
  category?: CertificateCategory;
  skills?: string[];
  evidenceUrls?: string[];
  usefulLinks?: string[]; // optional list of helpful URLs (event page, LinkedIn, Luma, etc.)
  attachments?: { name: string; type?: string; size: number }[]; // uploaded files metadata
  startDate?: string; // ISO
  endDate?: string;   // ISO
  image?: string;     // IPFS URL or generated data URL
}

export interface Certificate {
  id: string;                // tokenId (string for safety)
  chainId: number;           // Base
  tokenURI: string;          // IPFS uri
  txHash?: string;
  issuer: `0x${string}`;
  recipient: `0x${string}`;
  status: CertificateStatus; // PENDING until recipient accepts
  meta: CertificateMeta;
  createdAt: string;         // ISO
}

export interface Notification {
  id: string;
  certificate: Certificate;
  read: boolean;
}
