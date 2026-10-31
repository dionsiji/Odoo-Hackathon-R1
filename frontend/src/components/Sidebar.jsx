import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Users, Package, FileText, CreditCard,
  BarChart3, Activity, Settings, LogOut, ChevronRight,
  Zap, ShoppingCart, Bell, RefreshCw, Upload,
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard',      to: '/admin',               icon: LayoutDashboard },
  { label: 'Customers',      to: '/admin/customers',      icon: Users },
  { label: 'Products',       to: '/admin/products',       icon: Package },
  { label: 'Plans',          to: '/admin/plans',          icon: Zap },
  { label: 'Quotations',     to: '/admin/quotations',     icon: ShoppingCart },
  { label: 'Subscriptions',  to: '/admin/subscriptions',  icon: RefreshCw },
  { label: 'Invoices',       to: '/admin/invoices',       icon: FileText },
  { label: 'Payments',       to: '/admin/payments',       icon: CreditCard },
  { label: 'Analytics',      to: '/admin/analytics',      icon: BarChart3 },
  { label: 'Activity Logs',  to: '/admin/activity',       icon: Activity },
  { label: 'CSV Import',     to: '/admin/import',         icon: Upload },
];

const staffNav = adminNav.filter(
  (n) => !['Analytics', 'CSV Import'].includes(n.label)
);

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
            : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            className={clsx(
              'shrink-0 transition-colors',
              isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
            )}
          />
          <span className="truncate">{label}</span>
          {isActive && (
            <ChevronRight size={14} className="ml-auto text-blue-500" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ role }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const navItems = role === 'ADMIN' ? adminNav : staffNav;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      style={{ width: 'var(--sidebar-w)', minHeight: '100vh' }}
      className="flex flex-col bg-gray-950 border-r border-gray-800 shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-50 leading-none">Brightloop</p>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{role?.toLowerCase()} portal</p>
          </div>
        </div>
        {import.meta.env.DEV && localStorage.getItem('bl_dev_preview') === 'true' && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            PREVIEW
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.to === '/admin'}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-800 px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">
              {user?.full_name || user?.email}
            </p>
            <p className="text-xs text-gray-500 capitalize">{role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
