import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ColorScheme, getThemeColors, ThemeColors, tokens } from './tokens';

interface ThemeContextValue {
  mode: ColorScheme;
  setMode: (mode: ColorScheme) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
  tokens: typeof tokens;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  setMode: () => {},
  toggleTheme: () => {},
  colors: getThemeColors('light'),
  tokens
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorScheme>('light');

  const toggleTheme = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = getThemeColors(mode);

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleTheme, colors, tokens }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
