import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * BrandLogo — fetches the uploaded logo URL from /api/v1/brand on mount.
 * Shows uploaded logo or falls back to children (text + icon).
 */
export default function BrandLogo({ children, height = 32, className = '', width }) {
  const [logoUrl, setLogoUrl] = useState(null);
  const box = width ?? height;

  useEffect(() => {
    // Check global first (set by applyDynamicBranding at startup)
    if (window.__APP_LOGO_URL) {
      setLogoUrl(window.__APP_LOGO_URL);
      return;
    }
    // If global not set yet, fetch it directly
    let cancelled = false;
    axios.get('/api/v1/brand').then((res) => {
      if (cancelled) return;
      const url = res.data?.logo_url;
      if (url) {
        setLogoUrl(url);
        window.__APP_LOGO_URL = url; // update global for other consumers
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Spaghetti Logo"
        className={className}
        style={{
          height,
          width: box,
          maxWidth: 'none',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    );
  }
  return children || null;
}
