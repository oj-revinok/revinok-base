'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof darkColors;
}

// ─── DARK THEME (existing #080808 base) ───
const darkColors = {
  bg: '#080808',
  bgSecondary: '#111111',
  bgTertiary: '#1a1a1a',
  bgHover: '#222222',
  bgCard: '#111111',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.4)',
  accent: '#BDD630',
  accentHover: '#a8c020',
  danger: '#ff4d4d',
  dangerHover: '#e04343',
  success: '#34d399',
  warning: '#fbbf24',
  inputBg: '#1a1a1a',
  inputBorder: 'rgba(255,255,255,0.12)',
  modalOverlay: 'rgba(0,0,0,0.7)',
  sidebarBg: '#080808',
  sidebarHover: 'rgba(255,255,255,0.06)',
  sidebarActive: 'rgba(189,214,48,0.12)',
  badgeBg: 'rgba(189,214,48,0.15)',
  badgeText: '#BDD630',
  shadow: '0 4px 24px rgba(0,0,0,0.5)',
  scrollbarThumb: 'rgba(255,255,255,0.15)',
  scrollbarTrack: 'transparent',
};

// ─── LIGHT THEME ───
const lightColors: typeof darkColors = {
  bg: '#f5f5f5',
  bgSecondary: '#ffffff',
  bgTertiary: '#eaeaea',
  bgHover: '#e0e0e0',
  bgCard: '#ffffff',
  border: 'rgba(0,0,0,0.1)',
  borderLight: 'rgba(0,0,0,0.06)',
  text: '#1a1a1a',
  textSecondary: 'rgba(0,0,0,0.6)',
  textMuted: 'rgba(0,0,0,0.35)',
  accent: '#8FA824',
  accentHover: '#7a9118',
  danger: '#dc2626',
  dangerHover: '#b91c1c',
  success: '#16a34a',
  warning: '#d97706',
  inputBg: '#ffffff',
  inputBorder: 'rgba(0,0,0,0.15)',
  modalOverlay: 'rgba(0,0,0,0.4)',
  sidebarBg: '#ffffff',
  sidebarHover: 'rgba(0,0,0,0.04)',
  sidebarActive: 'rgba(143,168,36,0.12)',
  badgeBg: 'rgba(143,168,36,0.12)',
  badgeText: '#6b7f1a',
  shadow: '0 4px 24px rgba(0,0,0,0.08)',
  scrollbarThumb: 'rgba(0,0,0,0.2)',
  scrollbarTrack: 'transparent',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('revinok-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, []);

  // Apply theme class + persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('revinok-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
