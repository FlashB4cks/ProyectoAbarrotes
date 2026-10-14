import React, { createContext, useContext, useState, useEffect } from 'react';
import NohemyApi, { STORAGE_KEYS } from '../api/nohemyApi';

/* ── CONTEXTO DE AUTENTICACIÓN ── */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    const token = NohemyApi.getAccessToken();
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        NohemyApi.clearTokens();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const userData = await NohemyApi.login(username, password);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    NohemyApi.clearTokens();
    setUser(null);
  };

  const updateUserState = (updatedUserData) => {
    setUser(updatedUserData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUserState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
