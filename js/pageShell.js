import { t } from "./i18n.js";
import { loadLanguage, saveLanguage } from "./storage.js";

export function initializePageShell({ titleKey, onRender }) {
  const langButtons = [...document.querySelectorAll(".lang-button")];
  const state = {
    language: loadLanguage(),
  };

  const api = {
    get language() {
      return state.language;
    },
    t(key, params = {}) {
      return t(state.language, key, params);
    },
    async rerender() {
      applyStaticTranslations();
      if (onRender) {
        await onRender(api);
      }
    },
  };

  langButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.lang === state.language) {
        return;
      }

      state.language = button.dataset.lang;
      saveLanguage(state.language);
      await api.rerender();
    });
  });

  applyStaticTranslations();
  Promise.resolve(onRender?.(api));

  return api;

  function applyStaticTranslations() {
    document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
    document.title = api.t(titleKey);

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = api.t(node.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.placeholder = api.t(node.dataset.i18nPlaceholder);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      node.setAttribute("aria-label", api.t(node.dataset.i18nAriaLabel));
    });

    langButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.lang === state.language);
    });
  }
}
