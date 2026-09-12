import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { getStoredToken, setStoredToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('jansetu_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Initialize and verify session against GET /api/auth/me
  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await api.getMe();
      if (res.ok && res.data && res.data.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('jansetu_user', JSON.stringify(res.data.user));
        return res.data.user;
      } else {
        // Token invalid or user deleted
        setStoredToken(null);
        localStorage.removeItem('jansetu_user');
        setToken(null);
        setUser(null);
        return null;
      }
    } catch (err) {
      console.error('Failed to verify user session:', err);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = (newToken, newUser) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('jansetu_user', JSON.stringify(newUser));
    }
  };

  const logout = () => {
    setStoredToken(null);
    localStorage.removeItem('jansetu_user');
    setToken(null);
    setUser(null);
  };

  const updateUserRole = (newRole) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, role: newRole };
      localStorage.setItem('jansetu_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        updateUserRole,
        refreshUser,
        isAuthenticated: !!token && !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
