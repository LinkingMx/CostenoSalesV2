import { usePage } from '@inertiajs/react';
import { __ } from '@/utils/trans';

interface TranslationProps {
  translations?: Record<string, any>;
}

/**
 * Custom hook for translations in React components
 * Integrates with Laravel's translation system via Inertia.js
 */
export function useTranslation() {
  const { props } = usePage<TranslationProps>();
  
  // Set translations on window object if available from props
  if (props.translations && typeof window !== 'undefined') {
    window.translations = props.translations;
  }

  /**
   * Translation function similar to Laravel's __() helper
   * @param key - Translation key in dot notation
   * @param replacements - Object with replacement values
   */
  const t = (key: string, replacements: Record<string, string | number> = {}) => {
    return __(key, replacements);
  };

  /**
   * Get all translations for a specific namespace
   * @param namespace - Translation namespace
   */
  const trans = (namespace: string): Record<string, string> => {
    const translations = (props.translations || window.translations || {}) as Record<string, any>;
    return translations[namespace] || {};
  };

  return {
    t,
    trans,
    translations: props.translations || window.translations || {}
  };
}