import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Calendar, BookOpen, Save, X, AlertCircle, Upload } from 'lucide-react';
import { getAdminBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost, uploadBlogCover } from '../lib/api';
import Modal from '../components/Modal';

export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    cover_image: '',
    is_published: true,
  });

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      const res = await getAdminBlogPosts();
      setPosts(res.data || []);
      setError(null);
    } catch (e) {
      console.error(e);
      setError('خطا در دریافت لیست مقالات');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingPost(null);
    setFormData({
      title: '',
      slug: '',
      summary: '',
      content: '',
      cover_image: '',
      is_published: true,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function handleOpenEdit(post) {
    setEditingPost(post);
    setFormData({
      title: post.title || '',
      slug: post.slug || '',
      summary: post.summary || '',
      content: post.content || '',
      cover_image: post.cover_image || '',
      is_published: post.is_published ?? true,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleCoverUpload(file) {
    if (!file) return;
    try {
      setUploadingCover(true);
      const res = await uploadBlogCover(file);
      setFormData((prev) => ({ ...prev, cover_image: res.data.url }));
    } catch (err) {
      console.error('Upload failed:', err);
      alert('خطا در آپلود تصویر: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('لطفاً عنوان مقاله را وارد کنید.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      if (editingPost) {
        await updateBlogPost(editingPost.id, formData);
      } else {
        await createBlogPost(formData);
      }

      setModalOpen(false);
      await loadPosts();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'خطا در ذخیره مقاله');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteBlogPost(deleteId);
      setDeleteId(null);
      await loadPosts();
    } catch (err) {
      console.error(err);
      alert('خطا در حذف مقاله');
    } finally {
      setDeleting(false);
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-amber-400" />
            <span>مدیریت مقالات وبلاگ</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ایجاد، ویرایش و مدیریت مقالات منتشرشده و پیش‌نویس‌ها
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--accent, #FF9A3D)' }}
        >
          <Plus size={18} />
          <span>مقاله جدید</span>
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">در حال بارگذاری مقالات...</div>
      ) : error ? (
        <div className="py-8 text-center text-red-400">{error}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 p-8">
          <BookOpen size={36} className="mx-auto mb-3 text-slate-500" />
          <p className="text-base text-white font-medium mb-1">هیچ مقاله‌ای ثبت نشده است</p>
          <p className="text-xs text-slate-400 mb-4">برای ساخت اولین مقاله روی دکمه «مقاله جدید» کلیک کنید.</p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-lg text-sm text-white font-medium"
            style={{ background: 'var(--accent, #FF9A3D)' }}
          >
            ایجاد اولین مقاله
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-slate-900/60 transition-all hover:border-white/10"
            >
              {/* Left: Thumbnail & Info */}
              <div className="flex items-center gap-4 min-w-0">
                {post.cover_image ? (
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-16 h-12 object-cover rounded-lg border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    <BookOpen size={20} />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate text-base">{post.title}</h3>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0 ${
                        post.is_published
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {post.is_published ? 'منتشرشده' : 'پیش‌نویس'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{formatDate(post.created_at)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{post.views || 0} بازدید</span>
                    </span>
                    <span className="truncate text-slate-500">/{post.slug}</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleOpenEdit(post)}
                  className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  title="ویرایش"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => setDeleteId(post.id)}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  title="حذف"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingPost ? 'ویرایش مقاله' : 'مقاله جدید'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان مقاله *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="مثلاً: راهنمای انتخاب فیلامنت مناسب"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">شناسه URL (Slug)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 dir-ltr text-left"
                  placeholder="خالی بگذارید تا خودکار ساخته شود"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">تصویر کاور مقاله</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={formData.cover_image}
                    onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-white/10 bg-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 dir-ltr text-left"
                    placeholder="https://... یا آپلود تصویر"
                  />
                  <label
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80 shrink-0 text-xs font-medium text-white focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2"
                    style={{ background: 'var(--accent, #FF9A3D)' }}
                  >
                    <Upload size={14} />
                    <span>{uploadingCover ? '...' : 'آپلود'}</span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif"
                      className="sr-only"
                      onChange={(e) => handleCoverUpload(e.target.files?.[0])}
                      disabled={uploadingCover}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">خلاصه (توضیح کوتاه برای کارت)</label>
              <textarea
                rows={2}
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
                placeholder="توضیح 1 الی 2 جمله‌ای درباره مقاله"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">متن اصلی مقاله</label>
              <textarea
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 leading-relaxed"
                placeholder="متن مقاله را اینجا بنویسید..."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-white/10"
                />
                <span>انتشار مقاله (نمایش در وبلاگ)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm text-white font-medium"
                  style={{ background: 'var(--accent, #FF9A3D)' }}
                >
                  <Save size={16} />
                  <span>{saving ? 'در حال ذخیره...' : 'ذخیره مقاله'}</span>
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="تأیید حذف مقاله"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              آیا از حذف این مقاله اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
              >
                انصراف
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm text-white font-medium bg-red-600 hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-red-500"
              >
                {deleting ? 'در حال حذف...' : 'حذف این مقاله'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
