// Translation helper utility for React components
// This integrates with Laravel's translation system via Inertia.js

interface TranslationData {
  [key: string]: string | TranslationData;
}

// Global translations object that will be passed from Laravel
declare global {
  interface Window {
    translations: TranslationData;
  }
}

/**
 * Translation function similar to Laravel's __() helper
 * @param key - Translation key in dot notation (e.g., 'auth.login', 'common.save')
 * @param replacements - Object with replacement values for placeholders
 * @returns Translated string or the key if translation not found
 */
export function __(key: string, replacements: Record<string, string | number> = {}, fallback?: string): string {
  const translations = window.translations || {};
  
  // Navigate through nested object using dot notation
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      value = value[k];
    } else {
      // Translation not found, return fallback or key
      return fallback || key;
    }
  }
  
  if (typeof value !== 'string') {
    return fallback || key;
  }
  
  // Replace placeholders in the format :placeholder
  let translatedText = value;
  Object.entries(replacements).forEach(([placeholder, replacement]) => {
    const regex = new RegExp(`:${placeholder}`, 'g');
    translatedText = translatedText.replace(regex, String(replacement));
  });
  
  return translatedText;
}

/**
 * Helper function to get translations for a specific namespace
 * @param namespace - Translation namespace (e.g., 'auth', 'common')
 * @returns Object with all translations for the namespace
 */
export function trans(namespace: string): Record<string, string> {
  const translations = window.translations || {};
  return (translations[namespace] as Record<string, string>) || {};
}