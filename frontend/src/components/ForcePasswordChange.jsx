import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { changeMyPassword } from '../lib/api';
import Modal from './Modal';

export default function ForcePasswordChange() {
  const { mustChangePassword, passwordChanged, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!mustChangePassword) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('رمز عبور‌ها مطابقت ندارند');
      return;
    }

    setLoading(true);
    try {
      await changeMyPassword(newPassword);
      passwordChanged();
    } catch (err) {
      setError(err.response?.data?.detail || 'خطا در تغییر رمز عبور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={mustChangePassword} onClose={logout} title="تغییر اجباری رمز عبور">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          رمز عبور پیش‌فرض شما باید تغییر کند. لطفاً رمز عبور جدیدی وارد کنید.
        </p>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            رمز عبور جدید
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            placeholder="حداقل ۶ کاراکتر"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            تکرار رمز عبور
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            placeholder="رمز عبور را دوباره وارد کنید"
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            خروج
          </button>
          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {loading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
