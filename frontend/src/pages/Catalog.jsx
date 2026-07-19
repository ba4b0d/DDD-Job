import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Package, Clock, Weight, Layers, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { getCatalog, getCatalogCategories } from '../lib/api';
import { formatPrice, formatMinutes } from '../lib/utils';

function CatalogImageCarousel({ images, name }) {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const sorted = useMemo(() => {
    if (!images || images.length === 0) return [];
    return [...images].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [images]);

  const next = useCallback(() => setCurrent((c) => (c + 1) % sorted.length), [sorted.length]);
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + sorted.length) % sorted.length),
    [sorted.length]
  );

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) next();
    if (distance < -50) prev();
  };

  if (sorted.length === 0) return null;

  if (sorted.length === 1) {
    return (
      <img
        src={sorted[0].image_url}
        alt={name || ''}
        className="w-full h-48 sm:h-56 object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        loading="lazy"
      />
    );
  }

  return (
    <div
      className="relative w-full h-48 sm:h-56"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={sorted[current].image_url}
        alt={name || ''}
        className="w-full h-48 sm:h-56 object-cover transition-transform duration-700"
        loading="lazy"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="قبلی"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="بعدی"
      >
        <ChevronRight size={16} />
      </button>
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {sorted.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrent(i);
            }}
            className="rounded-full transition-all"
            style={{
              width: i === current ? 14 : 6,
              height: 6,
              backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
            aria-label={`تصویر ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function displayName(name) {
  if (!name || /^[?\s]+$/.test(name)) return 'بدون نام';
  return name;
}

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [pRes, cRes] = await Promise.all([getCatalog(), getCatalogCategories()]);
        const pList = Array.isArray(pRes.data) ? pRes.data : [];
        const catsList = Array.isArray(cRes.data)
          ? cRes.data.map((c) => ({ key: c.name, count: null }))
          : [];
        setProducts(pList);
        setCategories(catsList);
        setError(null);
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.error('Catalog load error:', err);
          setError('خطا در بارگذاری کاتالوگ');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.product_id?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.material_name?.toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      if (activeCategory === 'uncategorized') {
        list = list.filter((p) => !p.category || p.category === '');
      } else {
        list = list.filter((p) => p.category === activeCategory);
      }
    }
    switch (sortBy) {
      case 'price_asc':
        list.sort(
          (a, b) =>
            (a.suggested_price || a.final_price || 0) - (b.suggested_price || b.final_price || 0)
        );
        break;
      case 'price_desc':
        list.sort(
          (a, b) =>
            (b.suggested_price || b.final_price || 0) - (a.suggested_price || a.final_price || 0)
        );
        break;
      case 'weight':
        list.sort((a, b) => (a.weight_g || 0) - (b.weight_g || 0));
        break;
      default:
        list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fa'));
    }
    return list;
  }, [products, search, activeCategory, sortBy]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="skeleton-pulse h-40 rounded-[1.25rem]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="catalog-product-card overflow-hidden">
              <div className="skeleton-pulse h-48" />
              <div className="p-4 space-y-2">
                <div className="skeleton-pulse h-4 w-3/4 rounded" />
                <div className="skeleton-pulse h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#ef4444' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-7 sm:space-y-9 animate-fade-in">
      {/* Photo hero: full-bleed image, Farsi copy overlaid on the right */}
            <section className="catalog-hero overflow-hidden rounded-[1.35rem]">
              <img
                src="/catalog-hero.jpg"
                alt=""
                className="catalog-hero-photo"
                width={1024}
                height={572}
                decoding="async"
                fetchPriority="high"
              />
              <div className="catalog-hero-scrim" aria-hidden="true" />

              <div className="catalog-hero-copy">
                <div className="catalog-fdm-badge">
                                  <Sparkles size={12} />
                                  Spaghetti · FDM
                                </div>
                                <h2
                                  className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2.5 tracking-tight leading-[1.15] drop-shadow-sm"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  کاتالوگ محصولات
                                </h2>
                                <p
                                  className="text-sm sm:text-[15px] leading-relaxed max-w-md"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  طراحی، چاپ و قیمت شفاف — محصولات آماده و سفارشی را ببینید، فیلتر کنید و قیمت را مقایسه کنید.
                                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="catalog-stat-pill catalog-stat-pill-on-photo">
                    {products.length} محصول
                  </span>
                  {categories.length > 0 && (
                    <span className="catalog-stat-pill catalog-stat-pill-on-photo">
                      {categories.length} دسته‌بندی
                    </span>
                  )}
                </div>
              </div>
            </section>

      {/* Sticky-ish toolbar */}
      <div className="catalog-toolbar flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو نام، کد، ماده یا دسته..."
              className="input-field catalog-search pr-10 text-sm"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select-field w-full sm:w-auto min-w-[160px]"
          >
            <option value="name">مرتب‌سازی: نام</option>
            <option value="price_asc">قیمت ↑</option>
            <option value="price_desc">قیمت ↓</option>
            <option value="weight">وزن</option>
          </select>
        </div>

        {categories.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`catalog-chip ${!activeCategory ? 'catalog-chip-active' : ''}`}
            >
              همه ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                className={`catalog-chip ${activeCategory === cat.key ? 'catalog-chip-active' : ''}`}
              >
                {cat.key}
              </button>
            ))}
          </div>
        )}

        <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} نتیجه
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="catalog-product-card p-12 sm:p-16 text-center">
          <div
            className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent-light)' }}
          >
            <Package size={28} style={{ color: 'var(--accent)', opacity: 0.85 }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            محصولی یافت نشد
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            فیلتر یا جستجو را تغییر دهید
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((product, idx) => {
            const price = product.final_price || product.suggested_price;
            return (
              <article
                key={product.id}
                className="catalog-product-card group flex flex-col"
                style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
              >
                <div
                  className="relative overflow-hidden"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  {product.images?.length > 0 ? (
                    <CatalogImageCarousel images={product.images} name={product.name} />
                  ) : product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={displayName(product.name)}
                      className="w-full h-48 sm:h-56 object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-48 sm:h-56 flex flex-col items-center justify-center gap-2 catalog-img-placeholder">
                      <Package size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>بدون تصویر</span>
                    </div>
                  )}

                  {/* bottom gradient on image */}
                  <div className="catalog-img-fade pointer-events-none" aria-hidden="true" />

                  <div className="absolute top-2.5 inset-x-2.5 flex items-start justify-between gap-2 pointer-events-none z-[1]">
                    {product.product_id ? (
                      <span className="catalog-code-badge">{product.product_id}</span>
                    ) : (
                      <span />
                    )}
                    {product.category && (
                      <span className="catalog-cat-badge">{product.category}</span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  <h3
                    className="font-bold text-[15px] leading-snug line-clamp-2 tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {displayName(product.name)}
                  </h3>

                  <div
                    className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {product.material_name && (
                      <span className="inline-flex items-center gap-1">
                        <Layers size={11} className="opacity-70" /> {product.material_name}
                      </span>
                    )}
                    {product.weight_g > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Weight size={11} className="opacity-70" /> {product.weight_g}g
                      </span>
                    )}
                    {product.print_time_hours > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} className="opacity-70" />{' '}
                        {formatMinutes(product.print_time_hours * 60)}
                      </span>
                    )}
                  </div>

                  <div
                    className="pt-3 mt-auto border-t flex items-end justify-between gap-2"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {price ? (
                      <div>
                        <div
                          className="text-[10px] uppercase tracking-wide mb-0.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {product.final_price ? 'قیمت نهایی' : 'پیشنهادی'}
                        </div>
                        <span className="catalog-price text-lg font-bold tabular-nums">
                          {formatPrice(price)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        قیمت تماس بگیرید
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
