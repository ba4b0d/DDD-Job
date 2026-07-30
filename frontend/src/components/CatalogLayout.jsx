import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, ChevronLeft, Search } from 'lucide-react';
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
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaSearch, setMegaSearch] = useState('');
  const megaRef = useRef(null);
  const megaTimer = useRef(null);
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

  const closeMenu = () => setMenuOpen(false);

  // Hover handlers for mega menu (with delay to prevent flicker)
  const megaEnter = () => {
    clearTimeout(megaTimer.current);
    setMegaOpen(true);
  };
  const megaLeave = () => {
    megaTimer.current = setTimeout(() => setMegaOpen(false), 200);
  };

  // Filter categories by search
  const filteredTree = megaSearch.trim()
    ? catTree.filter((cat) => {
        const q = megaSearch.toLowerCase();
        const nameMatch = cat.name.toLowerCase().includes(q);
        const childMatch = (cat.children || []).some((sub) =>
          sub.name.toLowerCase().includes(q)
        );
        return nameMatch || childMatch;
      })
    : catTree;

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
              <div className="catalog-logo-mark shrink-0" aria-hidden="true">S</div>
            </BrandLogo>
            <div className="min-w-0 catalog-brand-text">
              <h1 className="catalog-brand-title truncate">اسپاگتی پرینت</h1>
              <p className="catalog-brand-sub truncate">Spaghetti · کاتالوگ</p>
            </div>
          </Link>

          <nav className="catalog-nav catalog-nav--desktop" aria-label="منوی عمومی">
            {/* Categories mega-menu trigger */}
            <div ref={megaRef} className="relative" onMouseEnter={megaEnter} onMouseLeave={megaLeave}>
              <button
                type="button"
                className={`catalog-nav-link flex items-center gap-1 ${megaOpen ? 'catalog-nav-link--active' : ''}`}
                onClick={() => setMegaOpen((v) => !v)}
                aria-expanded={megaOpen}
                aria-haspopup="true"
              >
                دسته‌بندی‌ها
                <ChevronDown size={14} className={`transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`} />
              </button>
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

      {/* ─── Mega-menu overlay ─── */}
      {megaOpen && (
        <div
          className="fixed inset-0 bg-black/30"
          style={{ zIndex: Z_INDEX_STICKY - 1 }}
          onClick={() => setMegaOpen(false)}
        />
      )}
      {megaOpen && (
        <div
          className="mega-menu-panel"
          onMouseEnter={megaEnter}
          onMouseLeave={megaLeave}
          style={{ zIndex: Z_INDEX_STICKY }}
        >
          <div className="mega-menu-inner">
            {/* Search bar */}
            <div className="mega-menu-search">
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="جستجوی دسته‌بندی..."
                value={megaSearch}
                onChange={(e) => setMegaSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Categories grid */}
            <div className="mega-menu-grid">
              {filteredTree.length === 0 ? (
                <div className="mega-menu-empty">دسته‌بندی‌ای یافت نشد</div>
              ) : (
                filteredTree.map((cat) => (
                  <div key={cat.id} className="mega-menu-col">
                    <button
                      type="button"
                      className="mega-menu-parent"
                      onClick={() => {
                        setMegaOpen(false);
                        navigate(`/?category=${cat.id}`);
                      }}
                    >
                      {cat.name}
                    </button>
                    {cat.children && cat.children.length > 0 && (
                      <div className="mega-menu-children">
                        {cat.children.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            className="mega-menu-child"
                            onClick={() => {
                              setMegaOpen(false);
                              navigate(`/?category=${sub.id}`);
                            }}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
              <div className="catalog-logo-mark catalog-logo-mark--drawer shrink-0" aria-hidden="true">S</div>
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
            <Link to="/" className="catalog-footer-link">کاتالوگ</Link>
            {blogEnabled && (
              <Link to="/blog" className="catalog-footer-link">وبلاگ</Link>
            )}
            <Link to="/how-to-order" className="catalog-footer-link">شیوه ثبت سفارش</Link>
            <Link to="/contact" className="catalog-footer-link">تماس با ما</Link>
            <Link to="/privacy" className="catalog-footer-link">حریم خصوصی</Link>
            <Link to="/terms" className="catalog-footer-link">قوانین</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
