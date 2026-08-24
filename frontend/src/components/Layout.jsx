import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import Sidebar from './Sidebar';
import { Z_INDEX_STICKY, Z_INDEX_OVERLAY, Z_INDEX_SIDEBAR } from '../lib/constants';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (container) =>
  Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) || []).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  );

export default function Layout({ children }) {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopSidebar, setIsDesktopSidebar] = useState(false);
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktopSidebar(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.('change', update);
    return () => mediaQuery.removeEventListener?.('change', update);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const toggleSidebar = () => {
    if (!sidebarOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : menuButtonRef.current;
    }
    setSidebarOpen((open) => !open);
  };

  useEffect(() => {
    if (!sidebarOpen) {
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const trapFocus = (event) => {
      if (event.key === 'Escape') {
        closeSidebar();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(sidebarRef.current);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!sidebarRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', trapFocus);
    requestAnimationFrame(() => {
      getFocusableElements(sidebarRef.current)[0]?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', trapFocus);
    };
  }, [sidebarOpen, closeSidebar]);

  const mobileSidebarHidden = !isDesktopSidebar && !sidebarOpen;
  const mobileSidebarModal = !isDesktopSidebar && sidebarOpen;

  return (
    <div className="flex min-h-screen" dir="rtl">
      {sidebarOpen && (
        <div
          className="fixed inset-0 lg:hidden transition-opacity duration-300"
          style={{ backgroundColor: 'var(--overlay-bg)', zIndex: Z_INDEX_OVERLAY }}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        id="admin-mobile-sidebar"
        className={`fixed top-0 right-0 h-screen transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '260px', zIndex: Z_INDEX_SIDEBAR }}
        aria-label="منوی مدیریت"
        aria-modal={mobileSidebarModal ? 'true' : undefined}
        role={mobileSidebarModal ? 'dialog' : undefined}
        inert={mobileSidebarHidden ? '' : undefined}
      >
        <Sidebar onLinkClick={closeSidebar} />
      </aside>

      <div className="flex flex-col flex-1 lg:mr-[260px] transition-all duration-300 min-w-0">
        <header
          className="app-topbar sticky top-0 flex items-center justify-between gap-3 px-4 lg:px-6 py-3"
          style={{ zIndex: Z_INDEX_STICKY }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={toggleSidebar}
              className="app-topbar-btn p-2.5 rounded-xl lg:hidden transition-colors shrink-0"
              style={{ minWidth: 40, minHeight: 40 }}
              aria-label={sidebarOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={sidebarOpen}
              aria-controls="admin-mobile-sidebar"
            >
              {sidebarOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={logout}
              className="app-topbar-btn inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={{ minHeight: 40 }}
              title="خروج"
            >
              <LogOut size={15} aria-hidden="true" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </header>

        <main
          className="flex-1 p-4 lg:p-6 xl:p-8 animate-fade-in relative"
          inert={mobileSidebarModal ? '' : undefined}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
