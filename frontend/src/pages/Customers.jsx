import { useState, useEffect } from 'react';
import { Users, Phone, Search, ShoppingBag } from 'lucide-react';
import { getCustomers } from '../lib/api';
import { formatPrice } from '../lib/utils';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomers()
      .then((res) => setCustomers(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.contact?.toLowerCase().includes(q);
  });

  const totalRevenue = customers.reduce((s, c) => s + (c.total_spent || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>مشتریان</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {customers.length} مشتری · مجموع خرید: {formatPrice(totalRevenue)}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام یا شماره..."
            className="input-field pr-9 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Users size={40} className="mx-auto opacity-50" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>مشتری‌ای یافت نشد</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>نام</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>راه ارتباطی</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>تعداد سفارش</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>مجموع خرید</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>آخرین سفارش</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="p-3 font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                      <span className="inline-flex items-center gap-1.5" dir="ltr">
                        <Phone size={12} /> {c.contact}
                      </span>
                    </td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                      <span className="inline-flex items-center gap-1">
                        <ShoppingBag size={12} /> {c.order_count}
                      </span>
                    </td>
                    <td className="p-3 font-semibold" style={{ color: 'var(--accent)' }}>{formatPrice(c.total_spent)}</td>
                    <td className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {c.last_order ? new Date(c.last_order).toLocaleDateString('fa-IR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
