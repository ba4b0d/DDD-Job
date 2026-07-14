import axios from 'axios';

/**
 * Fetches public branding settings (favicon URL, logo URL) WITHOUT auth.
 * Safe to call on app startup; won't trigger auth refresh loops.
 */
export async function applyDynamicBranding() {
  try {
    // Use a fresh axios instance to avoid main api.js interceptor (which redirects on 401)
    const res = await axios.get('/api/v1/brand');
    const settings = res.data || {};
    const faviconUrl = settings.favicon_url;
    const logoUrl = settings.logo_url;

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
    // Branding is optional — never break the app
  }
}

export function getAppLogoUrl() {
  return window.__APP_LOGO_URL || null;
}