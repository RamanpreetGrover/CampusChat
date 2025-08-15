// src/theme/ThemeContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@campuschat_theme'; // saves user choice

// simple palettes for light/dark
const lightPalette = {
  mode: 'light',
  bg: '#FFFFFF',
  card: '#F6F7F9',
  text: '#0F1419',
  subText: '#566370',
  primary: '#2563EB',
  inputBg: '#F2F3F5',
  border: '#E5E7EB',
};

const darkPalette = {
  mode: 'dark',
  bg: '#0B0F14',
  card: '#121821',
  text: '#E8EDF2',
  subText: '#9AA6B2',
  primary: '#60A5FA',
  inputBg: '#1A2230',
  border: '#233042',
};

// Context holds palette + helpers
const ThemeContext = createContext({
  theme: lightPalette,
  // 'system' respects device appearance, otherwise 'light' or 'dark'
  preference: 'system',
  setPreference: (_p) => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const system = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

  const [preference, setPreference] = useState('system'); // 'system' | 'light' | 'dark'
  const [systemMode, setSystemMode] = useState(system);

  // load saved choice on first mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setPreference(saved);
      } catch {}
    })();
  }, []);

  // react to device theme changes when using 'system'
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  // persist user choice
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  }, [preference]);

  // pick final mode -> palette
  const mode = preference === 'system' ? systemMode : preference;
  const theme = mode === 'dark' ? darkPalette : lightPalette;

  const toggleTheme = () => {
    // quick switch between light/dark; ignores 'system'
    setPreference((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      // if currently following system, flip to the opposite of current system
      return systemMode === 'dark' ? 'light' : 'dark';
    });
  };

  const value = useMemo(
    () => ({ theme, preference, setPreference, toggleTheme }),
    [theme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// hook for easy access
export const useTheme = () => useContext(ThemeContext);
