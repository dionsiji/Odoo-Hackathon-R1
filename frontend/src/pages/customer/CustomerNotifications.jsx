import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  XCircle,
  Search,
  Filter,
  Check,
  ArrowUpRight,
  ChevronDown,
  Layers,
  Inbox,
} from 'lucide-react';
import api from '../../lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNotificationDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getNotificationMeta(type) {
  const t = String(type || '').toUpperCase();
  switch (t) {
    case 'INVOICE_ISSUED':
      return {
        label: 'Invoice Issued',
        category: 'Invoices',
        icon: FileText,
        badgeStyle: 'text-blue-700 bg-blue-50 border-blue-200',
        linkTo: '/portal/invoices',
        linkText: 'View Invoice',
      };
    case 'INVOICE_OVERDUE':
      return {
        label: 'Invoice Overdue',
        category: 'Invoices',
        icon: AlertTriangle,
        badgeStyle: 'text-amber-700 bg-amber-50 border-amber-200',
        linkTo: '/portal/invoices',
        linkText: 'Pay Invoice',
      };
    case 'INVOICE_CANCELLED':
      return {
        label: 'Invoice Cancelled',
        category: 'Invoices',
        icon: FileText,
        badgeStyle: 'text-gray-700 bg-gray-50 border-gray-200',
        linkTo: '/portal/invoices',
        linkText: 'View Invoices',
      };
    case 'PAYMENT_RECEIVED':
      return {
        label: 'Payment Settled',
        category: 'Payments',
        icon: CreditCard,
        badgeStyle: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        linkTo: '/portal/payments',
        linkText: 'View Receipt',
      };
    case 'PAYMENT_FAILED':
      return {
        label: 'Payment Failed',
        category: 'Payments',
        icon: AlertCircle,
        badgeStyle: 'text-red-700 bg-red-50 border-red-200',
        linkTo: '/portal/payments',
        linkText: 'Review Payment',
      };
    case 'PAYMENT_REFUNDED':
      return {
        label: 'Payment Refunded',
        category: 'Payments',
        icon: RotateCcw,
        badgeStyle: 'text-purple-700 bg-purple-50 border-purple-200',
        linkTo: '/portal/payments',
        linkText: 'View Payment',
      };
    case 'SUBSCRIPTION_ACTIVATED':
      return {
        label: 'Subscription Active',
        category: 'Subscriptions',
        icon: RefreshCw,
        badgeStyle: 'text-blue-700 bg-blue-50 border-blue-200',
        linkTo: '/portal/subscriptions',
        linkText: 'View Subscription',
      };
    case 'SUBSCRIPTION_RENEWED':
      return {
        label: 'Subscription Renewed',
        category: 'Subscriptions',
        icon: RefreshCw,
        badgeStyle: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        linkTo: '/portal/subscriptions',
        linkText: 'View Subscription',
      };
    case 'SUBSCRIPTION_PAUSED':
      return {
        label: 'Subscription Paused',
        category: 'Subscriptions',
        icon: Clock,
        badgeStyle: 'text-amber-700 bg-amber-50 border-amber-200',
        linkTo: '/portal/subscriptions',
        linkText: 'View Subscription',
      };
    case 'SUBSCRIPTION_CANCELLED':
      return {
        label: 'Subscription Closed',
        category: 'Subscriptions',
        icon: XCircle,
        badgeStyle: 'text-gray-700 bg-gray-50 border-gray-200',
        linkTo: '/portal/subscriptions',
        linkText: 'View Subscriptions',
      };
    case 'QUOTATION_ACCEPTED':
      return {
        label: 'Quotation Accepted',
        category: 'Quotations',
        icon: ShoppingCart,
        badgeStyle: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        linkTo: '/portal/quotations',
        linkText: 'View Quotation',
      };
    case 'GENERAL':
    default:
      return {
        label: 'Notice',
        category: 'General',
        icon: Bell,
        badgeStyle: 'text-slate-700 bg-slate-50 border-slate-200',
        linkTo: null,
        linkText: null,
      };
  }
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function NotificationsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-200 rounded-[10px]" />
        <div className="h-4 w-96 bg-gray-100 rounded-[8px]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs"
          />
        ))}
      </div>

      <div className="h-96 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs" />
    </div>
  );
}

// ── Notification Item Card Component ─────────────────────────────────────────

