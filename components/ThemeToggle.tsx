'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';

/** Small icon button that toggles between light and dark theme, persisted via useTheme. */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-muted/50 text-foreground/90 hover:bg-muted transition-all shrink-0"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
