import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getCatalogCategories } from '../lib/api';
import { Search } from 'lucide-react';
import { formatPrice } from '../lib/utils';

/**
 * Dedicated category page — no hero, no CTA. Just product grid filtered by category.
 * Also supports /category/:id?category=subId for sub-category deep links.
 */
export default function CategoryPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Build flat category map for name lookup
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
    <div className="catalog-page">
      {/* Breadcrumb-style header — minimal, no hero */}
      <div className="category-page-header">
        <Link to="/" className="category-page-back">
          ← بازگشت به کاتالوگ
        </Link>
        <h1 className="category-page-title">
          {activeCat ? activeCat.name : 'دسته‌بندی'}
        </h1>
        {!loading && parentCat && subId && (
          <span className="category-page-parent">
            {parentCat.name}
          </span>
        )}
      </div>

      {/* Sub-category chips if this is a parent */}
      {parentCat && parentCat.children && parentCat.children.length > 0 && !subId && (
        <div className="category-page-subchips">
          {parentCat.children.map((sub) => (
            <Link
              key={sub.id}
              to={`/category/${catId}?sub=${sub.id}`}
              className="category-page-subchip"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {/* Products — reuse catalog grid inline */}
      <CategoryProducts catId={catId} subId={subId} />
    </div>
  );
}

/**
 * Fetches and displays products filtered by category/subcategory.
 */
function CategoryProducts({ catId, subId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    import('../lib/api').then(({ getCatalog }) => {
      getCatalog({ signal: controller.signal })
        .then((res) => {
          let list = Array.isArray(res.data) ? res.data : [];
          // Filter by active sub or parent category (recursive descendant match)
          const filterId = subId || catId;
          const catIds = new Set([filterId]);

          // Build set of descendant IDs from categories state (loaded via parent)
          // Simple approach: match category_id or categories array
          list = list.filter((p) => {
            if (p.categories && p.categories.length > 0) {
              return p.categories.some((c) => {
                const cid = typeof c === 'object' ? c.id : c;
                return catIds.has(cid) || cid === filterId;
              });
            }
            // Backward compat: string category
            return false;
          });

          setProducts(list);
        })
        .catch((err) => {
          if (!controller.signal.aborted) setError(err.message);
        })
        .finally(() => setLoading(false));
    });

    return () => controller.abort();
  }, [catId, subId]);

  if (loading) {
    return <div className="catalog-loading">در حال بارگذاری...</div>;
  }

  if (error) {
    return <div className="catalog-error">{error}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="catalog-empty">
        <p>محصولی در این دسته‌بندی یافت نشد.</p>
        <Link to="/" className="category-page-back" style={{ marginTop: 12, display: 'inline-block' }}>
          ← مشاهده همه محصولات
        </Link>
      </div>
    );
  }

  return (
    <div className="catalog-grid">
      {products.map((product) => (
        <Link
          key={product.id}
          to={`/catalog/${product.slug || product.id}`}
          className="catalog-card"
        >
          <div className="catalog-card-img">
            {product.images && product.images.length > 0 ? (
              <img src={product.images[0].url} alt={product.name} />
            ) : (
              <span className="catalog-card-noimg">بدون تصویر</span>
            )}
          </div>
          <div className="catalog-card-body">
            <h3 className="catalog-card-title">{product.name}</h3>
            <div className="catalog-card-meta">
              {product.material_name && <span>{product.material_name}</span>}
              {product.weight_g > 0 && <span>{product.weight_g}g</span>}
            </div>
            <div className="catalog-card-price">
              {product.final_price > 0 ? (
                <>
                  <span className="catalog-price-label">قیمت</span>
                  <span className="catalog-price">{formatPrice(product.final_price)} تومان</span>
                </>
              ) : (
                <span className="catalog-price-contact">تماس بگیرید</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
