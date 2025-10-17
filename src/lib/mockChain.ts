import { Certificate, CertificateStatus } from '@/types/certificate';

// Mock in-memory data store
let certificates: Certificate[] = [
  {
    id: '1',
    chainId: 8453,
    tokenURI: 'ipfs://QmMockHash1',
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    issuer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4' as `0x${string}`,
    recipient: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    status: 'ACCEPTED',
    meta: {
      title: 'Hackathon Participant',
      description: 'Participated in Road to START Hack 2024, building innovative solutions for the future of transportation. Developed a full-stack application using React and Solidity, implementing smart contracts on Base.',
      issuerName: 'START Hack',
      category: 'Hackathon',
      skills: ['Solidity', 'React', 'Web3', 'Smart Contracts'],
      evidenceUrls: ['https://github.com/example/project'],
      startDate: '2024-03-15',
      endDate: '2024-03-17',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    },
    createdAt: '2024-03-17T12:00:00Z',
  },
  {
    id: '2',
    chainId: 8453,
    tokenURI: 'ipfs://QmMockHash2',
    issuer: '0x9876543210987654321098765432109876543210' as `0x${string}`,
    recipient: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    status: 'PENDING',
    meta: {
      title: "Founders' Associate Intern",
      description: 'Worked as a Founders\' Associate Intern at Avelios Medical, contributing to strategic initiatives and operational excellence. Assisted in product development, market research, and stakeholder management.',
      issuerName: 'Avelios Medical',
      category: 'Internship',
      skills: ['Product Management', 'Strategy', 'Research', 'Communication'],
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800',
    },
    createdAt: '2024-04-01T10:00:00Z',
  },
  {
    id: '3',
    chainId: 8453,
    tokenURI: 'ipfs://QmMockHash3',
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    issuer: '0xabcdef1234567890abcdef1234567890abcdef12' as `0x${string}`,
    recipient: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    status: 'DECLINED',
    meta: {
      title: 'Volunteer',
      description: 'Volunteered at TUdesign Workshop, helping organize and facilitate design thinking sessions for students. Supported participants in developing user-centered solutions.',
      issuerName: 'TUdesign',
      category: 'Volunteering',
      skills: ['Design Thinking', 'Facilitation', 'Event Management'],
      startDate: '2024-02-10',
      endDate: '2024-02-12',
      image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
    },
    createdAt: '2024-02-12T16:00:00Z',
  },
];

export const getMockCertificates = (): Certificate[] => {
  return certificates;
};

export const getMockCertificateById = (id: string): Certificate | undefined => {
  return certificates.find(cert => cert.id === id);
};

export const getMockCollectedCertificates = (address: `0x${string}`): Certificate[] => {
  return certificates.filter(
    cert => cert.recipient.toLowerCase() === address.toLowerCase() && cert.status === 'ACCEPTED'
  );
};

export const getMockIssuedCertificates = (address: `0x${string}`): Certificate[] => {
  return certificates.filter(
    cert => cert.issuer.toLowerCase() === address.toLowerCase()
  );
};

export const getMockPendingCertificates = (address: `0x${string}`): Certificate[] => {
  return certificates.filter(
    cert => cert.recipient.toLowerCase() === address.toLowerCase() && cert.status === 'PENDING'
  );
};

export const acceptMockCertificate = (id: string): boolean => {
  const cert = certificates.find(c => c.id === id);
  if (cert && cert.status === 'PENDING') {
    cert.status = 'ACCEPTED';
    cert.txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    return true;
  }
  return false;
};

export const declineMockCertificate = (id: string): boolean => {
  const cert = certificates.find(c => c.id === id);
  if (cert && cert.status === 'PENDING') {
    cert.status = 'DECLINED';
    return true;
  }
  return false;
};

export const issueMockCertificate = (certificate: Omit<Certificate, 'id' | 'createdAt' | 'chainId'>): Certificate => {
  const newCert: Certificate = {
    ...certificate,
    id: String(certificates.length + 1),
    chainId: 8453,
    createdAt: new Date().toISOString(),
  };
  certificates.push(newCert);
  return newCert;
};

// Contract placeholder - TODO: Wire to real contract
export const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

export const CONTRACT_ABI = [
  {
    "inputs": [
      {"name": "recipient", "type": "address"},
      {"name": "tokenURI", "type": "string"}
    ],
    "name": "issueCertificate",
    "outputs": [{"name": "tokenId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "acceptCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "declineCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "getCertificate",
    "outputs": [
      {"name": "issuer", "type": "address"},
      {"name": "recipient", "type": "address"},
      {"name": "tokenURI", "type": "string"},
      {"name": "status", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
