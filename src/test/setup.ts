import "@testing-library/jest-dom/vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../i18n/locales/en.json";

// Initialize i18n for tests with English locale (synchronous, no language detector)
i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

// jsdom does not implement HTMLMediaElement — stub Audio for tests
globalThis.Audio = vi.fn().mockImplementation(function () {
  return { play: vi.fn().mockResolvedValue(undefined) };
}) as unknown as typeof Audio;

// jsdom does not implement Notification API — stub it
globalThis.Notification = vi.fn() as unknown as typeof Notification;
Object.defineProperty(globalThis.Notification, "permission", {
  get: () => "default" as NotificationPermission,
  configurable: true,
});
