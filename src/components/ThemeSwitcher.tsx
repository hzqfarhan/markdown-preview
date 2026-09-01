'use client';

import { useEffect, useState } from 'react';

const THEMES = [
  { id: 'crayon', label: '🖍️ Crayon' },
  { id: 'github', label: '📄 GitHub' },
  { id: 'sepia', label: '📜 Sepia' },
] as const;

interface ThemeSwitcherProps {
  value: string;
  onChange: (theme: string) => void;
}

export default function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  return (
    <div className="theme-switcher" role="radiogroup" aria-label="Preview theme">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          className={`theme-pill ${value === theme.id ? 'active' : ''}`}
          onClick={() => onChange(theme.id)}
          role="radio"
          aria-checked={value === theme.id}
          title={`Switch to ${theme.label} theme`}
        >
          {theme.label}
        </button>
      ))}
    </div>
  );
}
