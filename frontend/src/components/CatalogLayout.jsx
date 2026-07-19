import { Link, NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Z_INDEX_STICKY } from '../lib/constants';
import BrandLogo from './BrandLogo';

const navLinkClass = ({ isActive }) =>
  `catalog-nav-link${isActive ? ' catalog-nav-link--active' : ''}`;

export default function CatalogLayout({ children }) {
  return (
    <div
      className="catalog-shell min-h-screen flex flex-col relative"
      dir="rtl"
      style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
    >
      <div className="catalog-ambient" aria-hidden="true" />

      <header className="catalog-topbar" style={{ zIndex: Z_INDEX_STICKY }}>
        <div className="catalog-topbar-inner">
          <Link to="/" className="catalog-brand-link flex items-center gap-2.5 min-w-0">
            <BrandLogo height={32} className="catalog-logo-img shrink-0">
              <div className="catalog-logo-mark shrink-0" aria-hidden="true">
                S
              </div>
            </BrandLogo>
            <div className="min-w-0">
              <h1 className="catalog-brand-title truncate">اسپاگتی پرینت</h1>
              <p className="catalog-brand-sub truncate">Spaghetti · کاتالوگ</p>
            </div>
          </Link>

          <nav className="catalog-nav" aria-label="منوی عمومی">
            <NavLink to="/" end className={navLinkClass}>
              کاتالوگ
            </NavLink>
            <NavLink to="/how-to-order" className={navLinkClass}>
              نحوه سفارش
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              تماس
            </NavLink>
          </nav>

          <div className="catalog-topbar-actions">
            <Link
              to="/login"
              className="catalog-admin-link inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium"
            >
              <Shield size={14} />
              <span className="hidden sm:inline">ورود ادمین</span>
              <span className="sm:hidden">ورود</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {children}
      </main>

      <footer
        className="relative border-t py-7"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-center sm:text-right">
            <span className="opacity-90">© Spaghetti · اسپاگتی پرینت</span>
            <span className="mx-2 opacity-40">·</span>
            <span>کاتالوگ محصولات چاپ سه‌بعدی</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-3" aria-label="پاورقی">
            <Link to="/" className="catalog-footer-link">
              کاتالوگ
            </Link>
            <Link to="/how-to-order" className="catalog-footer-link">
              نحوه سفارش
            </Link>
            <Link to="/contact" className="catalog-footer-link">
              تماس با ما
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
