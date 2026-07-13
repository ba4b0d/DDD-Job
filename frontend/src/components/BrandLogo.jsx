import { useState, useEffect } from 'react';

/**
 * BrandLogo — renders the uploaded logo URL from window.__APP_LOGO_URL,
 * or falls back to provided children (e.g., text + icon).
 */
export default function BrandLogo({ children, height = 32, className = '' }) {
  const [logoUrl, setLogoUrl] = useState(window.__APP_LOGO_URL || null);

  useEffect(() => {
    // Poll for updates (uploaded after app start)
    const interval = setInterval(() => {
      const url = window.__APP_LOGO_URL || null;
      if (url !== logoUrl) setLogoUrl(url);
    }, 1000);
    return () => clearInterval(interval);
  }, [logoUrl]);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Spaghetti Logo"
        className={className}
        style={{ height, objectFit: 'contain', maxWidth: 200 }}
      />
    );
  }
  return children || null;
}