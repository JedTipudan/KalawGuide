import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/tokens';
import { ThemeMode } from '../types';

type ColorScheme = typeof Colors.light | typeof Colors.dark;

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorScheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = 'kalawguide_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_KEY, newMode);
  };

  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
