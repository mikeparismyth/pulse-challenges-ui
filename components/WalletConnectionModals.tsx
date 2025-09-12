'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Loader2, Check, Shield, Wallet, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ConnectedWallet } from '@/lib/mockWalletData';

interface WalletConnectionModalsProps {
  isOpen: boolean;
  walletType: string;
  onClose: () => void;
  onSuccess: () => void;
  onConnect?: (walletType: string) => Promise<ConnectedWallet>;
  challenge: {
    title: string;
    entryFee: string;
  };
}

export default function WalletConnectionModals({ 
  isOpen, 
  walletType, 
  onClose, 
  onSuccess,
  onConnect,
  challenge 
}: WalletConnectionModalsProps) {
  const [step, setStep] = useState<'login' | 'loading' | 'success'>('login');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging
  console.log('💳 WalletConnectionModals props:', { isOpen, walletType, challenge: challenge.title });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Resetting wallet modal state for:', walletType);
      setStep('login');
      setEmail('');
      setIsLoading(false);
    }
  }, [isOpen, walletType]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setIsLoading(true);
    setStep('loading');
    
    try {
      // Use real connection function if provided
      if (onConnect) {
        await onConnect(walletType);
      } else {
        // Fallback to simulation
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setStep('success');
      setIsLoading(false);
      
      // Auto close and show success after 1.5 seconds
      setTimeout(() => {
        onSuccess();
        toast.success('Wallet connected successfully!');
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      setStep('login');
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    handleSubmit();
  };

  const handleExternalWallet = () => {
    handleSubmit();
  };

  const renderAbstractWalletFlow = () => (
    <AnimatePresence mode="wait">
      {step === 'login' && (
        <motion.div
          key="abstract-login"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Log in to Abstract</h2>
            <p className="text-gray-400 text-sm">
              Sign in to your Abstract wallet to grant access
            </p>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={!email || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Submit
            </Button>
          </form>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors mb-4"
          >
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            Google
          </button>

          {/* Continue with wallet */}
          <button className="w-full flex items-center justify-between py-3 px-4 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors mb-6">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5" />
              Continue with a wallet
            </div>
            <span>→</span>
          </button>

          {/* Passkey link */}
          <div className="text-center">
            <button className="text-blue-400 hover:text-blue-300 text-sm">
              I have a passkey
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>Protected by</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-white rounded-sm"></div>
                <span className="font-semibold text-white">privy</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {step === 'loading' && (
        <motion.div
          key="abstract-loading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6 text-center"
        >
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Connecting to Abstract</h2>
          <p className="text-gray-400">Please wait while we establish the connection...</p>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div
          key="abstract-success"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6 text-center"
        >
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Connected to Abstract</h2>
          <p className="text-gray-400 mb-4">Wallet address: 0x1234...5678</p>
          <div className="text-sm text-gray-500">Redirecting to tournament...</div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderEmbeddedWalletFlow = () => (
    <AnimatePresence mode="wait">
      {/* Pulse wallet is always connected when signed in - no creation flow needed */}
      <motion.div
        key="embedded-info"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="p-6 text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-[#8E1EFE] to-[#30FFE6] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Pulse Wallet Ready</h2>
        <p className="text-gray-400 mb-8">
          Your Pulse wallet is already connected and ready to use
        </p>
        <Button
          onClick={() => onSuccess()}
          className="w-full bg-gradient-to-r from-[#8E1EFE] to-[#30FFE6] hover:opacity-90 text-white py-3 rounded-lg font-medium transition-opacity"
        >
          Continue
        </Button>
      </motion.div>
    </AnimatePresence>
  );

  const renderExternalWalletFlow = () => (
    <AnimatePresence mode="wait">
      {step === 'login' && (
        <motion.div
          key="external-login"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6 text-center"
        >
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-orange-600 font-bold text-sm">M</span>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Connect MetaMask</h2>
          <p className="text-gray-400 mb-8">
            Connect your MetaMask wallet to continue
          </p>
          <Button
            onClick={handleExternalWallet}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Connect MetaMask
          </Button>
        </motion.div>
      )}

      {step === 'loading' && (
        <motion.div
          key="external-loading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6 text-center"
        >
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Waiting for approval...</h2>
          <p className="text-gray-400">Please approve the connection in your MetaMask wallet</p>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div
          key="external-success"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6 text-center"
        >
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">MetaMask Connected</h2>
          <p className="text-gray-400 mb-4">Connected address: 0x5432...8765</p>
          <div className="text-sm text-gray-500">Proceeding to transaction...</div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderCoinbaseWalletFlow = () => (
    <AnimatePresence mode="wait">
      {step === 'login' && (
        <motion.div
          key="coinbase-login"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6 text-center"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">C</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Waiting for approval...</h2>
          <p className="text-gray-400">Please approve the connection in your Coinbase Wallet</p>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div
          key="coinbase-success"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-6 text-center"
      case 'coinbase':
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
        return renderWalletConnectFlow();
          <h2 className="text-xl font-semibold text-white mb-2">Coinbase Wallet Connected</h2>
          <p className="text-gray-400 mb-4">Connected address: 0x9876...5432</p>
          <div className="text-sm text-gray-500">Proceeding to tournament...</div>
      case 'walletconnect':
        return renderWalletConnectFlow();
    </AnimatePresence>
  );
      case 'card':
  const renderWalletConnectFlow = () => (
    <AnimatePresence mode="wait">
      {step === 'login' && (
          <div className="p-6 text-center">
          key="walletconnect-login"
            <p className="text-gray-400">Card payments are handled directly in the transaction flow</p>
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-white" />
            <p className="text-gray-400">This wallet connection is not yet implemented</p>
          <h2 className="text-2xl font-semibold text-white mb-2">Connect via WalletConnect</h2>
          <p className="text-gray-400 mb-8">
            Connect your mobile wallet using WalletConnect
          </p>
          <Button
            onClick={handleExternalWallet}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Connect Mobile Wallet
          </Button>
  };

    <AnimatePresence>
      {step === 'loading' && (
          key="walletconnect-loading"
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          <h2 className="text-xl font-semibold text-white mb-2">Connecting to mobile wallet...</h2>
          <p className="text-gray-400">Please approve the connection on your mobile device</p>
      {step === 'success' && (
          key="walletconnect-success"
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          <h2 className="text-xl font-semibold text-white mb-2">WalletConnect Connected</h2>
          <p className="text-gray-400 mb-4">Connected mobile wallet successfully</p>
          <div className="text-sm text-gray-500">Proceeding to tournament...</div>
    </AnimatePresence>
  );
  const renderWalletFlow = () => {
    switch (walletType) {
      case 'abstract':
        return renderAbstractWalletFlow();
      case 'pulse':
        return renderEmbeddedWalletFlow();
      case 'metamask':
        return renderExternalWalletFlow();
      case 'coinbase':
        return renderCoinbaseWalletFlow();
      case 'walletconnect':
        return renderWalletConnectFlow();
      case 'card':
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Card Payment</h2>
            <p className="text-gray-400">Card payments are handled directly in the transaction flow</p>
        );
      default:
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
            <p className="text-gray-400">This wallet connection is not yet implemented</p>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-lg z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-gaming-card overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              {step !== 'loading' && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Content */}
              {renderWalletFlow()}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}