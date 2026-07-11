import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Edit, Shield, UserCheck, Key } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, changePassword } from '../lib/api';
import { Z_INDEX_MODAL } from '../lib/constants';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'employee' });
  const [newPass, setNewPass] = useState('');
  const [error, setError] = useState('');

  const handleCloseModal = useCallback(() => setShowModal(false), []);
  const handleClosePasswordModal = useCallback(() => setShowPasswordModal(null), []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showPasswordModal) handleClosePasswordModal();
        else if (showModal) handleCloseModal();
      }
    };
    if (showModal || showPasswordModal) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal, showPasswordModal, handleCloseModal, handleClosePasswordModal]);

  const load = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError('خطا در بارگذاری لیست کاربران');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', display_name: '', role: 'employee' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({ username: u.username, password: '', display_name: u.display_name, role: u.role });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingUser) {
        const body = { display_name: form.display_name, role: form.role };
        if (form.password) body.password = form.password;
        await updateUser(editingUser.id, body);
      } else {
        await createUser(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'خطا');
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`آیا از حذف «${u.display_name || u.username}» مطمئن هستید؟`)) return;
    try {
      await deleteUser(u.id);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'خطا');
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    try {
      await changePassword(showPasswordModal.id, newPass);
      setShowPasswordModal(null);
      setNewPass('');
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
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>مدیریت کاربران</h2>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> کاربر جدید
        </button>
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {users.map(u => (
          <div key={u.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: u.role === 'admin' ? 'var(--accent)' : 'var(--bg-tertiary)', color: u.role === 'admin' ? '#fff' : 'var(--text-primary)' }}>
                {u.role === 'admin' ? <Shield size={18} /> : <UserCheck size={18} />}
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {u.display_name || u.username}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  @{u.username} • {u.role === 'admin' ? 'مدیر' : 'کارمند'}
                  {!u.is_active && ' • غیرفعال'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setShowPasswordModal(u); setNewPass(''); }}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                title="تغییر رمز">
                <Key size={15} />
              </button>
              <button onClick={() => openEdit(u)}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                title="ویرایش">
                <Edit size={15} />
              </button>
              {u.username !== 'admin' && (
                <button onClick={() => handleDelete(u)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}
                  title="حذف">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay-bg)', direction: 'ltr', zIndex: Z_INDEX_MODAL }}
          role="dialog" aria-modal="true" aria-labelledby="users-modal-title" onClick={handleCloseModal}>
          <div className="card w-full max-w-md p-6 animate-fade-in-scale" style={{ direction: 'rtl' }} onClick={e => e.stopPropagation()}>
            <h3 id="users-modal-title" className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editingUser ? 'ویرایش کاربر' : 'کاربر جدید'}
            </h3>
            {error && <div className="text-sm mb-3 py-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نام کاربری</label>
                <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  className="input-field" disabled={!!editingUser} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {editingUser ? 'رمز جدید (خالی = بدون تغییر)' : 'رمز عبور'}
                </label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  className="input-field" required={!editingUser} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نام نمایشی</label>
                <input type="text" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نقش</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="select-field">
                  <option value="employee">کارمند (محصولات + دسته‌بندی)</option>
                  <option value="admin">مدیر (دسترسی کامل)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  {editingUser ? 'ذخیره' : 'ایجاد'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password change modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay-bg)', direction: 'ltr', zIndex: Z_INDEX_MODAL }}
          role="dialog" aria-modal="true" aria-labelledby="password-modal-title" onClick={handleClosePasswordModal}>
          <div className="card w-full max-w-sm p-6 animate-fade-in-scale" style={{ direction: 'rtl' }} onClick={e => e.stopPropagation()}>
            <h3 id="password-modal-title" className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              تغییر رمز — {showPasswordModal.username}
            </h3>
            <form onSubmit={handlePassword} className="space-y-3">
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                className="input-field" placeholder="رمز جدید" required autoFocus />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 justify-center">تغییر رمز</button>
                <button type="button" onClick={() => setShowPasswordModal(null)} className="btn-secondary flex-1 justify-center">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
