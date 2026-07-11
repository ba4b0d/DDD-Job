import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Layers,
  TrendingUp,
  DollarSign,
  ArrowUpLeft,
} from 'lucide-react';
import { getStats, getProducts } from '../lib/api';
import StatCard from '../components/StatCard';
import { formatPrice, formatMinutes } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAll = async () => {
      try {
        const [statsRes, productsRes] = await Promise.all([
          getStats({ signal: controller.signal }),
          getProducts({ sort: 'created_at', order: 'desc', limit: 10 }, { signal: controller.signal }),
        ]);
        setStats(statsRes.data);
        setRecentProducts(
          Array.isArray(productsRes.data)
            ? productsRes.data
            : productsRes.data?.items || productsRes.data?.products || []
        );
        setError(null);
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.error('Dashboard load error:', err);
          setError('خطا در بارگذاری داشبورد');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          در حال بارگذاری...
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
    <div className="space-y-6">
      {/* Page title */}
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        داشبورد
      </h2>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          title="تعداد محصولات"
          value={stats?.total_products ?? 0}
          color="#6366f1"
        />
        <StatCard
          icon={Layers}
          title="تعداد مواد"
          value={stats?.total_materials ?? 0}
          color="#14b8a6"
        />
        <StatCard
          icon={TrendingUp}
          title="میانگین حاشیه سود"
          value={stats?.avg_margin_pct != null ? `${stats.avg_margin_pct.toFixed(1)}%` : '—'}
          color="#10b981"
        />
        <StatCard
          icon={DollarSign}
          title="بازه قیمت"
          value={
            stats?.price_min != null && stats?.price_max != null
              ? `${formatPrice(stats.price_min).replace(' تومان', '')} - ${formatPrice(stats.price_max).replace(' تومان', '')}`
              : '—'
          }
          color="#f59e0b"
        />
      </div>

      {/* Recent products */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            محصولات اخیر
          </h3>
          <button
            onClick={() => navigate('/products')}
            className="text-sm flex items-center gap-1 hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            مشاهده همه
            <ArrowUpLeft size={14} />
          </button>
        </div>

        {recentProducts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            هنوز محصولی ثبت نشده است
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <th className="px-5 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>
                    نام
                  </th>
                  <th className="px-5 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>
                    دسته‌بندی
                  </th>
                  <th className="px-5 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>
                    وزن
                  </th>
                  <th className="px-5 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>
                    زمان چاپ
                  </th>
                  <th className="px-5 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>
                    قیمت پیشنهادی
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/products/${p.id}`)}
                  >
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {p.name}
                    </td>
                    <td className="px-5 py-3">
                      {p.category && (
                        <span className="badge badge-accent">{p.category}</span>
                      )}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {p.weight_g ? `${p.weight_g}g` : '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {p.print_time_hours
                        ? formatMinutes(p.print_time_hours * 60)
                        : '—'}
                    </td>
                    <td className="px-5 py-3 font-semibold" style={{ color: 'var(--accent)' }}>
                      {p.suggested_price ? formatPrice(p.suggested_price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category distribution */}
      {stats?.products_per_category && Object.keys(stats.products_per_category).length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            توزیع دستهبندی
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.products_per_category).map(([cat, count]) => {
              const total = Object.values(stats.products_per_category).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)', minWidth: '100px' }}>
                    {cat}
                  </span>
                  <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-full rounded-md transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
                    />
                  </div>
                  <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)', minWidth: '40px' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
