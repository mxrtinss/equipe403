import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega o tema salvo ao iniciar o app
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('@theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  const setTheme = async (isDark) => {
    try {
      setIsDarkMode(isDark);
      await AsyncStorage.setItem('@theme', isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  // Definição de cores para cada tema
  const lightColors = {
    // Backgrounds
    background: '#F5F5F5',
    backgroundSecondary: '#FFFFFF',
    card: '#FFFFFF',
    
    // Textos
    text: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    
    // Primárias
    primary: '#8B5CF6',
    primaryLight: '#A78BFA',
    primaryDark: '#7C3AED',
    
    // Bordas e separadores
    border: '#E5E7EB',
    separator: '#F3F4F6',
    
    // Status
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Inputs
    inputBackground: '#FFFFFF',
    inputBorder: '#E5E7EB',
    inputPlaceholder: '#9CA3AF',
    
    // Outros
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: '#000000',
  };

  const darkColors = {
    // Backgrounds
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    card: '#1E293B',
    
    // Textos
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    
    // Primárias
    primary: '#A78BFA',
    primaryLight: '#C4B5FD',
    primaryDark: '#8B5CF6',
    
    // Bordas e separadores
    border: '#374151',
    separator: '#1F2937',
    
    // Status
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
    
    // Inputs
    inputBackground: '#1E293B',
    inputBorder: '#374151',
    inputPlaceholder: '#6B7280',
    
    // Outros
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: '#000000',
  };

  const colors = isDarkMode ? darkColors : lightColors;
  const theme = isDarkMode ? 'dark' : 'light';

  const value = {
    isDarkMode,
    theme,
    colors,
    toggleTheme,
    setTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;