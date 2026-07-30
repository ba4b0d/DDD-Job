import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Z_INDEX_STICKY } from '../lib/constants';
import BrandLogo from './BrandLogo';
import { useSEO } from '../lib/seo';
import { getBlogPosts, getCatalogCategories } from '../lib/api';

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
  const [blogEnabled, setBlogEnabled] = useState(false);
  const [catTree, setCatTree] = useState([]);
  const [catOpen, setCatOpen] = useState(false);
  const [hoveredCat, setHoveredCat] = useState(null);
  const catDropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    getBlogPosts()
      .then(() => setBlogEnabled(true))
      .catch(() => setBlogEnabled(false));
    getCatalogCategories()
      .then((res) => setCatTree(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

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

  // Close category dropdown on outside click
  useEffect(() => {
    if (!catOpen) return;
    const handleClick = (e) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setCatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [catOpen]);

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
            {/* Categories dropdown button */}
            <div ref={catDropdownRef} className="relative">
              <button
                type="button"
                className={`catalog-nav-link flex items-center gap-1 ${catOpen ? 'catalog-nav-link--active' : ''}`}
                onClick={() => setCatOpen((v) => !v)}
                aria-expanded={catOpen}
                aria-haspopup="true"
              >
                دسته‌بندی‌ها
                <ChevronDown size={14} className={`transition-transform ${catOpen ? 'rotate-180' : ''}`} />
              </button>

              {catOpen && catTree.length > 0 && (
                <div
                  className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border overflow-hidden animate-fade-in-scale"
                  style={{ minWidth: '280px', maxWidth: '420px', borderColor: 'var(--border-color)', zIndex: 9999 }}
                  dir="rtl"
                >
                  <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {catTree.map((cat) => (
                      <div
                        key={cat.id}
                        className="relative"
                        onMouseEnter={() => setHoveredCat(cat.id)}
                        onMouseLeave={() => setHoveredCat(null)}
                      >
                        <button
                          type="button"
                          className="w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between transition-colors hover:bg-orange-50"
                          style={{ color: 'var(--text-primary)' }}
                          onClick={() => {
                            setCatOpen(false);
                            navigate(`/?category=${cat.id}`);
                          }}
                        >
                          <span>{cat.name}</span>
                          {cat.children && cat.children.length > 0 && (
                            <ChevronDown size={14} className="rotate-[-90deg]" style={{ color: 'var(--text-muted)' }} />
                          )}
                        </button>

                        {/* Sub-categories panel */}
                        {cat.children && cat.children.length > 0 && hoveredCat === cat.id && (
                          <div
                            className="absolute top-0 right-full mr-1 bg-white rounded-xl shadow-xl border p-2 animate-fade-in-scale"
                            style={{ minWidth: '200px', borderColor: 'var(--border-color)' }}
                          >
                            {cat.children.map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                className="w-full text-right px-3 py-2 rounded-lg text-sm transition-colors hover:bg-orange-50"
                                style={{ color: 'var(--text-primary)' }}
                                onClick={() => {
                                  setCatOpen(false);
                                  navigate(`/?category=${sub.id}`);
                                }}
                              >
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <NavLink to="/" end className={navLinkClass}>
              کاتالوگ
            </NavLink>
            {blogEnabled && (
              <NavLink to="/blog" className={navLinkClass}>
                وبلاگ
              </NavLink>
            )}
            <NavLink to="/how-to-order" className={navLinkClass}>
              شیوه ثبت سفارش
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              تماس با ما
            </NavLink>
          </nav>

          <div className="catalog-topbar-actions">
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
          {blogEnabled && (
            <NavLink to="/blog" className={drawerLinkClass} onClick={closeMenu}>
              وبلاگ
            </NavLink>
          )}
          <NavLink to="/how-to-order" className={drawerLinkClass} onClick={closeMenu}>
            شیوه ثبت سفارش
          </NavLink>
          <NavLink to="/contact" className={drawerLinkClass} onClick={closeMenu}>
            تماس با ما
          </NavLink>

          {/* Mobile: Categories section */}
          {catTree.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-xs font-semibold px-3 py-1" style={{ color: 'var(--text-muted)' }}>دسته‌بندی‌ها</p>
              {catTree.map((cat) => (
                <div key={cat.id}>
                  <NavLink
                    to={`/?category=${cat.id}`}
                    className={drawerLinkClass}
                    onClick={closeMenu}
                  >
                    {cat.name}
                  </NavLink>
                  {cat.children && cat.children.map((sub) => (
                    <NavLink
                      key={sub.id}
                      to={`/?category=${sub.id}`}
                      className={drawerLinkClass}
                      onClick={closeMenu}
                      style={{ paddingRight: '32px', fontSize: '13px' }}
                    >
                      {sub.name}
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>
          )}
        </nav>
      </aside>

      <main className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {children}
      </main>

      <footer
        className="relative border-t py-7 catalog-footer"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-center sm:text-right catalog-footer-copy">
            <span className="opacity-95">© Spaghettiprints · اسپاگتی پرینت</span>
            <span className="mx-2 opacity-50">·</span>
            <span>کاتالوگ محصولات چاپ سه‌بعدی</span>
            <span className="mx-2 opacity-50">·</span>
            <span aria-hidden="true">✨</span>
            <span className="mx-1 opacity-50">·</span>
            <span>قدرت گرفته از ایده و خیال ما</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-3" aria-label="پاورقی">
            <Link to="/" className="catalog-footer-link">
              کاتالوگ
            </Link>
            {blogEnabled && (
              <Link to="/blog" className="catalog-footer-link">
                وبلاگ
              </Link>
            )}
            <Link to="/how-to-order" className="catalog-footer-link">
              شیوه ثبت سفارش
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
