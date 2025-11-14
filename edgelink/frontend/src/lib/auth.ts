/**
 * JWT Authentication Utility
 * Replaces Clerk authentication with JWT-based auth
 */

'use client';

import { useState, useEffect } from 'react';

export interface User {
  user_id: string;
  email: string;
  plan: 'free' | 'pro';
}

export function useAuth() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check localStorage on mount and when it changes
    const checkAuth = () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');

      setIsSignedIn(!!token);

      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setIsLoaded(true);
    };

    checkAuth();

    // Listen for storage changes (e.g., login in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'user') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Custom event for same-tab login/logout
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('authChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  const getToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  };

  return {
    isLoaded,
    isSignedIn,
    getToken,
    user,
  };
}

// Helper to trigger auth state update
export function triggerAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('authChange'));
  }
}
