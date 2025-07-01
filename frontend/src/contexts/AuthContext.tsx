import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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
  setup2FA: () => Promise<{ qrCodeUrl: string; secret: string }>;
  confirm2FA: (token: string) => Promise<void>;
  disable2FA: (password: string) => Promise<void>;
  generateBackupCodes: () => Promise<string[]>;
  logout: () => void;
  setTemp2FAEmail: (email: string) => void;
}

// Creăm contextul
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook pentru a utiliza contextul
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth trebuie utilizat în interiorul unui AuthProvider');
  }
  return context;
};

// Provider pentru context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [needs2FAVerification, setNeeds2FAVerification] = useState<boolean>(false);
  const [tempEmail, setTempEmail] = useState<string | null>(null);

  // URL de bază API
  const API_URL = 'http://localhost:3000/api'; // ajustează portul după nevoie

  // Configurare axios cu token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Verificare token la încărcare
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Aici putem adăuga un endpoint de verificare token dacă există
        // Pentru acum, setăm doar loading la false
        setLoading(false);
      } catch (error) {
        console.error('Error verifying token:', error);
        localStorage.removeItem('token');
        setToken(null);
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // Funcție pentru setarea emailului temporar pentru verificare 2FA
  const setTemp2FAEmail = (email: string) => {
    setTempEmail(email);
    setNeeds2FAVerification(true);
  };

  // Funcție pentru login
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      // Verificăm dacă utilizatorul are 2FA activat
      if (response.data.needs2FAVerification) {
        setTemp2FAEmail(email);
        setNeeds2FAVerification(true);
        setLoading(false);
        return;
      }

      // Dacă nu are 2FA sau a trecut deja de verificare
      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      setUser({
        id: response.data.id,
        email: response.data.email,
        is2FAEnabled: response.data.is2FAEnabled || false
      });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru înregistrare
  const signup = async (email: string, name: string, password: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/signup`, { email, name, password });
      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      setUser({
        id: response.data.id,
        email,
        name,
        is2FAEnabled: false
      });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during signup');
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
    try {
      const response = await axios.post(`${API_URL}/auth/login/2fa-verify`, {
        email: tempEmail,
        token
      });

      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      setNeeds2FAVerification(false);
      setTempEmail(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru setare inițială 2FA
  const setup2FA = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/2fa/setup`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to setup 2FA');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru confirmare cod 2FA la setup
  const confirm2FA = async (token: string) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/2fa/verify`, { token });
      
      // Actualizăm starea user să reflecte activarea 2FA
      setUser(prev => prev ? {...prev, is2FAEnabled: true} : null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify 2FA code');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru dezactivare 2FA
  const disable2FA = async (password: string) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/2fa/disable`, { password });
      
      // Actualizăm starea user să reflecte dezactivarea 2FA
      setUser(prev => prev ? {...prev, is2FAEnabled: false} : null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru generare coduri de backup
  const generateBackupCodes = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/2fa/generate-backup-codes`);
      return response.data.backupCodes;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate backup codes');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru logout
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Valoarea pentru context
  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    needs2FAVerification,
    tempEmail,
    login,
    signup,
    verify2FA,
    setup2FA,
    confirm2FA,
    disable2FA,
    setToken,
    generateBackupCodes,
    logout,
    setTemp2FAEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};