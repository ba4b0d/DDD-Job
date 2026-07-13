import { useState } from 'react';
import { Sun, Moon, Menu, X, LogOut } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import Sidebar from './Sidebar';
import { Z_INDEX_STICKY, Z_INDEX_OVERLAY, Z_INDEX_SIDEBAR } from '../lib/constants';

export default function Layout({ children }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 lg:hidden transition-opacity duration-300"
          style={{ backgroundColor: 'var(--overlay-bg)', zIndex: Z_INDEX_OVERLAY }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-screen transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '250px', zIndex: Z_INDEX_SIDEBAR }}
      >
        <Sidebar onLinkClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 lg:mr-[250px] transition-all duration-300">
        {/* Header */}
        <header
          className="sticky top-0 flex items-center justify-between px-4 lg:px-6 py-2.5 border-b backdrop-blur-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 85%, transparent)',
            borderColor: 'var(--border-color)',
            zIndex: Z_INDEX_STICKY,
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg lg:hidden transition-colors hover:opacity-80"
              style={{
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-tertiary)',
              }}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
              Spaghetti
            </h1>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
            title={isDark ? 'حالت روز' : 'حالت شب'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
            title="خروج"
          >
            <LogOut size={16} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 xl:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}