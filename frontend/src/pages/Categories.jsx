import { useState, useEffect, useCallback } from 'react';
import { Tags, Plus, Trash2, Edit } from 'lucide-react';
import { getCategoriesList, createCategory, updateCategory, deleteCategory } from '../lib/api';
import { Z_INDEX_MODAL } from '../lib/constants';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const handleCloseModal = useCallback(() => setShowModal(false), []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal) handleCloseModal();
    };
    if (showModal) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal, handleCloseModal]);

  const load = async () => {
    try {
      const res = await getCategoriesList();
      setCategories(res.data);
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError('خطا در بارگذاری دسته‌بندی‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await updateCategory(editing.id, form);
      } else {
        await createCategory(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'خطا');
    }
  };

  const handleDelete = async (cat) => {
    const msg = cat.product_count > 0
      ? `«${cat.name}» دارای ${cat.product_count} محصول است. حذف دسته‌بندی، محصولات را بی‌دسته می‌کند. ادامه می‌دهید؟`
      : `آیا از حذف «${cat.name}» مطمئن هستید؟`;
    if (!confirm(msg)) return;
    try {
      await deleteCategory(cat.id);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'خطا');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</span></div>;
  }

  if (loadError) {
    return <div className="flex items-center justify-center h-64"><span style={{ color: '#ef4444' }}>{loadError}</span></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>مدیریت دسته‌بندی‌ها</h2>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> دسته‌بندی جدید
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="card p-12 text-center">
          <Tags size={48} className="mx-auto mb-4" style={{ color: 'var(--border-color)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>هنوز دسته‌بندی‌ای تعریف نشده</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <Tags size={18} />
                </div>
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{cat.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {cat.product_count} محصول
                    {cat.description && ` • ${cat.description}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => openEdit(cat)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  title="ویرایش">
                  <Edit size={15} />
                </button>
                <button onClick={() => handleDelete(cat)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}
                  title="حذف">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay-bg)', direction: 'ltr', zIndex: Z_INDEX_MODAL }}
          role="dialog" aria-modal="true" aria-labelledby="category-modal-title" onClick={handleCloseModal}>
          <div className="card w-full max-w-md p-6 animate-fade-in-scale" style={{ direction: 'rtl' }} onClick={e => e.stopPropagation()}>
            <h3 id="category-modal-title" className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}
            </h3>
            {error && <div className="text-sm mb-3 py-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نام دسته‌بندی</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="input-field" required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>توضیحات (اختیاری)</label>
                <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="input-field" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  {editing ? 'ذخیره' : 'ایجاد'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
