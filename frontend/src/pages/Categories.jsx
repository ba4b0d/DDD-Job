import { useState, useEffect, useCallback } from 'react';
import { Tags, Plus, Trash2, Edit } from 'lucide-react';
import { getCategoriesList, getCategoriesFlat, createCategory, updateCategory, deleteCategory } from '../lib/api';
import { Z_INDEX_MODAL } from '../lib/constants';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', parent_id: null });
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
      const [treeRes, flatRes] = await Promise.all([getCategoriesList(), getCategoriesFlat()]);
      setCategories(Array.isArray(treeRes.data) ? treeRes.data : []);
      setFlatCategories(Array.isArray(flatRes.data) ? flatRes.data : []);
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
    setForm({ name: '', description: '', parent_id: null });
    setError('');
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '', parent_id: cat.parent_id || null });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      // Convert empty string to null for parent_id
      if (payload.parent_id === '' || payload.parent_id === '0') payload.parent_id = null;
      if (editing) {
        await updateCategory(editing.id, payload);
      } else {
        await createCategory(payload);
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

  // Flatten tree for display with indentation
  const flattenTree = (nodes, depth = 0) => {
    let result = [];
    for (const n of nodes) {
      result.push({ ...n, depth });
      if (n.children && n.children.length > 0) {
        result = result.concat(flattenTree(n.children, depth + 1));
      }
    }
    return result;
  };

  const flatDisplay = flattenTree(categories);

  // Build parent options (exclude current category and its descendants to prevent loops)
  const parentOptions = flatCategories.filter((c) => {
    if (!editing) return true;
    // When editing, exclude self and descendants
    return c.id !== editing.id;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</span></div>;
  }

  if (loadError) {
    return <div className="flex items-center justify-center h-64"><span style={{ color: '#ef4444' }}>{loadError}</span></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>مدیریت دسته‌بندی‌ها</h2>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> دسته‌بندی جدید
        </button>
      </div>

      {flatDisplay.length === 0 ? (
        <div className="card p-12 text-center">
          <Tags size={48} className="mx-auto mb-4" style={{ color: 'var(--border-color)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>هنوز دسته‌بندی‌ای تعریف نشده</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flatDisplay.map(cat => (
            <div key={cat.id} className="card p-4 flex items-center justify-between" style={cat.depth > 0 ? { marginRight: `${cat.depth * 24}px`, borderRight: '3px solid var(--accent)' } : undefined}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <Tags size={18} />
                </div>
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {cat.depth > 0 && <span style={{ marginLeft: '4px', opacity: 0.5 }}>└</span>}
                    {cat.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {cat.product_count} محصول
                    {cat.parent_name && ` • والد: ${cat.parent_name}`}
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

      {/* Create/Edit modal — uses shared Modal component */}
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
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>دسته‌بندی والد (اختیاری)</label>
                <select value={form.parent_id || ''} onChange={e => setForm({...form, parent_id: e.target.value ? Number(e.target.value) : null})}
                  className="select-field">
                  <option value="">— سطح اصلی —</option>
                  {parentOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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
