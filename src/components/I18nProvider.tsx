"use client";

import { useEffect } from 'react';
import { useSettings } from './SettingsProvider';
import { changeLanguage, initI18n } from '@/lib/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useSettings();

  useEffect(() => {
    // Initialize i18n on client side
    initI18n();
    // Sync i18n language with settings language
    changeLanguage(language);
  }, [language]);

  return <>{children}</>;
}
