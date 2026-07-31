import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getCatalogCategories, getCatalog } from '../lib/api';
import { formatPrice } from '../lib/utils';
import { Weight, Ruler, Share2, Tag } from 'lucide-react';

/**
 * Dedicated category page — no hero, no CTA. Just product grid filtered by category.
 */
export default function CategoryPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCatalogCategories()
      .then((res) => {
        const tree = Array.isArray(res.data) ? res.data : [];
        const flatten = (nodes, depth = 0) => {
          let result = [];
          for (const n of nodes) {
            result.push({ id: n.id, name: n.name, depth, children: n.children || [] });
            if (n.children) result = result.concat(flatten(n.children, depth + 1));
          }
          return result;
        };
        setCategories(flatten(tree));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const catId = Number(id);
  const subId = searchParams.get('sub') ? Number(searchParams.get('sub')) : null;
  const activeCat = categories.find((c) => c.id === (subId || catId));
  const parentCat = categories.find((c) => c.id === catId);

  return (
    <div className="catalog-page" style={{ color: 'var(--text-primary)' }}>
      {/* Minimal header — no hero */}
      <div className="category-page-header">
        <Link to="/" className="category-page-back">
          ← بازگشت به کاتالوگ
        </Link>
        <h1 className="category-page-title" style={{ color: '#ffffff' }}>
          {activeCat ? activeCat.name : 'دسته‌بندی'}
        </h1>
        {!loading && parentCat && subId && (
          <span className="category-page-parent">{parentCat.name}</span>
        )}
      </div>

      {/* Sub-category chips if this is a parent with children */}
      {parentCat && parentCat.children && parentCat.children.length > 0 && !subId && (
        <div className="category-page-subchips">
          {parentCat.children.map((sub) => (
            <Link key={sub.id} to={`/category/${catId}?sub=${sub.id}`} className="category-page-subchip">
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {/* Product grid — same as catalog */}
      <CategoryProducts catId={catId} subId={subId} />
    </div>
  );
}

function CategoryProducts({ catId, subId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([getCatalog(), getCatalogCategories()])
      .then(([pRes, cRes]) => {
        const products = Array.isArray(pRes.data) ? pRes.data : [];
        const allCats = Array.isArray(cRes.data) ? cRes.data : [];

        // Build flat map of category ID → all descendant IDs
        const buildDescendants = (nodes) => {
          const map = {};
          const walk = (node) => {
            const kids = [];
            if (node.children) {
              for (const c of node.children) {
                kids.push(c.id);
                kids.push(...walk(c));
              }
            }
            map[node.id] = [node.id, ...kids];
            return kids;
          };
          for (const n of nodes) walk(n);
          return map;
        };
        const descMap = buildDescendants(allCats);

        // Filter: match sub-category ID or parent category (all descendants)
        const filterId = subId || catId;
        const matchIds = new Set(descMap[filterId] || [filterId]);

        const filtered = products.filter((p) => {
          if (p.categories && p.categories.length > 0) {
            return p.categories.some((c) => {
              const cid = typeof c === 'object' ? c.id : c;
              return matchIds.has(cid);
            });
          }
          return false;
        });

        setProducts(filtered);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [catId, subId]);

  if (loading) return <div className="catalog-loading">در حال بارگذاری...</div>;
  if (error) return <div className="catalog-error">{error}</div>;

  if (products.length === 0) {
    return (
      <div className="catalog-empty">
        <p style={{ color: 'var(--text-primary)' }}>محصولی در این دسته‌بندی یافت نشد.</p>
        <Link to="/" className="category-page-back" style={{ marginTop: 12, display: 'inline-block' }}>
          ← مشاهده همه محصولات
        </Link>
      </div>
    );
  }

  return (
    <div className="catalog-results-grid">
      {products.map((product, idx) => {
        const price = product.final_price || product.suggested_price;
        const displayName = (n) => n || 'بدون نام';
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(`https://spaghettiprints.ir/catalog/${product.slug || product.id}`)}&text=${encodeURIComponent(`مشاهده ${product.name}`)}`;

        return (
          <article
            key={product.id}
            className="catalog-product-card group flex flex-col relative"
            style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
          >
            <Link
              to={`/catalog/${product.slug || product.id}`}
              className="flex-1 flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
              style={{ '--tw-ring-color': 'var(--accent)' }}
              aria-label={`مشاهده ${displayName(product.name)}`}
            >
              {/* Image */}
              <div className="relative overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                {product.images?.length > 0 ? (
                  <div className="w-full aspect-square overflow-hidden">
                    <img
                      src={product.images[0].url || product.images[0]}
                      alt={displayName(product.name)}
                      className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                ) : product.image_url ? (
                  <div className="w-full aspect-square overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={displayName(product.name)}
                      className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    بدون تصویر
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col gap-1.5 p-3 sm:p-3.5">
                {product.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-0.5">
                    {product.categories.slice(0, 2).map((cat, ci) => (
                      <span key={ci} className="catalog-cat-badge">
                        {typeof cat === 'object' ? cat.name : cat}
                      </span>
                    ))}
                  </div>
                )}

                <h3 className="font-semibold text-sm leading-snug" style={{ color: '#ffffff' }}>
                  {displayName(product.name)}
                </h3>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {product.material_name && (
                    <span className="inline-flex items-center gap-1">
                      <Tag size={11} className="opacity-70" /> {product.material_name}
                    </span>
                  )}
                  {product.weight_g > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Weight size={11} className="opacity-70" /> {product.weight_g}g
                    </span>
                  )}
                  {(product.dimension_x || product.dimension_y || product.dimension_z) ? (() => {
                    const dims = [product.dimension_x, product.dimension_y, product.dimension_z]
                      .map((d) => (d / 10).toFixed(1))
                      .sort((a, b) => b - a);
                    return (
                      <span className="inline-flex items-center gap-1">
                        <Ruler size={11} className="opacity-70" /> {dims[0]} × {dims[1]} × {dims[2]} سانتی‌متر
                      </span>
                    );
                  })() : null}
                </div>

                <div className="mt-auto pt-2 border-t flex items-end justify-between gap-2" style={{ borderColor: 'var(--border-color)' }}>
                  {price > 0 ? (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
                        قیمت
                      </div>
                      <span className="catalog-price text-lg font-bold tabular-nums" style={{ color: '#ffffff' }}>
                        {formatPrice(price)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}> تومان</span>
                    </div>
                  ) : (
                    <span className="catalog-price-contact text-sm" style={{ color: '#ffffff' }}>تماس بگیرید</span>
                  )}
                </div>
              </div>
            </Link>

            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="catalog-share-btn"
              aria-label="اشتراک در تلگرام"
              onClick={(e) => e.stopPropagation()}
            >
              <Share2 size={15} />
            </a>
          </article>
        );
      })}
    </div>
  );
}
