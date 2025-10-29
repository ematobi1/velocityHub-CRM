import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Verify token is still valid
      authAPI
        .getMe()
        .then((response) => {
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        })
        .catch(() => {
          // Token invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      toast.success(`Welcome back, ${user.name}!`);
      return { success: true };
    } catch (error) {
      toast.error(error.error || 'Login failed');
      return { success: false, error: error.error };
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      const { token, user } = response;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      toast.success(`Welcome to VelocityHub, ${user.name}!`);
      return { success: true };
    } catch (error) {
      toast.error(error.error || 'Registration failed');
      return { success: false, error: error.error };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
