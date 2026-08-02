import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Package, Clock, Weight, Layers, ChevronLeft, ChevronRight, Sparkles, Ruler, Send } from 'lucide-react';
import { getCatalog, getCatalogCategories } from '../lib/api';
import { formatPrice, formatMinutes } from '../lib/utils';
import { useSEO, buildWebSiteJsonLd, buildOrganizationJsonLd } from '../lib/seo';

function CatalogImageCarousel({ images, name, priority = false }) {
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
      <div className="w-full aspect-square overflow-hidden bg-[var(--bg-tertiary)]">
        <img
          src={sorted[0].image_url}
          alt={name || ''}
          width={320}
          height={320}
          decoding="async"
          className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-110"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-square overflow-hidden bg-[var(--bg-tertiary)]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={sorted[current].image_url}
        alt={name || ''}
        width={320}
        height={320}
        decoding="async"
        className="w-full h-full object-contain transition-transform duration-700"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
      <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-[2]"
              aria-label="قبلی"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                next();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-[2]"
              aria-label="بعدی"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-[2]">
              {sorted.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrent(i);
                  }}
                  className="rounded-full transition-all"
                  style={{
                    width: i === current ? 14 : 6,
                    height: 6,
                    backgroundColor: i === current ? '#475569' : 'rgba(100,116,139,0.5)',
                  }}
                  aria-label={`تصویر ${i + 1}`}
                />
              ))}
            </div>
    </div>
  );
}

function isWithinDays(isoDate, days = 14) {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return date >= cutoff;
}

