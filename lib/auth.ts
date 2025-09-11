// Authentication state management
'use client';

import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email: string;
  walletAddress: string;
  avatar?: string;
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
  id: '1',
  username: 'ProGamer2024',
  email: 'bitbo.bagz@shire.io',
  walletAddress: '0x1234...5678',
  avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100'
};