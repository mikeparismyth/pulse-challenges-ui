'use client';

import { useState, useCallback } from 'react';
import { ConnectedWallet, availableWallets, getConnectedWalletsForSigninMethod } from './mockWalletData';
import { useAuth } from './auth';

export function useWalletConnections() {
  const { user, signinMethod } = useAuth(); // NEW: Get auth state
  
  // Dynamic connected wallets based on signin method
  const getConnectedWallets = useCallback(() => {
    const method = signinMethod || user?.signinMethod || 'email';
    return getConnectedWalletsForSigninMethod(method);
  }, [signinMethod, user?.signinMethod]);

  const [additionalWallets, setAdditionalWallets] = useState<ConnectedWallet[]>([]);

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

    // Add to additional connected wallets (runtime connections)
    setAdditionalWallets(prev => {
      const existing = prev.find(w => w.id === walletId);
      if (existing) {
        return prev.map(w => w.id === walletId ? { ...w, isConnected: true } : w);
      }
      return [...prev, newWallet];
    });

    return newWallet;
  }, []);

  const disconnectWallet = useCallback(async (walletId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setAdditionalWallets(prev => 
      prev.map(w => w.id === walletId ? { ...w, isConnected: false } : w)
    );
  }, []);

  const getConnectedWallet = useCallback((walletId: string): ConnectedWallet | undefined => {
    // Check both default wallets (from signin) and additionally connected wallets
    const defaultWallets = getConnectedWallets();
    const defaultWallet = defaultWallets.find(w => w.id === walletId && w.isConnected);
    if (defaultWallet) return defaultWallet;

    // Check additional runtime connections
    return additionalWallets.find(w => w.id === walletId && w.isConnected);
  }, [getConnectedWallets, additionalWallets]);

  const isWalletConnected = useCallback((walletId: string): boolean => {
    return !!getConnectedWallet(walletId);
  }, [getConnectedWallet]);

  const formatWalletAddress = useCallback((address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const getAllConnectedWallets = useCallback((): ConnectedWallet[] => {
    const defaultWallets = getConnectedWallets();
    const additionalConnected = additionalWallets.filter(w => w.isConnected);
    
    // Merge and deduplicate
    const allWallets = [...defaultWallets];
    additionalConnected.forEach(wallet => {
      if (!allWallets.find(w => w.id === wallet.id)) {
        allWallets.push(wallet);
      }
    });
    
    return allWallets;
  }, [getConnectedWallets, additionalWallets]);

  return {
    connectedWallets: getAllConnectedWallets(),
    connectWallet,
    disconnectWallet,
    getConnectedWallet,
    isWalletConnected,
    formatWalletAddress
  };
}

// Engineer replacement strategy:
// 1. Replace getConnectedWalletsForSigninMethod with Privy user.linkedAccounts
// 2. Replace connectWallet with real Privy wallet connection
// 3. Replace getConnectedWallet with Privy wallet state
// 4. Component interfaces stay identical - no component changes needed