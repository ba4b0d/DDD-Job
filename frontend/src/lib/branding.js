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
      // Expose as global for components that want to use it
      window.__APP_LOGO_URL = logoUrl;
    }
  } catch (err) {
    // Silently fail - branding is optional
    console.debug('Branding not available:', err.message);
  }
}

export function getAppLogoUrl() {
  return window.__APP_LOGO_URL || null;
}