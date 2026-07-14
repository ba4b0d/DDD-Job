import { getSettings } from './api';

/**
 * Fetches settings from backend and applies favicon/logo dynamically.
 * Safe to call on app startup; non-blocking.
 */
export async function applyDynamicBranding() {
  try {
    const res = await getSettings();
    const settings = res.data || {};
    const faviconUrl = settings.favicon_url?.string_value;
    const logoUrl = settings.logo_url?.string_value;

    if (faviconUrl) {
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }

    if (logoUrl) {
      window.__APP_LOGO_URL = logoUrl;
    }
  } catch (err) {
    // Suppress expected errors: aborted (page refresh), network failure on cold start
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.message === 'Request aborted') {
      return;
    }
    console.debug('Branding not available:', err.message);
  }
}

export function getAppLogoUrl() {
  return window.__APP_LOGO_URL || null;
}