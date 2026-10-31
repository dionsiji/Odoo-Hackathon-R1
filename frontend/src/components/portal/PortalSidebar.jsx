import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  RefreshCw,
  FileText,
  CreditCard,
  ShoppingCart,
  Package,
  User,
  Bell,
  LogOut,
  ChevronRight,
  Zap,
  X,
} from 'lucide-react';

const customerNav = [
  { label: 'Dashboard', to: '/portal', icon: LayoutDashboard, end: true },
  { label: 'My Subscriptions', to: '/portal/subscriptions', icon: RefreshCw },
  { label: 'My Invoices', to: '/portal/invoices', icon: FileText },
  { label: 'Payment History', to: '/portal/payments', icon: CreditCard },
  { label: 'Quotations', to: '/portal/quotations', icon: ShoppingCart },
  { label: 'Plans & Catalog', to: '/portal/plans', icon: Package },
  { label: 'My Profile', to: '/portal/profile', icon: User },
  { label: 'Notifications', to: '/portal/notifications', icon: Bell },
];

export default function PortalSidebar({ mobileOpen, onCloseMobile }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2457D6] flex items-center justify-center shadow-md shadow-blue-500/20">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-gray-900 tracking-tight leading-none block">
              Brightloop
            </span>
            <span className="text-xs font-medium text-[#2457D6] block mt-0.5">
              Customer Portal
            </span>
          </div>
        </div>
        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Main Menu
        </div>
        {customerNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-[#2457D6]/10 text-[#2457D6] font-semibold shadow-sm shadow-[#2457D6]/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={clsx(
                      'shrink-0 transition-colors',
                      isActive ? 'text-[#2457D6]' : 'text-gray-400 group-hover:text-gray-600'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="ml-auto text-[#2457D6]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Card & Sign Out */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/70">
        <div className="flex items-center gap-3 p-2 rounded-xl mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2457D6] to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'C'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.full_name || 'Valued Customer'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all border border-gray-200 hover:border-red-200"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 z-30 shadow-sm">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex flex-col w-72 max-w-xs h-full bg-white z-10 shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

