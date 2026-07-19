import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { applyDynamicBranding } from './lib/branding';
import './index.css';

// Apply favicon/logo from backend settings (if set) — public endpoint, no auth required
applyDynamicBranding();

// Drop stale dual-theme preference (app is single soft-dusk only)
try {
  localStorage.removeItem('3djat-theme');
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
