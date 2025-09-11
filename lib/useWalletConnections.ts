'use client';

import { useState, useCallback } from 'react';
import { ConnectedWallet, mockConnectedWallets, availableWallets } from './mockWalletData';

export function useWalletConnections() {
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>(mockConnectedWallets);

  const connectWallet = useCallback(async (walletId: string): Promise<ConnectedWallet> => {
    const walletInfo = availableWallets.find(w => w.id === walletId);
    if (!walletInfo) {
      throw new Error('Wallet not found');
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newWallet: ConnectedWallet = {
      id: walletId,
      name: walletInfo.name,
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      type: walletInfo.type,
      chainId: walletId === 'metamask' ? 1 : undefined,
      isConnected: true,
      icon: walletInfo.icon,
      balance: {
        eth: (Math.random() * 0.5).toFixed(3),
        usd: (Math.random() * 1000).toFixed(2)
      }
    };

    setConnectedWallets(prev => {
      const existing = prev.find(w => w.id === walletId);
      if (existing) {
        // Update existing wallet to connected state
        return prev.map(w => w.id === walletId ? { ...w, isConnected: true } : w);
      }
      // Add new connected wallet
      return [...prev, newWallet];
    });

    return newWallet;
  }, []);

  const disconnectWallet = useCallback(async (walletId: string): Promise<void> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    setConnectedWallets(prev => 
      prev.map(w => w.id === walletId ? { ...w, isConnected: false } : w)
    );
  }, []);

  const getConnectedWallet = useCallback((walletId: string): ConnectedWallet | undefined => {
    return connectedWallets.find(w => w.id === walletId && w.isConnected);
  }, [connectedWallets]);

  const isWalletConnected = useCallback((walletId: string): boolean => {
    return connectedWallets.some(w => w.id === walletId && w.isConnected);
  }, [connectedWallets]);

  const formatWalletAddress = useCallback((address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  return {
    connectedWallets,
    connectWallet,
    disconnectWallet,
    getConnectedWallet,
    isWalletConnected,
    formatWalletAddress
  };
}

// Engineer replacement strategy:
// 1. Replace this hook with real Privy hooks
// 2. connectWallet becomes real Privy wallet connection
// 3. getConnectedWallet reads from Privy state
// 4. Component interfaces stay identical
// 5. No component changes needed