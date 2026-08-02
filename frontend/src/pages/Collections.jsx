import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit, Check, Search } from 'lucide-react';
import { getCollectionsAll, createCollection, updateCollection, deleteCollection, getProductsAll } from '../lib/api';
import Modal from '../components/Modal';

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', product_ids: [] });
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [collRes, prodRes] = await Promise.all([getCollectionsAll(), getProductsAll()]);
      setCollections(Array.isArray(collRes.data) ? collRes.data : []);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError('خطا در بارگذاری کالکشن‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', product_ids: [] });
    setProductSearch('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (coll) => {
    setEditing(coll);
    setForm({
      name: coll.name,
      description: coll.description || '',
      product_ids: coll.product_ids || [],
    });
    setProductSearch('');
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await updateCollection(editing.id, form);
      } else {
        await createCollection(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در ذخیره‌سازی کالکشن');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('آیا از حذف این کالکشن اطمینان دارید؟')) return;
    try {
      await deleteCollection(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleProductSelection = (pId) => {
    setForm((prev) => {
      const current = prev.product_ids || [];
      const updated = current.includes(pId)
        ? current.filter((id) => id !== pId)
        : [...current, pId];
      return { ...prev, product_ids: updated };
    });
  };

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.product_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">مدیریت کالکشن‌ها</h2>
          <p className="text-sm text-gray-400">دسته‌بندی و ایجاد مجموعه‌های اختصاصی برای کاتالوگ</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          کالکشن جدید
        </button>
      </div>

      {loadError && (
        <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>
      ) : collections.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 space-y-3">
          <Package size={40} className="mx-auto opacity-50" />
          <p className="font-semibold text-base">هنوز کالکشنی تعریف نشده است</p>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            ایجاد اولین کالکشن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((coll) => (
            <div key={coll.id} className="card p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-white">{coll.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/20 text-accent">
                    {coll.product_count} محصول
                  </span>
                </div>
                {coll.description && (
                  <p className="text-sm text-gray-400 line-clamp-2">{coll.description}</p>
                )}
                <div className="mt-3 text-xs text-gray-500 font-mono">
                  اسلاگ: /collections/{coll.slug}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  onClick={() => openEdit(coll)}
                  className="btn-secondary p-2 text-xs flex items-center gap-1.5"
                >
                  <Edit size={14} />
                  ویرایش
                </button>
                <button
                  onClick={() => handleDelete(coll.id)}
                  className="btn-danger p-2 text-xs flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'ویرایش کالکشن' : 'کالکشن جدید'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">نام کالکشن</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="مثال: کالکشن ارباب حلقه‌ها"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">توضیحات</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field"
                rows={2}
                placeholder="توضیحات مختصر درباره این مجموعه..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-300">
                  انتخاب محصولات کالکشن ({form.product_ids?.length || 0} انتخاب‌شده)
                </label>
              </div>

              {/* Search filter for products */}
              <div className="relative mb-2">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="جستجو بین محصولات..."
                  className="input-field pr-9 text-xs py-1.5"
                />
              </div>

              <div className="max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-xl p-2 space-y-1 bg-[var(--bg-secondary)]">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">محصولی یافت نشد</p>
                ) : (
                  filteredProducts.map((p) => {
                    const isSelected = form.product_ids?.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProductSelection(p.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                          isSelected ? 'bg-accent/20 border border-accent/40 text-white' : 'hover:bg-white/5 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-accent border-accent text-white' : 'border-gray-600'
                          }`}>
                            {isSelected && <Check size={12} />}
                          </div>
                          <span className="truncate">{p.name}</span>
                          {p.product_id && <span className="text-[10px] text-gray-500 font-mono">({p.product_id})</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                انصراف
              </button>
              <button type="submit" className="btn-primary">
                {editing ? 'ذخیره تغییرات' : 'ایجاد کالکشن'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
