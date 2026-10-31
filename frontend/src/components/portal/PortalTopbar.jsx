import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Menu, User, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

function NotificationsPopover({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/notifications/?unread=1')
      .then(({ data }) => {
        setNotifications(Array.isArray(data) ? data : data.results ?? []);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/notifications/${id}/mark-read/`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // fallback
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications([]);
    } catch {
      // fallback
    }
  };

  const handleItemClick = (notification) => {
    markRead(notification.id, { stopPropagation: () => {} });
    onClose();
    if (notification.object_type === 'Invoice') {
      navigate('/portal/invoices');
    } else if (notification.object_type === 'Subscription') {
      navigate('/portal/subscriptions');
    } else {
      navigate('/portal/notifications');
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50/70 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">Notifications</span>
          {notifications.length > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-[#2457D6] text-white rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-semibold text-[#2457D6] hover:text-blue-800 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#2457D6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-gray-800">You're all caught up</p>
            <p className="text-xs text-gray-500 mt-0.5">No unread notifications at this time.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 leading-snug">{n.title}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : 'Recent'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => markRead(n.id, e)}
                title="Mark as read"
                className="shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-center">
        <Link
          to="/portal/notifications"
          onClick={onClose}
          className="text-xs font-semibold text-[#2457D6] hover:underline"
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );
}

export default function PortalTopbar({ onOpenMobile }) {
  const { user } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    // Check unread count on mount
    api
      .get('/notifications/?unread=1')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results ?? [];
        setUnreadCount(list.length);
      })
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left section: mobile hamburger & portal tag */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="md:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Brightloop Client Space
          </span>
        </div>
      </div>

      {/* Right section: notifications & profile pill */}
      <div className="flex items-center gap-3">
        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotif((v) => !v)}
            className="relative p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2457D6] ring-2 ring-white" />
            )}
          </button>
          {showNotif && (
            <NotificationsPopover
              onClose={() => {
                setShowNotif(false);
                setUnreadCount(0);
              }}
            />
          )}
        </div>

        {/* User profile link */}
        <Link
          to="/portal/profile"
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
        >
          <div className="w-7 h-7 rounded-full bg-[#2457D6]/10 text-[#2457D6] flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-[#2457D6] group-hover:text-white transition-colors">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || <User size={13} />}
          </div>
          <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 max-w-[120px] truncate hidden sm:inline">
            {user?.full_name || 'My Profile'}
          </span>
        </Link>
      </div>
    </header>
  );
}

