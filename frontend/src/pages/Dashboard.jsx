import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Layers,
  Cog,
  Calculator,
  Store,
  ArrowUpLeft,
  ClipboardList,
} from 'lucide-react';
import { getStats, getProducts, getSettings } from '../lib/api';
import { formatPrice } from '../lib/utils';

const QUICK_ACTIONS = [
  {
    path: '/products',
    title: 'محصول جدید',
    subtitle: 'وزن · زمان · قیمت پیشنهادی',
    icon: Package,
  },
  {
    path: '/materials',
    title: 'ماده جدید',
    subtitle: 'قیمت هر کیلو · ضایعات',
    icon: Layers,
  },
  {
    path: '/machines',
    title: 'ماشین جدید',
    subtitle: 'ولت · عمر · نگهداری',
    icon: Cog,
  },
  {
    path: '/calculator',
    title: 'ماشین حساب',
    subtitle: 'محاسبه سریع بدون ذخیره',
    icon: Calculator,
  },
];

function KpiCard({ label, value, hint }) {
  return (
    <div className="card p-5 flex flex-col gap-1.5 min-h-[112px]">
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className="text-3xl font-bold tracking-tight leading-none"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-xs mt-auto" style={{ color: 'var(--accent-2, #22d3ee)' }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function StatusBadge({ active }) {
  if (active) {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ backgroundColor: 'rgba(34, 197, 94, 0.18)', color: '#4ade80' }}
      >
        فعال
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24' }}
    >
      پیش‌نویس
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [markup, setMarkup] = useState(3);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAll = async () => {
      try {
        const [statsRes, productsRes, settingsRes] = await Promise.all([
          getStats({ signal: controller.signal }),
          getProducts(
            { sort: 'created_at', order: 'desc', limit: 8 },
            { signal: controller.signal }
          ),
          getSettings({ signal: controller.signal }).catch(() => null),
        ]);
        setStats(statsRes.data);
        setRecentProducts(
          Array.isArray(productsRes.data)
            ? productsRes.data
            : productsRes.data?.items || productsRes.data?.products || []
        );
        const settingsData = settingsRes?.data;
        // API: { default_markup_pct: { value, description, id, string_value }, ... }
        const raw =
          settingsData?.default_markup_pct?.value ??
          settingsData?.default_markup_pct ??
          null;
        if (raw != null) setMarkup(Number(raw) || 3);
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
      <div className="space-y-6">
        <div className="skeleton-pulse h-8 w-32 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton-pulse h-3 w-20 rounded" />
              <div className="skeleton-pulse h-8 w-16 rounded" />
              <div className="skeleton-pulse h-3 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4 card p-5 h-72 skeleton-pulse" />
          <div className="xl:col-span-8 card p-5 h-72 skeleton-pulse" />
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

  const markupLabel = `x${Number(markup).toFixed(1).replace(/\.0$/, '')}`;

  return (
    <div className="space-y-6">
      {/* Page title — mock: large داشبورد on the right (RTL start) */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl lg:text-[26px] font-bold tracking-tight text-white" style={{ color: '#fff' }}>
          داشبورد
        </h2>
      </div>

      {/* KPI row — catalog / pricing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="میانگین ضریب"
          value={markupLabel}
          hint="هدف ۳.۲"
        />
        <KpiCard
          label="ماشین‌ها"
          value={stats?.total_machines ?? 0}
          hint="همه آنلاین"
        />
        <KpiCard
          label="مواد اولیه"
          value={stats?.total_materials ?? 0}
          hint={`${stats?.total_materials ?? 0} نوع فعال`}
        />
        <KpiCard
          label="محصولات فعال"
          value={stats?.active_products ?? stats?.total_products ?? 0}
          hint={`${stats?.total_products ?? 0} کل`}
        />
      </div>

      {/* Shop ops this month — board B, not accounting */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <h3 className="text-sm font-semibold text-white" style={{ color: '#fff' }}>
            سفارش‌ها
          </h3>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <ClipboardList size={14} />
            تابلو سفارش‌ها
            <ArrowUpLeft size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="تعداد سفارش"
            value={stats?.orders_this_month ?? 0}
            hint="بدون لغو · همین ماه"
          />
          <KpiCard
            label="دریافتی"
            value={formatPrice(stats?.orders_paid_this_month ?? 0)}
            hint="جمع مبلغ پرداخت‌شده"
          />
          <KpiCard
            label="مبلغ کل (نقل‌قول)"
            value={formatPrice(stats?.orders_quoted_this_month ?? 0)}
            hint="جمع قیمت اعلام‌شده"
          />
          <KpiCard
            label="باز · در جریان"
            value={stats?.orders_open ?? 0}
            hint={
              stats?.orders_remaining_this_month != null
                ? `مانده ماه: ${formatPrice(stats.orders_remaining_this_month)}`
                : 'جدید تا آماده‌تحویل'
            }
          />
        </div>
      </div>

      {/* Quick actions + recent products */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Quick actions — mock left panel */}
        <section className="xl:col-span-4 card p-5 flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              اقدام سریع
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              افزودن موجودیت جدید
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {QUICK_ACTIONS.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="flex items-center gap-3 w-full text-right px-3 py-3 rounded-xl transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 45%, transparent)';
                  e.currentTarget.style.backgroundColor = 'var(--accent-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #22d3ee))',
                    boxShadow: '0 0 14px rgba(129, 140, 248, 0.35)',
                    color: '#fff',
                  }}
                >
                  <item.icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {item.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary w-full justify-center mt-1"
            onClick={() => navigate('/')}
          >
            <Store size={16} />
            ورود به کاتالوگ عمومی
          </button>
        </section>

        {/* Recent products table */}
        <section className="xl:col-span-8 card overflow-hidden">
          <div
            className="flex items-center justify-between gap-3 px-5 py-4 border-b"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              محصولات اخیر
            </h3>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              مشاهده همه
              <ArrowUpLeft size={14} />
            </button>
          </div>

          {recentProducts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              هنوز محصولی ثبت نشده است
            </div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>کد</th>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>نام</th>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>ماده</th>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>قیمت</th>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProducts.map((p) => (
                      <tr
                        key={p.id}
                        className="table-row cursor-pointer"
                        onClick={() => navigate(`/products/${p.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {p.product_id || `P${p.id}`}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                          {p.name}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                          {p.material_name || '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {p.suggested_price != null ? formatPrice(p.suggested_price) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge active={p.is_active !== false} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {recentProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 cursor-pointer active:bg-white/5"
                    onClick={() => navigate(`/products/${p.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {p.product_id || `P${p.id}`}
                        </div>
                        <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {p.name}
                        </h4>
                      </div>
                      <StatusBadge active={p.is_active !== false} />
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>{p.material_name || '—'}</span>
                      <span className="font-bold mr-auto" style={{ color: 'var(--accent)' }}>
                        {p.suggested_price != null ? formatPrice(p.suggested_price) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
