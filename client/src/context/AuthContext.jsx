import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, getToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyStatus, setDailyStatus] = useState(null);
  const [showDailyModal, setShowDailyModal] = useState(false);

  const fetchProfile = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      try {
        const dStatus = await api.getDailyStatus();
        setDailyStatus(dStatus);
        if (dStatus.canClaim) {
          setShowDailyModal(true);
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const existingToken = getToken();
    if (existingToken) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (emailOrUsername, password) => {
    const data = await api.login({ emailOrUsername, password });
    setToken(data.token);
    setUser(data.user);
    fetchProfile();
    return data.user;
  };

  const register = async (username, email, password) => {
    const data = await api.register({ username, email, password });
    return data;
  };

  const verifySignupOtp = async (email, code) => {
    const data = await api.verifySignupOtp({ email, code });
    setToken(data.token);
    setUser(data.user);
    fetchProfile();
    return data.user;
  };

  const googleAuth = async (credential) => {
    const data = await api.googleAuth(credential);
    setToken(data.token);
    setUser(data.user);
    fetchProfile();
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const updateCoins = (newCoins) => {
    setUser(prev => prev ? { ...prev, coins: newCoins } : null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      const dStatus = await api.getDailyStatus();
      setDailyStatus(dStatus);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifySignupOtp,
        logout,
        updateCoins,
        refreshUser,
        dailyStatus,
        showDailyModal,
        setShowDailyModal,
        googleAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