function telegramShareUrl(product) {
  const url = `${window.location.origin}/catalog/${product.slug}`;
  const text = `${displayName(product.name)}${product.product_id ? ` — کد: ${product.product_id}` : ''}`;
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

function displayName(name) {
  if (!name || /^[?\s]+$/.test(name)) return 'بدون نام';
  return name;
}

export default function Catalog() {
  useSEO({
    title: 'خدمات پرینت سه بعدی و کاتالوگ محصولات',
    description: 'اسپاگتی پرینت — خدمات آنلاین پرینت و چاپ سه‌بعدی سفارشی، ساخت قطعات و نمونه اولیه، کاتالوگ محصولات با قیمت شفاف',
    jsonLd: [buildWebSiteJsonLd(), buildOrganizationJsonLd()],
  });

  const [products, setProducts] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(() => {
    const cat = searchParams.get('category');
    return cat ? Number(cat) : null;
  });
  const [activeTag, setActiveTag] = useState(() => searchParams.get('tag') || null);
  const [sortBy, setSortBy] = useState('name');

  // Sync activeCategory & activeTag when URL params change
  useEffect(() => {
    const cat = searchParams.get('category');
    const num = cat ? Number(cat) : null;
    const tag = searchParams.get('tag');
    setActiveCategory((prev) => (prev === num ? prev : num));
    setActiveTag((prev) => (prev === tag ? prev : tag));
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [pRes, cRes] = await Promise.all([getCatalog(), getCatalogCategories()]);
        const pList = Array.isArray(pRes.data) ? pRes.data : [];
        // /catalog/categories returns tree [{id, name, children: [...]}]
        // Flatten tree for filter chips with depth info
        const flattenTree = (nodes, depth = 0) => {
          let result = [];
          for (const n of nodes) {
            result.push({ id: n.id, name: n.name, depth });
            if (n.children && n.children.length > 0) {
              result = result.concat(flattenTree(n.children, depth + 1));
            }
          }
          return result;
        };
        const treeData = Array.isArray(cRes.data) ? cRes.data : [];
        const catsList = flattenTree(treeData).map((c) => ({ id: c.id, name: c.name, depth: c.depth, count: null }));
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

  // Collect all unique tags from products (tags is comma-separated string)
  const allTags = useMemo(() => {
    const tagSet = new Set();
    for (const p of products) {
      const raw = (p.tags || '').trim();
      if (!raw) continue;
      for (const t of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
        tagSet.add(t);
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'fa'));
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.product_id?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          (p.categories || []).some((c) => c.name?.toLowerCase().includes(q)) ||
          p.material_name?.toLowerCase().includes(q) ||
          (p.tags || '').toLowerCase().split(',').map((s) => s.trim()).some((t) => t.includes(q))
      );
    }
    if (activeCategory) {
      if (activeCategory === 'uncategorized') {
        list = list.filter(
          (p) => (!p.categories || p.categories.length === 0) && (!p.category || p.category === '')
        );
      } else {
        // Build set of matching category IDs (selected + all descendants recursively)
        const matchingIds = new Set([activeCategory]);
        // Use the flat list which has parent_id to find all descendants
        let found = true;
        while (found) {
          found = false;
          categories.forEach((c) => {
            if (matchingIds.has(c.parent_id) && !matchingIds.has(c.id)) {
              matchingIds.add(c.id);
              found = true;
            }
          });
        }
        list = list.filter((p) => {
          if (p.categories && p.categories.length > 0) {
            return p.categories.some((c) => matchingIds.has(c.id));
          }
          if (p.category) {
            const matchedCat = categories.find((c) => c.id === activeCategory);
            return matchedCat ? p.category === matchedCat.name : false;
          }
          return false;
        });
      }
    }
    if (activeTag) {
      list = list.filter((p) => {
        const raw = (p.tags || '').trim();
        if (!raw) return false;
        return raw.split(',').map((s) => s.trim()).includes(activeTag);
      });
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
  }, [products, search, activeCategory, activeTag, sortBy]);

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
      {/* Desktop: photo + overlay copy · Mobile: stacked media + panel */}
      <div className="catalog-hero-row">
        <section className="catalog-hero catalog-hero--main overflow-hidden rounded-[1.35rem]">
              <div className="catalog-hero-media">
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
              </div>

              <div className="catalog-hero-copy">
                <div className="catalog-fdm-badge">
                  <Sparkles size={12} />
                  Spaghetti · FDM
                </div>
                <h1
                  className="catalog-hero-title text-2xl sm:text-3xl lg:text-4xl font-bold mb-2.5 tracking-tight leading-[1.15]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  خدمات پرینت سه‌بعدی و کاتالوگ محصولات
                </h1>
                <p className="text-xs sm:text-sm opacity-90 mt-1 max-w-lg" style={{ color: 'var(--text-secondary)' }}>
                  سفارش آنلاین قطعات سفارشی با عکس یا STL + شخصی‌سازی کامل رنگ و ابعاد محصولات کاتالوگ
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

        <Link
          to="/custom-order"
          className="catalog-hero-cta overflow-hidden rounded-[1.35rem]"
        >
          <div className="catalog-hero-cta-inner">
            <span className="catalog-hero-cta-title">طرح دلخواهتو پرینت کن</span>
            <span className="catalog-hero-cta-arrow">←</span>
          </div>
        </Link>
      </div>

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
              aria-label="جستجوی محصولات"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select-field w-full sm:w-auto min-w-[160px]"
            aria-label="مرتب‌سازی محصولات"
          >
            <option value="name">مرتب‌سازی: نام</option>
            <option value="price_asc">قیمت ↑</option>
            <option value="price_desc">قیمت ↓</option>
            <option value="weight">وزن</option>
          </select>
        </div>

        {(categories.length > 0 || allTags.length > 1) && (
          <div
            className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 catalog-filter-row"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <button
              type="button"
              onClick={() => { setActiveCategory(null); setActiveTag(null); }}
              className={`catalog-chip ${!activeCategory && !activeTag ? 'catalog-chip-active' : ''}`}
            >
              همه ({products.length})
            </button>
            {categories.filter((cat) => cat.depth === 0).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`catalog-chip ${activeCategory === cat.id ? 'catalog-chip-active' : ''}`}
              >
                {cat.name}
              </button>
            ))}
            {categories.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory(activeCategory === 'uncategorized' ? null : 'uncategorized')}
                className={`catalog-chip ${activeCategory === 'uncategorized' ? 'catalog-chip-active' : ''}`}
              >
                بدون دسته
              </button>
            )}
            {allTags.length > 1 && categories.length > 0 && (
              <span className="catalog-chip-divider" aria-hidden="true">•</span>
            )}
            {allTags.length > 1 && allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`catalog-chip catalog-chip-tag ${activeTag === tag ? 'catalog-chip-active' : ''}`}
              >
                {tag}
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
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            فیلترها یا عبارت جستجو را بررسی کنید. شاید دسته‌بندی یا نام دیگری مد نظرتان باشد.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            تماس با ما
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((product, idx) => {
            const price = product.final_price || product.suggested_price;
            const isNew = isWithinDays(product.created_at, 14);
            const shareUrl = telegramShareUrl(product);
            return (
              <article
                key={product.id}
                className="catalog-product-card group flex flex-col relative"
                style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
              >
                <Link
                  to={`/catalog/${product.slug}`}
                  className="flex-1 flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                  style={{ '--tw-ring-color': 'var(--accent)' }}
                  aria-label={`مشاهده ${displayName(product.name)}`}
                >
                  <div
                    className="relative overflow-hidden"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    {product.images?.length > 0 || product.image_url ? (
                      <CatalogImageCarousel images={product.images} imageUrl={product.image_url} name={product.name} priority={idx < 2} />
                    ) : (
                      <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 catalog-img-placeholder">
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
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isNew && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: '#22c55e', color: '#fff' }}
                          >
                            جدید
                          </span>
                        )}
                        {(product.categories || []).map((c) => (
                          <span key={c.id} className="catalog-cat-badge">{c.name}</span>
                        ))}
                        {/* Backward compat: show old string category if no multi-categories */}
                        {(!product.categories || product.categories.length === 0) && product.category && (
                          <span className="catalog-cat-badge">{product.category}</span>
                        )}
                      </div>
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
                          <Layers size={11} className="opacity-70" />
                          <span
                            className="inline-block rounded-full"
                            style={{
                              width: 8,
                              height: 8,
                              backgroundColor: product.material_color || '#94a3b8',
                            }}
                            aria-hidden="true"
                          />
                          {product.material_name}
                        </span>
                      )}
                      {product.weight_g > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Weight size={11} className="opacity-70" /> {product.weight_g}g
                        </span>
                      )}
                      {(product.dimension_x || product.dimension_y || product.dimension_z) ? (() => {
                        // Sort longest -> shortest for natural reading (L × W × H). Convert mm → cm.
                        const dims = [product.dimension_x, product.dimension_y, product.dimension_z]
                          .map((d) => (d / 10).toFixed(1))
                          .sort((a, b) => b - a);
                        return (
                          <span className="inline-flex items-center gap-1">
                            <Ruler size={11} className="opacity-70" />{' '}
                            {dims[0]} × {dims[1]} × {dims[2]} سانتی‌متر
                          </span>
                        );
                      })() : null}
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
                            {product.final_price ? 'قیمت' : 'قیمت'}
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
                </Link>

                {/* Telegram share — sits in the bottom-left corner next to the price, outside the Link to avoid nesting */}
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-4 left-4 z-[2] p-2 rounded-full bg-[var(--bg-secondary)] hover:bg-[#2AABEE] text-[var(--text-secondary)] hover:text-white transition-colors border border-[var(--border-color)] shadow-sm"
                  aria-label="اشتراک در تلگرام"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Send size={13} />
                </a>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
