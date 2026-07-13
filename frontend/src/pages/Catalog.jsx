import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Package, Clock, Weight, Layers, Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCatalog, getCatalogCategories } from '../lib/api';
import { formatPrice, formatMinutes } from '../lib/utils';

function CatalogImageCarousel({ images }) {
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

  const next = useCallback(() => setCurrent(c => (c + 1) % sorted.length), [sorted.length]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + sorted.length) % sorted.length), [sorted.length]);

  // Touch swipe handlers
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipe = 50;
    if (distance > minSwipe) next();
    if (distance < -minSwipe) prev();
  };

  if (sorted.length === 0) return null;
  if (sorted.length === 1) {
    return (
      <img src={sorted[0].image_url} alt="" className="w-full h-40 sm:h-52 object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
    );
  }

  return (
    <div
      className="relative w-full h-40 sm:h-52"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <img src={sorted[current].image_url} alt="" className="w-full h-40 sm:h-52 object-cover" loading="lazy" />
      {/* Nav arrows — larger touch targets on mobile */}
      <button onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-1 sm:left-1 top-1/2 -translate-y-1/2 p-2 sm:p-1 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-1 sm:right-1 top-1/2 -translate-y-1/2 p-2 sm:p-1 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
      >
        <ChevronRight size={16} />
      </button>
      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {sorted.map((_, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className="w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full transition-all"
            style={{ backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.4)' }}
          />
        ))}
      </div>
    </div>
  );
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
        const [pRes, cRes] = await Promise.all([
          getCatalog(),
          getCatalogCategories(),
        ]);
        const pList = Array.isArray(pRes.data) ? pRes.data : [];
        const catsList = Array.isArray(cRes.data)
          ? cRes.data.map(c => ({ key: c.name, count: null }))
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
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.product_id?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      if (activeCategory === 'uncategorized') {
        list = list.filter(p => !p.category || p.category === '');
      } else {
        list = list.filter(p => p.category === activeCategory);
      }
    }
    switch (sortBy) {
      case 'price_asc': list.sort((a, b) => (a.suggested_price || 0) - (b.suggested_price || 0)); break;
      case 'price_desc': list.sort((a, b) => (b.suggested_price || 0) - (a.suggested_price || 0)); break;
      case 'weight': list.sort((a, b) => (a.weight_g || 0) - (b.weight_g || 0)); break;
      default: list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fa'));
    }
    return list;
  }, [products, search, activeCategory, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</div>
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Hero — smaller on mobile */}
      <div className="text-center py-5 sm:py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl mb-3 sm:mb-4"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}>
          <Store size={24} className="text-white sm:hidden" />
          <Store size={28} className="text-white hidden sm:block" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>کاتالوگ محصولات</h2>
        <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
          محصولات چاپ سهبعدی Spaghetti را مرور کنید
        </p>
      </div>

      {/* Search + Sort — stacked on mobile */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو..."
            className="input-field pr-9 text-sm"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="select-field w-full sm:w-auto"
        >
          <option value="name">مرتبسازی: نام</option>
          <option value="price_asc">قیمت ↑</option>
          <option value="price_desc">قیمت ↓</option>
          <option value="weight">وزن</option>
        </select>
      </div>

      {/* Category pills — horizontal scroll on mobile */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          <button
            onClick={() => setActiveCategory(null)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: !activeCategory ? 'var(--accent)' : 'var(--bg-secondary)',
              color: !activeCategory ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            همه ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: activeCategory === cat.key ? 'var(--accent)' : 'var(--bg-secondary)',
                color: activeCategory === cat.key ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {cat.key}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      <div className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
        {filtered.length} محصول یافت شد
      </div>

      {/* Product grid — 1 col mobile, 2 col tablet, 3-4 col desktop */}
      {filtered.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <Package size={40} className="mx-auto mb-3 sm:mb-4" style={{ color: 'var(--border-color)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>محصولی یافت نشد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map(product => (
            <div
              key={product.id}
              className="group card overflow-hidden transition-all duration-300 hover:shadow-lg sm:hover:-translate-y-1"
            >
              {/* Image carousel */}
              <div className="relative overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                {product.images && product.images.length > 0 ? (
                  <CatalogImageCarousel images={product.images} />
                ) : product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-40 sm:h-52 object-cover transition-transform duration-500 sm:group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-40 sm:h-52 flex flex-col items-center justify-center gap-1.5">
                    <Package size={28} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>بدون تصویر</span>
                  </div>
                )}
                {product.category && (
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                    {product.category}
                  </div>
                )}
              </div>

              {/* Info — tighter on mobile */}
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <h3 className="font-bold text-sm sm:text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {product.name}
                </h3>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {product.material_name && (
                    <span className="flex items-center gap-1">
                      <Layers size={10} className="sm:hidden" /> <Layers size={11} className="hidden sm:block" /> {product.material_name}
                    </span>
                  )}
                  {product.weight_g > 0 && (
                    <span className="flex items-center gap-1">
                      <Weight size={10} className="sm:hidden" /> <Weight size={11} className="hidden sm:block" /> {product.weight_g}g
                    </span>
                  )}
                  {product.print_time_hours > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} className="sm:hidden" /> <Clock size={11} className="hidden sm:block" /> {formatMinutes(product.print_time_hours * 60)}
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  {product.final_price ? (
                    <span className="text-base sm:text-lg font-bold" style={{ color: 'var(--accent)' }}>
                      {formatPrice(product.final_price)} <span className="text-xs sm:text-sm font-normal">تومان</span>
                    </span>
                  ) : product.suggested_price ? (
                    <span className="text-base sm:text-lg font-bold" style={{ color: 'var(--accent)' }}>
                      {formatPrice(product.suggested_price)} <span className="text-xs sm:text-sm font-normal">تومان</span>
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>قیمت تماس بگیرید</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}