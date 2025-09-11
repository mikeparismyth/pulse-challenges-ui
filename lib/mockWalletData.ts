// Mock wallet data and state management for realistic wallet connections
'use client';

export interface ConnectedWallet {
  id: string;
  name: string;
  address: string;
  type: 'embedded' | 'external';
  chainId?: number;
  isConnected: boolean;
  icon?: string;
  balance?: {
    eth: string;
    usd: string;
  };
}

export const mockConnectedWallets: ConnectedWallet[] = [
  {
    id: 'pulse',
    name: 'Pulse Wallet',
    address: '0x742d35Cc6134C0532925a3b8D4C4405fAE4b38EF',
    type: 'embedded',
    isConnected: true, // Always connected for signed-in users
    icon: '⚡',
    balance: {
      eth: '0.063',
      usd: '156.42'
    }
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    address: '0x1234567890123456789012345678901234567890',
    type: 'external',
    chainId: 1,
    isConnected: true,
    icon: '🦊',
    balance: {
      eth: '0.125',
      usd: '310.25'
    }
  }
  // abstract, walletconnect, coinbase not connected by default
];

export const availableWallets = [
  {
    id: 'abstract',
    name: 'Abstract Wallet',
    description: 'Sign with Abstract',
    icon: '🛡️',
    recommended: true,
    installed: false,
    type: 'external' as const
  },
  {
    id: 'pulse',
    name: 'Pulse Wallet',
    description: 'Use Pulse Wallet',
    icon: '⚡',
    recommended: false,
    installed: true,
    default: true,
    type: 'embedded' as const
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Connect MetaMask',
    icon: '🦊',
    recommended: false,
    installed: true,
    type: 'external' as const
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'WalletConnect',
    icon: '📱',
    recommended: false,
    installed: false,
    type: 'external' as const
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    description: 'Coinbase Wallet',
    icon: '🔵',
    recommended: false,
    installed: false,
    type: 'external' as const
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Buy with Card',
    icon: '💳',
    recommended: false,
    installed: false,
    type: 'external' as const
  }
];

export const formatWalletAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getConnectedWallet = (walletId: string): ConnectedWallet | undefined => {
  return mockConnectedWallets.find(wallet => wallet.id === walletId && wallet.isConnected);
};

export const isWalletConnected = (walletId: string): boolean => {
  return mockConnectedWallets.some(wallet => wallet.id === walletId && wallet.isConnected);
};

export const getWalletInfo = (walletId: string) => {
  return availableWallets.find(wallet => wallet.id === walletId);
};

// Mock function to simulate connecting a wallet
export const connectWallet = async (walletId: string): Promise<ConnectedWallet> => {
  const walletInfo = getWalletInfo(walletId);
  if (!walletInfo) {
    throw new Error('Wallet not found');
  }

  // Simulate connection delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const newWallet: ConnectedWallet = {
    id: walletId,
    name: walletInfo.name,
    address: `0x${Math.random().toString(16).substr(2, 40)}`,
    type: walletInfo.type,
    isConnected: true,
    icon: walletInfo.icon,
    balance: {
      eth: (Math.random() * 0.5).toFixed(3),
      usd: (Math.random() * 1000).toFixed(2)
    }
  };

  // Add to connected wallets (in real app, this would update global state)
  mockConnectedWallets.push(newWallet);
  
  return newWallet;
};

// Mock function to simulate disconnecting a wallet
export const disconnectWallet = async (walletId: string): Promise<void> => {
  const index = mockConnectedWallets.findIndex(wallet => wallet.id === walletId);
  if (index > -1) {
    mockConnectedWallets.splice(index, 1);
  }
};