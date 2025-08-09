import React, { createContext, useState, useEffect, useContext } from 'react';
import { tokenManager, authenticatedFetch } from '../utils/tokenManager';

// Definim tipul pentru datele utilizatorului
interface User {
  id: string;
  email: string;
  name?: string;
  is2FAEnabled: boolean;
}

// Definim tipul pentru contextul de autentificare
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  needs2FAVerification: boolean;
  tempEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
  verify2FA: (token: string) => Promise<void>;
  setup2FA: () => Promise<{ qrCode: string; secret: string }>;
  confirm2FA: (token: string) => Promise<void>;
  disable2FA: (password: string) => Promise<void>;
  generateBackupCodes: () => Promise<string[]>;
  logout: () => void;
  setTemp2FAEmail: (email: string) => void;
  refreshUserData: () => Promise<void>;
}

// Creăm contextul
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook pentru a utiliza contextul
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider pentru context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(tokenManager.getAccessToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [needs2FAVerification, setNeeds2FAVerification] = useState<boolean>(false);
  const [tempEmail, setTempEmail] = useState<string | null>(null);

  // URL de bază API
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Verificare token la încărcare
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = tokenManager.getAccessToken();
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        // Verifică dacă token-ul este valid prin încercarea unui request
        const response = await authenticatedFetch(`${API_URL}/user/profile`);
        if (response.ok) {
          const userData = await response.json();
          
          // Transform _id to id for compatibility - SAME AS refreshUserData
          const transformedUser = {
            ...userData,
            id: userData._id || userData.id
          };
          
          console.log('🔍 AuthContext initializeAuth:', {
            originalData: userData,
            transformedUser: transformedUser,
            id: transformedUser.id,
            _id: userData._id
          });
          
          setUser(transformedUser);
          setToken(accessToken);
        } else {
          // Token invalid sau expirat
          tokenManager.clearTokens();
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        tokenManager.clearTokens();
        setToken(null);
        setUser(null);
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, [API_URL]);

  // Funcție pentru setarea emailului temporar pentru verificare 2FA
  const setTemp2FAEmail = (email: string) => {
    setTempEmail(email);
    setNeeds2FAVerification(true);
  };

  // Funcție pentru login
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Verificăm dacă utilizatorul are 2FA activat
      if (data.require2FA) {
        setTemp2FAEmail(email);
        setNeeds2FAVerification(true);
        setLoading(false);
        return;
      }

      // Dacă nu are 2FA sau a trecut deja de verificare
      if (data.accessToken && data.refreshToken) {
        tokenManager.setTokens(data.accessToken, data.refreshToken);
        setToken(data.accessToken);
        
        // Transform _id to id for compatibility
        const transformedUser = {
          ...data.user,
          id: data.user._id || data.user.id
        };
        setUser(transformedUser);
      }
      
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru înregistrare
  const signup = async (email: string, name: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Signup-ul returnează un token temporar pentru setup 2FA
      if (data.require2FASetup && data.tempToken) {
        setTemp2FAEmail(email);
        setNeeds2FAVerification(true);
        // Setăm token-ul temporar
        tokenManager.setTokens(data.tempToken, '');
        setToken(data.tempToken);
      }
      
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during signup');
      }
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru verificare cod 2FA la login
  const verify2FA = async (token: string) => {
    if (!tempEmail) {
      setError('No email provided for 2FA verification');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid 2FA code');
      }

      // După verificarea 2FA, primim tokens complete
      if (data.accessToken && data.refreshToken) {
        tokenManager.setTokens(data.accessToken, data.refreshToken);
        setToken(data.accessToken);
        
        // Transform _id to id for compatibility
        const transformedUser = {
          ...data.user,
          id: data.user._id || data.user.id
        };
        setUser(transformedUser);
        setNeeds2FAVerification(false);
        setTempEmail(null);
      }
      
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid 2FA code');
      }
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru setare inițială 2FA
  const setup2FA = async (): Promise<{ qrCode: string; secret: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authenticatedFetch(`${API_URL}/auth/2fa/setup`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to setup 2FA');
      }

      const data = await response.json();
      return { qrCode: data.qrCode, secret: data.secret };
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to setup 2FA');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru confirmare cod 2FA la setup
  const confirm2FA = async (token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authenticatedFetch(`${API_URL}/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify 2FA code');
      }

      const data = await response.json();
      
      // Actualizăm starea user și tokens după confirmarea 2FA
      if (data.accessToken && data.refreshToken) {
        tokenManager.setTokens(data.accessToken, data.refreshToken);
        setToken(data.accessToken);
        
        // Transform _id to id for compatibility
        const transformedUser = {
          ...data.user,
          id: data.user._id || data.user.id
        };
        setUser(transformedUser);
      } else {
        // Dacă nu primim tokens noi, actualizăm doar user-ul
        setUser(prev => prev ? {...prev, is2FAEnabled: true} : null);
      }
      
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to verify 2FA code');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru dezactivare 2FA
  const disable2FA = async (password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authenticatedFetch(`${API_URL}/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to disable 2FA');
      }
      
      // Actualizăm starea user să reflecte dezactivarea 2FA
      setUser(prev => prev ? {...prev, is2FAEnabled: false} : null);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to disable 2FA');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru generare coduri de backup
  const generateBackupCodes = async (): Promise<string[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authenticatedFetch(`${API_URL}/auth/2fa/generate-backup-codes`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate backup codes');
      }

      const data = await response.json();
      return data.backupCodes;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate backup codes');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru logout
  const logout = async () => {
    try {
      await tokenManager.logout();
    } catch (error) {
      console.warn('Logout error:', error);
    }
    setToken(null);
    setUser(null);
    setNeeds2FAVerification(false);
    setTempEmail(null);
    setError(null);
  };

  // Funcție pentru actualizarea datelor utilizatorului
  const refreshUserData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authenticatedFetch(`${API_URL}/user/profile`);

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      
      // Transform _id to id for compatibility
      const transformedUser = {
        ...data,
        id: data._id || data.id
      };
      
      console.log('🔍 AuthContext refreshUserData:', {
        originalData: data,
        transformedUser: transformedUser,
        id: transformedUser.id,
        _id: data._id
      });
      
      setUser(transformedUser);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch user data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Valoarea pentru context
  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token && !!user,
    needs2FAVerification,
    tempEmail,
    login,
    signup,
    verify2FA,
    setup2FA,
    confirm2FA,
    disable2FA,
    generateBackupCodes,
    logout,
    setTemp2FAEmail,
    refreshUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};