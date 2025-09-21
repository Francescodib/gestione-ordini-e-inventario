import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthContextType } from '../types/auth';
import { authService } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Controlla se c'è un token salvato al caricamento
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });
      
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, firstName: string, lastName: string, email: string, password: string, role: 'CLIENT' | 'ADMIN' | 'MANAGER' = 'CLIENT', addressData?: { phone?: string; streetAddress?: string; city?: string; postalCode?: string; country?: string }) => {
    try {
      setLoading(true);

      const registrationData = {
        username,
        firstName,
        lastName,
        email,
        password,
        confirmPassword: password,
        role,
        ...(addressData && {
          phone: addressData.phone || '',
          streetAddress: addressData.streetAddress || '',
          city: addressData.city || '',
          postalCode: addressData.postalCode || '',
          country: addressData.country || ''
        })
      };
      
      console.log('Sending registration data:', registrationData);
      
      const response = await authService.register(registrationData);
      
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Role-based helper functions
  const isAdmin = (): boolean => {
    return user?.role === 'ADMIN';
  };

  const isManager = (): boolean => {
    return user?.role === 'MANAGER';
  };

  const isClient = (): boolean => {
    return user?.role === 'CLIENT';
  };

  const canManageUsers = (): boolean => {
    return user?.role === 'ADMIN';
  };

  const canManageOrders = (): boolean => {
    return user?.role === 'ADMIN' || user?.role === 'MANAGER';
  };

  const canCreateClients = (): boolean => {
    return user?.role === 'ADMIN' || user?.role === 'MANAGER';
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAdmin,
    isManager,
    isClient,
    canManageUsers,
    canManageOrders,
    canCreateClients,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Default export to fix react-refresh issue
export default AuthProvider;
