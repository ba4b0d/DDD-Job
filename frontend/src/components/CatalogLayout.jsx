import { Link } from 'react-router-dom';
import { Sun, Moon, Store, Shield } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { Z_INDEX_STICKY } from '../lib/constants';

export default function CatalogLayout({ children }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="min-h-screen" dir="rtl"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <header className="sticky top-0 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
          borderColor: 'var(--border-color)',
          zIndex: Z_INDEX_STICKY,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: 'var(--accent)' }}>
              <Store size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>Spaghetti</h1>
              <p className="text-[10px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>کاتالوگ محصولات</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link to="/login"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              <Shield size={13} />
              <span className="hidden sm:inline">پنل مدیریت</span>
            </Link>
            <button onClick={toggleTheme}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      <footer className="border-t py-6 text-center text-xs"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
      >
        © Spaghetti — تمامی حقوق محفوظ است
      </footer>
    </div>
  );
}