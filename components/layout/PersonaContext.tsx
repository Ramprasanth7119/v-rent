"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type PersonaType = 'consumer' | 'agent' | 'agency' | 'investor' | 'admin';
export type LangCode = 'EN' | 'ZH' | 'MS' | 'TA';

interface PersonaContextType {
  persona: PersonaType;
  setPersona: (p: PersonaType) => void;
  isDarkMode: boolean;
  setDarkMode: (d: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  language: LangCode;
  setLanguage: (lang: LangCode) => void;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export const PersonaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persona, setPersonaState] = useState<PersonaType>('consumer');
  const [isDarkMode, setDarkMode] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [language, setLanguageState] = useState<LangCode>('EN');

  useEffect(() => {
    const savedLang = localStorage.getItem('vrent_lang') as LangCode;
    if (savedLang && ['EN', 'ZH', 'MS', 'TA'].includes(savedLang)) {
      setLanguageState(savedLang);
    }
    const savedPersona = localStorage.getItem('vrent_persona') as PersonaType;
    if (savedPersona && ['consumer', 'agent', 'agency', 'investor', 'admin'].includes(savedPersona)) {
      setPersonaState(savedPersona);
    }
  }, []);

  const setPersona = (p: PersonaType) => {
    setPersonaState(p);
    localStorage.setItem('vrent_persona', p);
  };

  const setLanguage = (lang: LangCode) => {
    setLanguageState(lang);
    localStorage.setItem('vrent_lang', lang);
  };

  // Set default dark mode based on persona or preferences
  useEffect(() => {
    // Check local storage or default to dark mode for dashboards, light for consumer
    if (persona === 'consumer') {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }
  }, [persona]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <PersonaContext.Provider value={{
      persona,
      setPersona,
      isDarkMode,
      setDarkMode,
      commandPaletteOpen,
      setCommandPaletteOpen,
      language,
      setLanguage
    }}>
      {children}
    </PersonaContext.Provider>
  );
};

export const usePersona = () => {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
};
