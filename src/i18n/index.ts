import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import ru from "./locales/ru.json";
import pt from "./locales/pt.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";
import it from "./locales/it.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Locale codes used for Intl date/time formatting. */
export const DATE_LOCALES: Record<SupportedLanguage, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-BR",
  ru: "ru-RU",
  ja: "ja-JP",
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      es: { translation: es },
      ru: { translation: ru },
      pt: { translation: pt },
      fr: { translation: fr },
      ja: { translation: ja },
      it: { translation: it },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "eisenmate_language",
    },
  });

// Keep <html lang> in sync with the active language
const updateHtmlLang = (lng: string) => {
  document.documentElement.lang = lng;
};
updateHtmlLang(i18n.language);
i18n.on("languageChanged", updateHtmlLang);

export default i18n;
