import { useState, useEffect } from 'react';
import { ScrollText, User } from 'lucide-react';
import { getAuditLogs } from '../lib/api';

const ACTION_COLORS = {
  create: '#22c55e',
  update: '#f59e0b',
  delete: '#ef4444',
  bulk: '#6366f1',
};

const ACTION_LABELS = {
  create: 'ایجاد',
  update: 'ویرایش',
  delete: 'حذف',
  bulk: 'گروهی',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs(200)
      .then((res) => setLogs(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>گزارش فعالیت‌ها</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>تاریخچه تغییرات در محصولات، سفارش‌ها، کالکشن‌ها و تنظیمات</p>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <ScrollText size={40} className="mx-auto opacity-50" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>هنوز فعالیتی ثبت نشده است</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>زمان</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>کاربر</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>نوع</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>موجودیت</th>
                  <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>شرح</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const color = ACTION_COLORS[l.action] || '#94a3b8';
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="p-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {l.created_at ? new Date(l.created_at).toLocaleString('fa-IR') : ''}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                          <User size={12} /> {l.user || 'system'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: color + '22', color }}>
                          {ACTION_LABELS[l.action] || l.action}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{l.entity}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{l.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
