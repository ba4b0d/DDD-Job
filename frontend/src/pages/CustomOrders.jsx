import { useState, useEffect } from 'react';
import { Inbox, Trash2, Check, Phone, MessageCircle, Send, Camera } from 'lucide-react';
import { getRequests, updateRequest, deleteRequest } from '../lib/api';

const STATUS_LABELS = {
  new: { label: 'جدید', color: '#22c55e' },
  contacted: { label: 'در تماس', color: '#f59e0b' },
  closed: { label: 'بسته شده', color: '#64748b' },
};

const CHANNEL_ICONS = { telegram: Send, whatsapp: MessageCircle, instagram: Camera, phone: Phone };

export default function CustomOrders() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('new');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getRequests(filter);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const handleStatus = async (id, status) => {
    try {
      await updateRequest(id, { status });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف این درخواست؟')) return;
    try {
      await deleteRequest(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const newCount = requests.filter((r) => r.status === 'new').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>صندوق سفارشات</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>درخواست‌های فرم سفارش سایت</p>
        </div>
        <div className="flex gap-2">
          {['new', 'contacted', 'closed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{
                backgroundColor: filter === s ? 'var(--accent)' : 'var(--bg-secondary)',
                color: filter === s ? '#fff' : 'var(--text-primary)',
                borderColor: filter === s ? 'var(--accent)' : 'var(--border-color)',
              }}
            >
              {STATUS_LABELS[s].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Inbox size={40} className="mx-auto opacity-50" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>درخواستی در این دسته نیست</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const Icon = CHANNEL_ICONS[r.channel] || Send;
            const st = STATUS_LABELS[r.status] || STATUS_LABELS.new;
            return (
              <div key={r.id} className="card p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{r.name || 'بدون نام'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: st.color + '22', color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Icon size={14} />
                      <span dir="ltr">{r.contact}</span>
                      {r.reference_product && <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>{r.reference_product}</span>}
                    </div>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('fa-IR') : ''}
                  </div>
                </div>

                {r.description && (
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    {r.description}
                  </p>
                )}

                {r.image_url && (
                  <img src={r.image_url} alt="پیوست سفارش" className="max-h-40 rounded-lg object-contain" />
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex gap-2">
                    {r.status === 'new' && (
                      <button onClick={() => handleStatus(r.id, 'contacted')} className="btn-secondary p-2 text-xs flex items-center gap-1.5">
                        <Check size={14} />
                        در تماس
                      </button>
                    )}
                    {r.status === 'contacted' && (
                      <button onClick={() => handleStatus(r.id, 'closed')} className="btn-secondary p-2 text-xs flex items-center gap-1.5">
                        <Check size={14} />
                        بستن
                      </button>
                    )}
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="btn-danger p-2 text-xs flex items-center gap-1.5">
                    <Trash2 size={14} />
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
