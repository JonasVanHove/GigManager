import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import locale files
import en from '../locales/en.json';
import nl from '../locales/nl.json';

const resources = {
  en: { translation: en },
  nl: { translation: nl },
};

let initialized = false;

export function initI18n() {
  if (initialized) return i18n;
  
  i18n
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'nl', // Default to Dutch as fallback
      lng: 'nl', // Default language
      
      interpolation: {
        escapeValue: false, // React already escapes
      },
    });
  
  initialized = true;
  return i18n;
}

// Initialize immediately for server-side usage
initI18n();

// Export a function to change language that syncs with SettingsProvider
export function changeLanguage(language: 'en' | 'nl' | 'system') {
  const targetLang = language === 'system' ? 'nl' : language; // Default to nl for system
  i18n.changeLanguage(targetLang);
}

export default i18n;
