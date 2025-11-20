import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app-theme';

const lightColors = {
  background: '#f5f5f5',
  card: '#ffffff',
  textPrimary: '#333333',
  textSecondary: '#666666',
  border: '#E5E7EB',
  primary: '#8B5CF6',
  primaryMuted: '#A78BFA',
};

const darkColors = {
  background: '#0B1220',
  card: '#111827',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  border: '#1F2937',
  primary: '#A78BFA',
  primaryMuted: '#8B5CF6',
};

const ThemeContext = createContext({});

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const colors = theme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') setTheme(stored);
      } catch {}
    })();
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, next); } catch {}
  };

  const value = useMemo(() => ({ theme, colors, setTheme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};


