'use client';

import React, { useEffect } from 'react';
import { useAppSelector } from '@/store';
import { getLanguageDirection } from '@/lib/i18n/i18n';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useAppSelector((state) => state.ui.language);

  useEffect(() => {
    const direction = getLanguageDirection(language);
    const htmlElement = document.documentElement;
    htmlElement.lang = language;
    htmlElement.dir = direction;

    // Apply RTL-specific styles for Arabic
    if (direction === 'rtl') {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [language]);

  return <>{children}</>;
}