function NotificationCard({ notification, onMarkRead, markingId }) {
  const meta = getNotificationMeta(notification.notification_type);
  const IconComponent = meta.icon;
  const isUnread = !notification.is_read;
  const isMarkingThis = markingId === notification.id;

  return (
    <div
      className={`rounded-[16px] border transition-all p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start justify-between gap-4 ${
        isUnread
          ? 'bg-[#F9FBFF] border-[#2457D6]/30 border-l-4 border-l-[#2457D6]'
          : 'bg-white border-[#E4E9F2] hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Category Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.badgeStyle}`}
        >
          <IconComponent size={18} />
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${meta.badgeStyle}`}
            >
              {meta.label}
            </span>

            {isUnread && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2457D6] bg-[#EEF3FF] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2457D6] animate-pulse" />
                New
              </span>
            )}

            <span className="text-xs text-[#8A97AD] tabular-nums flex items-center gap-1">
              <Clock size={11} />
              {formatNotificationDate(notification.created_at)}
            </span>
          </div>

          <h4 className="text-sm sm:text-base font-bold text-[#0F1B33]">
            {notification.title}
          </h4>

          <p className="text-xs sm:text-sm text-[#5B6B85] leading-relaxed max-w-2xl">
            {notification.message}
          </p>

          {/* Quick Deep Link */}
          {meta.linkTo && (
            <div className="pt-1">
              <Link
                to={meta.linkTo}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2457D6] hover:underline"
              >
                <span>{meta.linkText}</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Action: Mark as Read Button */}
      {isUnread && (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          disabled={isMarkingThis}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#5B6B85] bg-white border border-[#E4E9F2] hover:text-[#0F1B33] hover:bg-gray-50 transition-colors shadow-2xs self-end sm:self-center shrink-0 cursor-pointer disabled:opacity-50"
          title="Mark as read"
        >
          {isMarkingThis ? (
            <RefreshCw size={12} className="animate-spin text-[#2457D6]" />
          ) : (
            <Check size={12} className="text-[#12A150]" />
          )}
          <span>{isMarkingThis ? 'Updating…' : 'Mark as read'}</span>
        </button>
      )}
    </div>
  );
}

// ── Main Customer Notifications Component ────────────────────────────────────

export default function CustomerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Action states
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  // ── Fetch Notifications ────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.get('/notifications/');
      const rawData = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      setNotifications(rawData);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          'Failed to load notifications. Please check your network and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Mark Single Notification as Read ───────────────────────────────────────

  const handleMarkRead = async (id) => {
    setMarkingId(id);
    try {
      await api.post(`/notifications/${id}/mark-read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    } finally {
      setMarkingId(null);
    }
  };

  // ── Mark All Notifications as Read ─────────────────────────────────────────

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // ── KPI Counts ─────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const invoiceCount = notifications.filter((n) =>
      String(n.notification_type).startsWith('INVOICE')
    ).length;
    const paymentCount = notifications.filter((n) =>
      String(n.notification_type).startsWith('PAYMENT') ||
      String(n.notification_type).startsWith('SUBSCRIPTION')
    ).length;

    return {
      total: notifications.length,
      unread: unreadCount,
      read: notifications.length - unreadCount,
      invoices: invoiceCount,
      paymentsAndSubs: paymentCount,
    };
  }, [notifications]);

  // ── Filtered Notifications ─────────────────────────────────────────────────

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Read / Unread Status Tab
      if (activeTab === 'UNREAD' && n.is_read) return false;
      if (activeTab === 'READ' && !n.is_read) return false;

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        const meta = getNotificationMeta(n.notification_type);
        if (meta.category !== selectedCategory) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = String(n.title || '').toLowerCase().includes(q);
        const msgMatch = String(n.message || '').toLowerCase().includes(q);
        const typeMatch = String(n.notification_type || '').toLowerCase().includes(q);
        return titleMatch || msgMatch || typeMatch;
      }

      return true;
    });
  }, [notifications, activeTab, selectedCategory, searchQuery]);

  // ── Render Loading Skeleton ────────────────────────────────────────────────

  if (loading) {
    return <NotificationsSkeleton />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F1B33] tracking-tight">
            Notifications & Activity
          </h1>
          <p className="text-sm text-[#5B6B85] mt-1">
            Stay informed about invoice issuances, payment receipts, and contract milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {metrics.unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[#EEF3FF] hover:bg-blue-100 text-[#2457D6] text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 size={14} className={markingAll ? 'animate-spin' : ''} />
              <span>{markingAll ? 'Marking all…' : 'Mark all as read'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-xs sm:text-sm font-semibold text-[#0F1B33] hover:bg-[#F7F9FC] shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#2457D6]' : 'text-[#5B6B85]'} />
            <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-[16px] p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#D92D20] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[#B42318]">Error Loading Notifications</h3>
              <p className="text-xs text-[#B42318]/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchNotifications()}
            className="px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#B42318] bg-white border border-[#FECDCA] hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── KPI Metric Strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1: Total */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Total Alerts
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#EEF3FF] flex items-center justify-center text-[#2457D6]">
              <Bell size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {metrics.total}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">Logged event notifications</p>
          </div>
        </div>

        {/* KPI 2: Unread */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Unread
            </span>
            <div
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${
                metrics.unread > 0 ? 'bg-[#FFFAEB] text-[#E8820C]' : 'bg-[#ECFDF3] text-[#12A150]'
              }`}
            >
              {metrics.unread > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {metrics.unread}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">
              {metrics.unread > 0 ? 'Awaiting your attention' : 'All alerts caught up'}
            </p>
          </div>
        </div>

        {/* KPI 3: Invoices */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Billing Alerts
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#EEF3FF] flex items-center justify-center text-[#2457D6]">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {metrics.invoices}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">Invoice issuances & due notices</p>
          </div>
        </div>

        {/* KPI 4: Payments & Subs */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Payments & Subs
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#ECFDF3] flex items-center justify-center text-[#12A150]">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {metrics.paymentsAndSubs}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">Settlements & renewals</p>
          </div>
        </div>
      </div>

      {/* ── Status Filter Tabs & Search Controls ─────────────────────────── */}
      <div className="space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-[#E4E9F2]">
          {[
            { id: 'ALL', label: 'All Notifications', count: metrics.total },
            { id: 'UNREAD', label: 'Unread', count: metrics.unread },
            { id: 'READ', label: 'Archived / Read', count: metrics.read },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-[#2457D6] text-[#2457D6]'
                    : 'border-transparent text-[#5B6B85] hover:text-[#0F1B33] hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono tabular-nums ${
                    isActive ? 'bg-[#EEF3FF] text-[#2457D6]' : 'bg-gray-100 text-[#5B6B85]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filters: Category Dropdown & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A97AD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by title, message, or category..."
              className="w-full pl-10 pr-9 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] placeholder-[#8A97AD] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A97AD] hover:text-[#0F1B33] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-xs sm:text-sm font-semibold text-[#0F1B33] focus:outline-none focus:border-[#2457D6] shadow-2xs cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="Invoices">Invoices & Billing</option>
                <option value="Payments">Payments & Refunds</option>
                <option value="Subscriptions">Subscriptions</option>
                <option value="Quotations">Quotations</option>
                <option value="General">General Notices</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A97AD] pointer-events-none"
              />
            </div>

            {(activeTab !== 'ALL' || selectedCategory !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ALL');
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                }}
                className="px-3 py-2 text-xs font-semibold text-[#D92D20] hover:bg-red-50 rounded-[10px] border border-transparent hover:border-red-100 transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Notifications List Container ─────────────────────────────────── */}
      {notifications.length === 0 ? (
        /* Zero Notifications State */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#EEF3FF] flex items-center justify-center mx-auto mb-4 text-[#2457D6]">
            <Inbox size={28} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#0F1B33]">
            No notifications yet
          </h3>
          <p className="text-xs sm:text-sm text-[#5B6B85] max-w-md mx-auto mt-1.5">
            Your notifications feed is clear. In-app alerts regarding new invoices, payment confirmations, and subscription status updates will appear here.
          </p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* Zero Filter Matches State */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 text-center shadow-xs">
          <Layers size={32} className="mx-auto text-[#8A97AD] mb-2" />
          <p className="text-sm font-semibold text-[#0F1B33]">
            No matching notifications
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            No notifications matched your current filter criteria or search query.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ALL');
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="mt-4 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold text-[#2457D6] bg-[#EEF3FF] hover:bg-blue-100/50 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Render Notifications List */
        <div className="space-y-3.5">
          {filteredNotifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onMarkRead={handleMarkRead}
              markingId={markingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

