// Authentication state management
'use client';

import { create } from 'zustand';
import { ConnectedWallet, mockConnectedWallets } from './mockWalletData';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  connectedWallets: ConnectedWallet[];
  createdAt: string;
  level: number;
  xp: number;
  totalEarnings: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: (user) => set({ isAuthenticated: true, user }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));

// Mock user data for demonstration
export const mockUser: User = {
  id: 'user_123',
  username: 'GameMaster2024',
  email: 'gamer@example.com',
  avatar: null,
  connectedWallets: mockConnectedWallets,
  createdAt: '2024-01-15T10:30:00Z',
  level: 12,
  xp: 2450,
  totalEarnings: '1,250 MYTH'
};