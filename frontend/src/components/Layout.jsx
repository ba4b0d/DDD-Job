import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import Sidebar from './Sidebar';
import { Z_INDEX_STICKY, Z_INDEX_OVERLAY, Z_INDEX_SIDEBAR } from '../lib/constants';

export default function Layout({ children }) {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" dir="rtl">
      {sidebarOpen && (
        <div
          className="fixed inset-0 lg:hidden transition-opacity duration-300"
          style={{ backgroundColor: 'var(--overlay-bg)', zIndex: Z_INDEX_OVERLAY }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-screen transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '260px', zIndex: Z_INDEX_SIDEBAR }}
      >
        <Sidebar onLinkClick={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex flex-col flex-1 lg:mr-[260px] transition-all duration-300 min-w-0">
        <header
          className="app-topbar sticky top-0 flex items-center justify-between gap-3 px-4 lg:px-6 py-3"
          style={{ zIndex: Z_INDEX_STICKY }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="app-topbar-btn p-2.5 rounded-xl lg:hidden transition-colors shrink-0"
              style={{ minWidth: 40, minHeight: 40 }}
              aria-label={sidebarOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
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
              <LogOut size={15} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 xl:p-8 animate-fade-in relative">
          {children}
        </main>
      </div>
    </div>
  );
}
