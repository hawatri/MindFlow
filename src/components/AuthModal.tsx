import React, { useState } from 'react';
import { X, User, LogIn, LogOut, Loader2 } from 'lucide-react';
import { signInAnonymouslyUser, signInWithGoogle, signOutUser, onAuthStateChange } from '../utils/firebase';
import type { User } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthChange: (user: User | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const unsubscribe = onAuthStateChange((user) => {
        onAuthChange(user);
        if (user) {
          setError(null);
        }
      });
      return () => unsubscribe();
    }
  }, [isOpen, onAuthChange]);

  const handleAnonymousSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInAnonymouslyUser();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in anonymously');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signOutUser();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg w-96 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5" /> Authentication
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {currentUser ? (
          <div className="space-y-4">
            <div className="bg-zinc-800 p-4 rounded-lg">
              <p className="text-sm text-zinc-400 mb-1">Signed in as</p>
              <p className="text-white font-medium truncate">
                {currentUser.displayName || currentUser.email || 'Anonymous User'}
              </p>
              {currentUser.isAnonymous && (
                <p className="text-xs text-zinc-500 mt-1">Anonymous session</p>
              )}
            </div>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium flex items-center justify-center gap-2 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing out...
                </>
              ) : (
                <>
                  <LogOut size={16} /> Sign Out
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 mb-4">
              Sign in to save and sync your flows across devices
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium flex items-center justify-center gap-2 text-gray-900"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="h-px bg-zinc-800 flex-1"></div>
              <span className="text-xs text-zinc-600">OR</span>
              <div className="h-px bg-zinc-800 flex-1"></div>
            </div>

            <button
              onClick={handleAnonymousSignIn}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium flex items-center justify-center gap-2 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} /> Continue as Guest
                </>
              )}
            </button>

            <p className="text-xs text-zinc-500 text-center mt-2">
              Guest sessions are temporary and data may be lost
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};



