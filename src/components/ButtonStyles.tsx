'use client';

/**
 * ──────────────────────────────────────────────────────────
 *  REVINOK BUTTON SYSTEM
 *  Pill-shaped, consistent across the entire portal.
 * ──────────────────────────────────────────────────────────
 *
 *  Usage:
 *    import { btnPrimary, btnSecondary, btnText, btnDanger } from '@/components/ButtonStyles';
 *
 *    <button style={btnPrimary}>Save</button>
 *    <button style={btnSecondary}>Cancel</button>
 *    <button style={btnText}>Learn more</button>
 *    <button style={btnDanger}>Delete</button>
 *
 *  For light-mode-aware versions, use the hook:
 *    const { btnPrimary, btnSecondary, ... } = useButtonStyles();
 */

import { CSSProperties } from 'react';
import { useTheme } from '@/context/ThemeContext';

// ─── BASE (shared by all buttons) ───
const btnBase: CSSProperties = {
  display: 'inline-flex',
  height: 40,
  padding: '10px 16px',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 5,
  borderRadius: 10000,
  fontFamily: 'Montserrat, sans-serif',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

// ─── STATIC STYLES (dark-mode defaults — use for quick reference) ───

export const btnPrimary: CSSProperties = {
  ...btnBase,
  border: '1px solid #BDD630',
  background: '#BDD630',
  color: '#080808',
};

export const btnSecondary: CSSProperties = {
  ...btnBase,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(0,0,0,0)',
  color: '#ffffff',
};

export const btnText: CSSProperties = {
  ...btnBase,
  padding: '10px 0',
  border: 'none',
  background: 'rgba(0,0,0,0)',
  color: '#ffffff',
};

export const btnDanger: CSSProperties = {
  ...btnBase,
  border: '1px solid #ff4d4d',
  background: '#ff4d4d',
  color: '#ffffff',
};

// ─── THEME-AWARE HOOK ───

export function useButtonStyles() {
  const { colors, theme } = useTheme();

  const primary: CSSProperties = {
    ...btnBase,
    border: `1px solid ${colors.accent}`,
    background: colors.accent,
    color: theme === 'dark' ? '#080808' : '#1a1a1a',
  };

  const secondary: CSSProperties = {
    ...btnBase,
    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}`,
    background: 'transparent',
    color: colors.text,
  };

  const text: CSSProperties = {
    ...btnBase,
    padding: '10px 0',
    border: 'none',
    background: 'transparent',
    color: colors.text,
  };

  const danger: CSSProperties = {
    ...btnBase,
    border: `1px solid ${colors.danger}`,
    background: colors.danger,
    color: '#ffffff',
  };

  const ghost: CSSProperties = {
    ...btnBase,
    border: '1px solid transparent',
    background: 'transparent',
    color: colors.textSecondary,
  };

  return {
    btnPrimary: primary,
    btnSecondary: secondary,
    btnText: text,
    btnDanger: danger,
    btnGhost: ghost,
  };
}
