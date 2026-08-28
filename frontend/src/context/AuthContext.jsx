import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('eswama_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('eswama_token');
    if (token && user) {
      connectSocket(token);
    }
    setLoading(false);
    return () => disconnectSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('eswama_token', data.token);
    localStorage.setItem('eswama_user', JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.token);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('eswama_token', data.token);
    localStorage.setItem('eswama_user', JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.token);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('eswama_token');
    localStorage.removeItem('eswama_user');
    disconnectSocket();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
