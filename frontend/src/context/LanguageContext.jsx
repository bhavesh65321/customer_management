import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { translations, getStoredLanguage, setStoredLanguage } from "../i18n/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage);

  const setLanguage = useCallback((lang) => {
    if (lang !== "en" && lang !== "hi") return;
    setLanguageState(lang);
    setStoredLanguage(lang);
  }, []);

  const t = useCallback(
    (key) => {
      const keys = key.split(".");
      let value = translations[language];
      for (const k of keys) {
        value = value?.[k];
      }
      return value != null ? String(value) : key;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: "en",
      setLanguage: () => {},
      t: (key) => key,
    };
  }
  return ctx;
}
