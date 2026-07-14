import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Cog,
  Settings,
  Calculator,
  Store,
  Users,
  Tags,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import BrandLogo from './BrandLogo';

export default function Sidebar({ onLinkClick }) {
  const { isAdmin } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { path: '/products', label: 'محصولات', icon: Package },
    { path: '/categories', label: 'دستهبندیها', icon: Tags },
    { path: '/', label: 'کاتالوگ', icon: Store },
    // Admin only
    ...(isAdmin ? [
      { path: '/materials', label: 'مواد', icon: Layers },
      { path: '/machines', label: 'ماشین‌ها', icon: Cog },
      { path: '/settings', label: 'تنظیمات', icon: Settings },
      { path: '/users', label: 'کاربران', icon: Users },
    ] : []),
    { path: '/calculator', label: 'ماشین حساب', icon: Calculator },
  ];

  return (
    <nav className="flex flex-col h-full overflow-y-auto" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
      {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <BrandLogo height={36}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}>
                    3D
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-base leading-tight">Spaghetti</h2>
                    <p className="text-xs" style={{ color: 'var(--text-sidebar)' }}>قیمت‌گذاری چاپ سه‌بعدی</p>
                  </div>
                </div>
              </BrandLogo>
            </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive ? '' : 'hover:bg-white/5'
              }`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-sidebar)',
            })}
          >
            <item.icon size={18} style={{ color: 'inherit' }} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--text-sidebar)' }}>
          © Spaghetti — سیستم قیمت‌گذاری
        </p>
      </div>
    </nav>
  );
}