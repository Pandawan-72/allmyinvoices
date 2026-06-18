import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n, { SUPPORTED_LANGUAGES, LANG_STORAGE_KEY } from "@/src/i18n";

type LangState = {
  lang: string;
  setLang: (l: string) => Promise<void>;
};

const Ctx = createContext<LangState | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(i18n.language || "en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => {
      if (saved) { setLangState(saved); i18n.changeLanguage(saved); }
    });
  }, []);

  const setLang = useCallback(async (l: string) => {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, l);
    await i18n.changeLanguage(l);
    setLangState(l);
  }, []);

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
export const useLanguage = useLang;
