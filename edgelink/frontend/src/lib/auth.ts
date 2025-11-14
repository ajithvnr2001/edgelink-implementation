/**
 * JWT Authentication Utility
 * Replaces Clerk authentication with JWT-based auth
 */

export interface User {
  user_id: string;
  email: string;
  plan: 'free' | 'pro';
}

export function useAuth() {
  const getToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  };

  const getUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  const isSignedIn = (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
  };

  return {
    isLoaded: true,
    isSignedIn: isSignedIn(),
    getToken,
    user: getUser(),
  };
}
