import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Shield, X } from 'lucide-react';
import { Z_INDEX_STICKY } from '../lib/constants';
import BrandLogo from './BrandLogo';
import { useSEO } from '../lib/seo';

const navLinkClass = ({ isActive }) =>
  `catalog-nav-link${isActive ? ' catalog-nav-link--active' : ''}`;

const drawerLinkClass = ({ isActive }) =>
  `catalog-drawer-link${isActive ? ' catalog-drawer-link--active' : ''}`;

export default function CatalogLayout({ children }) {
  useSEO({
    title: 'اسپاگتی پرینت — چاپ سه\u200cبعدی',
    description: 'چاپ سه\u200cبعدی سفارشی با بهترین کیفیت و قیمت — اسپاگتی پرینت',
  });

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className="catalog-shell min-h-screen flex flex-col relative"
      dir="rtl"
      style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
    >
      <div className="catalog-ambient" aria-hidden="true" />

      <header className="catalog-topbar" style={{ zIndex: Z_INDEX_STICKY }}>
        <div className="catalog-topbar-inner">
          <Link to="/" className="catalog-brand-link flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <BrandLogo height={85} className="catalog-logo-img shrink-0">
              <div className="catalog-logo-mark shrink-0" aria-hidden="true">
                S
              </div>
            </BrandLogo>
            <div className="min-w-0 catalog-brand-text">
              <h1 className="catalog-brand-title truncate">اسپاگتی پرینت</h1>
              <p className="catalog-brand-sub truncate">Spaghetti · کاتالوگ</p>
            </div>
          </Link>

          <nav className="catalog-nav catalog-nav--desktop" aria-label="منوی عمومی">
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
              className="catalog-admin-link catalog-admin-link--desktop inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm sm:text-base font-semibold"
            >
              <Shield size={18} />
              <span className="hidden sm:inline">ورود ادمین</span>
              <span className="sm:hidden">ورود</span>
            </Link>

            <button
              type="button"
              className="catalog-menu-btn"
              aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={menuOpen}
              aria-controls="catalog-mobile-drawer"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={22} strokeWidth={2.25} /> : <Menu size={22} strokeWidth={2.25} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`catalog-drawer-backdrop${menuOpen ? ' is-open' : ''}`}
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        id="catalog-mobile-drawer"
        className={`catalog-drawer${menuOpen ? ' is-open' : ''}`}
        aria-hidden={!menuOpen}
        aria-label="منوی موبایل"
      >
        <div className="catalog-drawer-head">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo height={48} className="catalog-drawer-logo shrink-0">
              <div className="catalog-logo-mark catalog-logo-mark--drawer shrink-0" aria-hidden="true">
                S
              </div>
            </BrandLogo>
            <div className="min-w-0">
              <p className="catalog-drawer-title truncate">اسپاگتی پرینت</p>
              <p className="catalog-drawer-sub truncate">منوی کاتالوگ</p>
            </div>
          </div>
          <button type="button" className="catalog-drawer-close" aria-label="بستن" onClick={closeMenu}>
            <X size={20} />
          </button>
        </div>

        <nav className="catalog-drawer-nav" aria-label="پیوندهای موبایل">
          <NavLink to="/" end className={drawerLinkClass} onClick={closeMenu}>
            کاتالوگ
          </NavLink>
          <NavLink to="/how-to-order" className={drawerLinkClass} onClick={closeMenu}>
            نحوه سفارش
          </NavLink>
          <NavLink to="/contact" className={drawerLinkClass} onClick={closeMenu}>
            تماس
          </NavLink>
        </nav>

        <div className="catalog-drawer-foot">
          <Link to="/login" className="catalog-drawer-admin" onClick={closeMenu}>
            <Shield size={18} />
            ورود ادمین
          </Link>
        </div>
      </aside>

      <main className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {children}
      </main>

      <footer
        className="relative border-t py-7"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-center sm:text-right">
            <span className="opacity-90">© Spaghettiprints · اسپاگتی پرینت</span>
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
            <Link to="/privacy" className="catalog-footer-link">
              حریم خصوصی
            </Link>
            <Link to="/terms" className="catalog-footer-link">
              قوانین
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
