import { useState, useEffect, useRef } from 'react';

/**
 * BrandLogo — renders the uploaded logo URL from window.__APP_LOGO_URL,
 * or falls back to provided children (e.g., text + icon).
 *
 * Polls every 5s (not 1s) to detect logo uploads made after app start.
 * Uses a ref to avoid re-creating the interval on every URL change.
 */
export default function BrandLogo({ children, height = 32, className = '', width }) {
  const [logoUrl, setLogoUrl] = useState(window.__APP_LOGO_URL || null);
  const box = width ?? height;
  const urlRef = useRef(logoUrl);

  useEffect(() => {
    // Poll for updates (uploaded after app start)
    const interval = setInterval(() => {
      const url = window.__APP_LOGO_URL || null;
      if (url !== urlRef.current) {
        urlRef.current = url;
        setLogoUrl(url);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []); // Empty deps — interval is stable, ref tracks current URL

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
