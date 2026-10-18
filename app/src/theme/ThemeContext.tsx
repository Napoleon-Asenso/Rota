import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance, Platform } from 'react-native';
import { ColorScheme, getThemeColors, ThemeColors, tokens } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  mode: ColorScheme;
  isDark: boolean;
  preference: ThemePreference;
  setMode: (mode: ColorScheme) => void;
  setPreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
  tokens: typeof tokens;
}

function resolveSystemScheme(): ColorScheme {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

const initialScheme = resolveSystemScheme();

const ThemeContext = createContext<ThemeContextValue>({
  mode: initialScheme,
  isDark: initialScheme === 'dark',
  preference: 'system',
  setMode: () => {},
  setPreference: () => {},
  toggleTheme: () => {},
  colors: getThemeColors(initialScheme),
  tokens
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Listen to React Native's system color scheme hook
  const systemSchemeHook = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(resolveSystemScheme);

  // Monitor device & browser dark mode changes live
  useEffect(() => {
    // 1. Update from React Native hook if available
    if (systemSchemeHook) {
      setSystemScheme(systemSchemeHook === 'dark' ? 'dark' : 'light');
    }

    // 2. React Native Appearance change listener (works on Android / iOS / Web)
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });

    // 3. Web MediaQueryListener fallback for instant browser devtools/OS toggle
    let mql: MediaQueryList | null = null;
    let mqlListener: ((e: MediaQueryListEvent) => void) | null = null;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      mqlListener = (e: MediaQueryListEvent) => {
        setSystemScheme(e.matches ? 'dark' : 'light');
      };
      if (mql.addEventListener) {
        mql.addEventListener('change', mqlListener);
      } else {
        // Legacy Safari / older browsers
        mql.addListener(mqlListener);
      }
    }

    return () => {
      subscription?.remove?.();
      if (mql && mqlListener) {
        if (mql.removeEventListener) {
          mql.removeEventListener('change', mqlListener);
        } else {
          mql.removeListener(mqlListener);
        }
      }
    };
  }, [systemSchemeHook]);

  // Compute active mode based on preference
  const mode: ColorScheme = preference === 'system' ? systemScheme : preference;
  const isDark = mode === 'dark';

  const setMode = (newMode: ColorScheme) => {
    setPreference(newMode);
  };

  const toggleTheme = () => {
    setPreference(prev => {
      const current = prev === 'system' ? systemScheme : prev;
      return current === 'light' ? 'dark' : 'light';
    });
  };

  const colors = getThemeColors(mode);

  // Synchronize web root document element attributes for full browser accessibility
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.classList.toggle('dark', isDark);
      if (document.documentElement.style) {
        document.documentElement.style.colorScheme = mode;
        document.documentElement.style.backgroundColor = colors['background-color'];
      }
      if (document.body && document.body.style) {
        document.body.style.backgroundColor = colors['background-color'];
      }
    }
  }, [mode, isDark, colors]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        preference,
        setMode,
        setPreference,
        toggleTheme,
        colors,
        tokens
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
