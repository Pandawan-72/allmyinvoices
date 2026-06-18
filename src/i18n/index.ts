import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FR from "./locales/fr";
import EN from "./locales/en";
import DE from "./locales/de";
import ES from "./locales/es";
import IT from "./locales/it";
import PT from "./locales/pt";
import NL from "./locales/nl";
import RU from "./locales/ru";

const LANG_KEY = "ami.language";

const resources = {
  fr: { translation: FR },
  en: { translation: EN },
  de: { translation: DE },
  es: { translation: ES },
  it: { translation: IT },
  pt: { translation: PT },
  nl: { translation: NL },
  ru: { translation: RU },
};

const deviceLang = Localization.getLocales()[0]?.languageCode || "en";
const supportedLang = Object.keys(resources).includes(deviceLang) ? deviceLang : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: supportedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

AsyncStorage.getItem(LANG_KEY).then((saved) => {
  if (saved && resources[saved as keyof typeof resources]) {
    i18n.changeLanguage(saved);
  }
});

export default i18n;
export const SUPPORTED_LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "ru", label: "Русский" },
];
export const LANG_STORAGE_KEY = LANG_KEY;
