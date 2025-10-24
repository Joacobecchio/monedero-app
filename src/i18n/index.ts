import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "../i18n/locales/es.json";
import en from "../i18n/locales/en.json";

// Idioma por defecto
export const DEFAULT_LANG = "es";

void i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v4",
resources: {
  es: { translation: es },
  en: { translation: en },
}
,
    lng: DEFAULT_LANG,           // lo vamos a sobreescribir con prefs
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
