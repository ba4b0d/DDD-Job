import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Archive, Edit2 } from 'lucide-react';
import { getOrders, createOrder, updateOrder, deleteOrder, getOrderStatuses } from '../lib/api';
import { formatPrice } from '../lib/utils';
import {
  formatShamsiDate,
  gregorianIsoToShamsi,
  shamsiToGregorianIso,
  todayGregorianIso,
  toGregorianIso,
} from '../lib/shamsi';
import Modal from '../components/Modal';
import ShamsiDateField from '../components/ShamsiDateField';

const STATUS_COLORS = {
  new: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
  quoted: { bg: 'rgba(8,145,178,0.15)', color: '#0891b2' },
  printing: { bg: 'rgba(245,158,11,0.15)', color: '#d97706' },
  ready: { bg: 'rgba(34,197,94,0.15)', color: '#16a34a' },
  delivered: { bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
  cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

const DONE_STATUSES = new Set(['delivered', 'cancelled']);

/**
 * ready_by urgency for open orders only (compares Gregorian ISO from API).
 * overdue | today | soon (≤2d) | ok | none
 */
function readyUrgency(order, todayIso) {
  if (!order?.ready_by || DONE_STATUSES.has(order.status)) return 'none';
  const due = toGregorianIso(order.ready_by);
  if (!due) return 'none';
  if (due < todayIso) return 'overdue';
  if (due === todayIso) return 'today';
  const t = new Date(`${todayIso}T12:00:00`);
  const d = new Date(`${due}T12:00:00`);
  const days = Math.round((d - t) / 86400000);
  if (days <= 2) return 'soon';
  return 'ok';
}

const READY_STYLES = {
  overdue: { color: '#dc2626', fontWeight: 700 },
  today: { color: '#d97706', fontWeight: 700 },
  soon: { color: '#b45309', fontWeight: 600 },
  ok: { color: 'var(--text-secondary)', fontWeight: 500 },
  none: { color: 'var(--text-muted)', fontWeight: 400 },
};

const emptyForm = {
  customer_name: '',
  contact: '',
  product_label: '',
  quoted_price: '',
  paid_amount: '',
  status: 'new',
  notes: '',
  started_at: '',
  ready_by: '',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const todayIso = todayGregorianIso();

  const handleCloseModal = useCallback(() => {
    if (saving) return;
    setShowModal(false);
  }, [saving]);

  const load = useCallback(async (signal) => {
    try {
      const params = {};
      if (filter) params.status = filter;
      const [oRes, sRes] = await Promise.all([
        getOrders(params, { signal }),
        getOrderStatuses({ signal }),
      ]);
      setOrders(Array.isArray(oRes.data) ? oRes.data : []);
      setStatuses(Array.isArray(sRes.data) ? sRes.data : []);
      setLoadError(null);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      console.error(err);
      setLoadError('خطا در بارگذاری سفارش‌ها');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (order) => {
    setEditing(order);
    setForm({
      customer_name: order.customer_name || '',
      contact: order.contact || '',
      product_label: order.product_label || '',
      quoted_price: order.quoted_price ?? '',
      paid_amount: order.paid_amount ?? '',
      status: order.status || 'new',
      notes: order.notes || '',
      started_at: gregorianIsoToShamsi(order.started_at),
      ready_by: gregorianIsoToShamsi(order.ready_by),
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.customer_name.trim()) {
      setError('نام مشتری الزامی است');
      return;
    }
    let startedIso = null;
    let readyIso = null;
    if (form.started_at.trim()) {
      startedIso = shamsiToGregorianIso(form.started_at);
      if (!startedIso) {
        setError('تاریخ شروع شمسی نامعتبر است (مثال: 1405/04/28)');
        return;
      }
    }
    if (form.ready_by.trim()) {
      readyIso = shamsiToGregorianIso(form.ready_by);
      if (!readyIso) {
        setError('موعد آماده ارسال شمسی نامعتبر است (مثال: 1405/04/28)');
        return;
      }
    }
    setSaving(true);
    const payload = {
      customer_name: form.customer_name.trim(),
      contact: form.contact.trim(),
      product_label: form.product_label.trim(),
      quoted_price: Number(form.quoted_price) || 0,
      paid_amount: Number(form.paid_amount) || 0,
      status: form.status || 'new',
      notes: form.notes.trim(),
      started_at: startedIso,
      ready_by: readyIso,
    };
    try {
      if (editing) {
        await updateOrder(editing.id, payload);
      } else {
        await createOrder(payload);
      }
      setShowModal(false);
      setLoading(true);
      await load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'خطا در ذخیره سفارش');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusQuick = async (order, status) => {
    if (status === order.status) return;
    try {
      await updateOrder(order.id, { status });
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'خطا در تغییر وضعیت');
    }
  };

  const handleArchive = async (order) => {
    if (!confirm(`بایگانی «${order.customer_name}»؟`)) return;
    try {
      await deleteOrder(order.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'خطا');
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <span style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</span>
      </div>
    );
  }

  if (loadError && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <span style={{ color: '#ef4444' }}>{loadError}</span>
      </div>
    );
  }

  const statusOptions = statuses.length
    ? statuses
    : [
        { value: 'new', label: 'جدید' },
        { value: 'quoted', label: 'قیمت‌داده‌شده' },
        { value: 'printing', label: 'در حال چاپ' },
        { value: 'ready', label: 'آماده تحویل' },
        { value: 'delivered', label: 'تحویل‌شده' },
        { value: 'cancelled', label: 'لغو' },
      ];

  const headers = ['مشتری', 'تماس', 'محصول', 'شروع', 'موعد ارسال', 'قیمت', 'پرداخت', 'مانده', 'وضعیت', ''];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white" style={{ color: '#fff' }}>
            سفارش‌ها
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            برد ساده کارگاه — نه حسابداری
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} /> سفارش جدید
        </button>
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => setFilter('')}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors"
          style={{
            backgroundColor: !filter ? 'var(--accent-light)' : 'var(--bg-card)',
            color: !filter ? 'var(--accent)' : 'var(--text-secondary)',
            borderColor: !filter ? 'var(--accent)' : 'var(--border-color)',
          }}
        >
          همه
        </button>
        {statuses.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setFilter(s.value)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors"
            style={{
              backgroundColor: filter === s.value ? 'var(--accent-light)' : 'var(--bg-card)',
              color: filter === s.value ? 'var(--accent)' : 'var(--text-secondary)',
              borderColor: filter === s.value ? 'var(--accent)' : 'var(--border-color)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList size={48} className="mx-auto mb-4" style={{ color: 'var(--border-color)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            هنوز سفارشی ثبت نشده
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 880 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                  {headers.map((h) => (
                    <th
                      key={h || 'actions'}
                      className="text-right px-3 py-3 font-medium whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const sc = STATUS_COLORS[o.status] || STATUS_COLORS.new;
                  const urg = readyUrgency(o, todayIso);
                  const readyStyle = READY_STYLES[urg] || READY_STYLES.none;
                  return (
                    <tr
                      key={o.id}
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                      className="hover:bg-[color-mix(in_srgb,var(--bg-tertiary)_50%,transparent)]"
                    >
                      <td className="px-3 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {o.customer_name}
                      </td>
                      <td className="px-3 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {o.contact || '—'}
                      </td>
                      <td
                        className="px-3 py-3 max-w-[10rem] truncate"
                        style={{ color: 'var(--text-secondary)' }}
                        title={o.product_label}
                      >
                        {o.product_label || '—'}
                      </td>
                      <td
                        className="px-3 py-3 whitespace-nowrap text-xs text-right"
                        style={{ color: 'var(--text-secondary)' }}
                        dir="ltr"
                      >
                        {formatShamsiDate(o.started_at)}
                      </td>
                      <td
                        className="px-3 py-3 whitespace-nowrap text-xs text-right"
                        style={readyStyle}
                        dir="ltr"
                        title={
                          urg === 'overdue'
                            ? 'موعد گذشته'
                            : urg === 'today'
                              ? 'موعد امروز'
                              : urg === 'soon'
                                ? 'نزدیک'
                                : ''
                        }
                      >
                        {formatShamsiDate(o.ready_by)}
                        {urg === 'overdue' && <span className="mr-1">!</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {formatPrice(o.quoted_price)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {formatPrice(o.paid_amount)}
                      </td>
                      <td
                        className="px-3 py-3 whitespace-nowrap font-medium"
                        style={{ color: o.remaining > 0 ? '#d97706' : '#16a34a' }}
                      >
                        {formatPrice(o.remaining)}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusQuick(o, e.target.value)}
                          className="text-xs font-medium rounded-lg px-2 py-1.5 border-0 cursor-pointer"
                          style={{ backgroundColor: sc.bg, color: sc.color }}
                          aria-label="وضعیت سفارش"
                        >
                          {statuses.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => openEdit(o)}
                            className="p-2 rounded-lg"
                            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
                            title="ویرایش"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchive(o)}
                            className="p-2 rounded-lg"
                            style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}
                            title="بایگانی"
                          >
                            <Archive size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editing ? 'ویرایش سفارش' : 'سفارش جدید'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              نام مشتری *
            </label>
            <input
              className="input-field"
              value={form.customer_name}
              onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              تماس (تلفن / تلگرام)
            </label>
            <input
              className="input-field"
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              محصول / شرح
            </label>
            <input
              className="input-field"
              value={form.product_label}
              onChange={(e) => setForm((f) => ({ ...f, product_label: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                قیمت توافقی
              </label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.quoted_price}
                onChange={(e) => setForm((f) => ({ ...f, quoted_price: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                پرداخت‌شده
              </label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.paid_amount}
                onChange={(e) => setForm((f) => ({ ...f, paid_amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                تاریخ شروع (شمسی)
              </label>
              <ShamsiDateField
                value={form.started_at}
                onChange={(v) => setForm((f) => ({ ...f, started_at: v }))}
                placeholder="۱۴۰۵/۰۴/۲۸"
                aria-label="تاریخ شروع شمسی"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                موعد آماده ارسال (شمسی)
              </label>
              <ShamsiDateField
                value={form.ready_by}
                onChange={(v) => setForm((f) => ({ ...f, ready_by: v }))}
                placeholder="۱۴۰۵/۰۵/۰۵"
                aria-label="موعد آماده ارسال شمسی"
              />
            </div>
          </div>
          <p className="text-[11px] -mt-2" style={{ color: 'var(--text-muted)' }}>
            تقویم شمسی — خالی = بدون تاریخ
          </p>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              وضعیت
            </label>
            <select
              className="select-field w-full"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              یادداشت
            </label>
            <textarea
              className="input-field"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={handleCloseModal} disabled={saving}>
              انصراف
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? '...' : 'ذخیره'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
