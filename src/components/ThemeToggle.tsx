'use client';

import { useTheme } from '@/context/ThemeContext';

/**
 * Sun / Moon toggle using Lineicons (outlined).
 * Add this to the Sidebar and MobileNav.
 *
 * CDN link (add to layout.tsx <head>):
 * <link href="https://cdn.lineicons.com/5.0/lineicons.css" rel="stylesheet" />
 */
export default function ThemeToggle() {
  const { theme, toggleTheme, colors } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 10000,
        border: `1px solid ${colors.borderLight}`,
        background: 'transparent',
        cursor: 'pointer',
        color: colors.text,
        fontSize: 18,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = colors.bgHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {theme === 'dark' ? (
        // Sun icon — switch to light
        <i className="lni lni-sun" />
      ) : (
        // Moon icon — switch to dark
        <i className="lni lni-night" />
      )}
    </button>
  );
}
