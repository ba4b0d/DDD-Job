import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="text-center space-y-4">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-2"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
        >
          <FileQuestion size={40} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
          ۴۰۴
        </h1>
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          صفحه مورد نظر یافت نشد
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          آدرس وارد شده صحیح نیست یا صفحه منتقل شده است
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary mt-4"
        >
          بازگشت به داشبورد
        </button>
      </div>
    </div>
  );
}
