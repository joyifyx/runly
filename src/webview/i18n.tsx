import { createContext, useContext } from 'react';
import { Language, MessageKey, translate } from './translations';

export { translate } from './translations';

export const LanguageContext = createContext<Language>('en');

export function useTranslation() {
  const language = useContext(LanguageContext);
  return (key: MessageKey, values?: Record<string, string | number>) => translate(language, key, values);
}
