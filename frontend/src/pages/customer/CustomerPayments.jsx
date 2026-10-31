import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Copy,
  Check,
  ArrowUpRight,
  Zap,
  Calendar,
} from 'lucide-react';
import api from '../../lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val) {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
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

// ── Payment Method Helper ────────────────────────────────────────────────────

function getMethodMeta(method) {
  const m = String(method || '').toUpperCase();
  switch (m) {
    case 'CREDIT_CARD':
      return {
        label: 'Credit Card',
        icon: CreditCard,
        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200/70',
      };
    case 'BANK_TRANSFER':
      return {
        label: 'Bank Transfer',
        icon: Layers,
        badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
      };
    case 'MOCK_GATEWAY':
      return {
        label: 'Online Gateway',
        icon: Zap,
        badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200/70',
      };
    case 'CASH':
      return {
        label: 'Cash',
        icon: FileText,
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      };
    case 'MANUAL':
    default:
      return {
        label: 'Manual / Direct',
        icon: FileText,
        badgeStyle: 'bg-slate-50 text-slate-700 border-slate-200/70',
      };
  }
}

// ── Soft Status Badge Component ──────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();

  let styles = 'bg-slate-100 text-[#5B6B85] border-slate-200';
  let label = s || 'Unknown';
  let dotColor = 'bg-[#8A97AD]';

  if (s === 'COMPLETED') {
    styles = 'bg-[#ECFDF3] text-[#027A48] border-[#D1FADF]';
    label = 'Completed';
    dotColor = 'bg-[#12A150]';
  } else if (s === 'PENDING') {
    styles = 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]';
    label = 'Pending';
    dotColor = 'bg-[#E8820C]';
  } else if (s === 'REFUNDED') {
    styles = 'bg-[#F4F3FF] text-[#5925DC] border-[#D9D6FE]';
    label = 'Refunded';
    dotColor = 'bg-[#5925DC]';
  } else if (s === 'FAILED') {
    styles = 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]';
    label = 'Failed';
    dotColor = 'bg-[#D92D20]';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function PaymentsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
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

// ── Payment Row / Card Component ─────────────────────────────────────────────

function PaymentItem({ payment }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const methodMeta = getMethodMeta(payment.payment_method);
  const MethodIcon = methodMeta.icon;

  const handleCopyRef = (e) => {
    e.stopPropagation();
    if (payment.transaction_ref) {
      navigator.clipboard?.writeText(payment.transaction_ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white border border-[#E4E9F2] rounded-[16px] shadow-xs hover:border-gray-300 transition-all overflow-hidden">
      {/* Summary Row */}
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Column: Reference, Status & Invoice */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleCopyRef}
              title="Click to copy transaction reference"
              className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold text-[#2457D6] bg-[#EEF3FF] px-2.5 py-1 rounded-[8px] hover:bg-blue-100/70 transition-colors cursor-pointer group"
            >
              <span>{payment.transaction_ref || `PAY-#${payment.id}`}</span>
              {copied ? (
                <Check size={12} className="text-[#12A150]" />
              ) : (
                <Copy size={12} className="text-[#2457D6] opacity-70 group-hover:opacity-100" />
              )}
            </button>

            <StatusBadge status={payment.status} />

            {/* Payment Method Pill */}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-md border ${methodMeta.badgeStyle}`}
            >
              <MethodIcon size={12} />
              {methodMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#5B6B85] flex-wrap">
            {/* Linked Invoice */}
            {payment.invoice_number ? (
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} className="text-[#8A97AD]" />
                <span>Invoice:</span>
                <Link
                  to="/portal/invoices"
                  className="font-medium text-[#2457D6] hover:underline"
                >
                  {payment.invoice_number}
                </Link>
              </span>
            ) : payment.invoice ? (
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} className="text-[#8A97AD]" />
                <span>Invoice ID:</span>
                <strong className="text-[#0F1B33]">#{payment.invoice}</strong>
              </span>
            ) : null}

            {/* Paid / Timestamp */}
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-[#8A97AD]" />
              <span>
                Processed:{' '}
                <strong className="text-[#0F1B33] tabular-nums">
                  {formatDateTime(payment.paid_at || payment.created_at)}
                </strong>
              </span>
            </span>

            {/* Notes preview if available */}
            {payment.notes && (
              <span className="text-[#8A97AD] truncate max-w-xs hidden sm:inline" title={payment.notes}>
                Note: <span className="text-[#5B6B85] italic">{payment.notes}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Amount & Expansion Trigger */}
        <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E4E9F2]">
          <div className="text-left lg:text-right">
            <div className="text-xs font-medium text-[#5B6B85] uppercase tracking-wider">
              {payment.status === 'REFUNDED' ? 'Refunded Amount' : 'Amount Paid'}
            </div>
            <div
              className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
                payment.status === 'REFUNDED'
                  ? 'text-[#5925DC]'
                  : payment.status === 'FAILED'
                  ? 'text-[#D92D20]'
                  : 'text-[#0F1B33]'
              }`}
            >
              {payment.status === 'REFUNDED' ? `-${formatCurrency(payment.amount)}` : formatCurrency(payment.amount)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-[8px] border border-[#E4E9F2] hover:bg-[#F7F9FC] text-[#5B6B85] hover:text-[#0F1B33] transition-colors cursor-pointer"
            title={expanded ? 'Collapse details' : 'View full details'}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {expanded && (
        <div className="bg-[#F7F9FC] border-t border-[#E4E9F2] p-5 sm:p-6 space-y-4 animate-fade-in text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Reference */}
            <div className="bg-white p-3.5 rounded-[12px] border border-[#E4E9F2] shadow-2xs">
              <span className="text-xs text-[#8A97AD] block">Transaction Reference</span>
              <span className="font-mono font-bold text-[#0F1B33] text-xs sm:text-sm break-all">
                {payment.transaction_ref || '—'}
              </span>
            </div>

            {/* Method */}
            <div className="bg-white p-3.5 rounded-[12px] border border-[#E4E9F2] shadow-2xs">
              <span className="text-xs text-[#8A97AD] block">Payment Channel</span>
              <span className="font-semibold text-[#0F1B33] text-sm flex items-center gap-1.5 mt-0.5">
                <MethodIcon size={14} className="text-[#2457D6]" />
                {methodMeta.label}
              </span>
            </div>

            {/* Date Settled */}
            <div className="bg-white p-3.5 rounded-[12px] border border-[#E4E9F2] shadow-2xs">
              <span className="text-xs text-[#8A97AD] block">Date & Time</span>
              <span className="font-medium text-[#0F1B33] text-sm tabular-nums">
                {formatDateTime(payment.paid_at || payment.created_at)}
              </span>
            </div>

            {/* Associated Invoice */}
            <div className="bg-white p-3.5 rounded-[12px] border border-[#E4E9F2] shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-xs text-[#8A97AD] block">Billed Invoice</span>
                <span className="font-semibold text-[#0F1B33] text-sm">
                  {payment.invoice_number || (payment.invoice ? `#${payment.invoice}` : '—')}
                </span>
              </div>
              <Link
                to="/portal/invoices"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2457D6] hover:underline mt-1"
              >
                Go to Invoices <ArrowUpRight size={11} />
              </Link>
            </div>
          </div>

          {/* Notes Callout */}
          {payment.notes ? (
            <div className="bg-white p-4 rounded-[12px] border border-[#E4E9F2] shadow-2xs">
              <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider block mb-1">
                Transaction Notes & Reference
              </span>
              <p className="text-sm text-[#0F1B33] whitespace-pre-line">
                {payment.notes}
              </p>
            </div>
          ) : (
            <div className="text-xs text-[#8A97AD] italic">
              No additional transaction notes or gateway remarks recorded for this payment.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Customer Payments Component ─────────────────────────────────────────

export default function CustomerPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [activeMethod, setActiveMethod] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Fetch Payments ──────────────────────────────────────────────────────────

  const fetchPayments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.get('/payments/');
      const rawData = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      setPayments(rawData);
    } catch (err) {
      console.error('Failed to load customer payments:', err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          'Failed to load payment history. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // ── Financial KPI Metrics ───────────────────────────────────────────────────

  const metrics = useMemo(() => {
    let totalPaid = 0;
    let completedCount = 0;
    let refundedAmount = 0;
    let refundedCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      const st = String(p.status || '').toUpperCase();

      if (st === 'COMPLETED') {
        totalPaid += amt;
        completedCount += 1;
      } else if (st === 'REFUNDED') {
        refundedAmount += amt;
        refundedCount += 1;
      } else if (st === 'PENDING') {
        pendingAmount += amt;
        pendingCount += 1;
      }
    });

    return {
      totalPaid,
      completedCount,
      refundedAmount,
      refundedCount,
      pendingAmount,
      pendingCount,
      totalCount: payments.length,
    };
  }, [payments]);

  // ── Filtered & Searched Payments ───────────────────────────────────────────

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Status Filter
      if (activeStatus !== 'ALL') {
        const s = String(p.status || '').toUpperCase();
        if (s !== activeStatus) return false;
      }

      // 2. Method Filter
      if (activeMethod !== 'ALL') {
        const m = String(p.payment_method || '').toUpperCase();
        if (m !== activeMethod) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const refMatch = String(p.transaction_ref || '').toLowerCase().includes(q);
        const invMatch = String(p.invoice_number || '').toLowerCase().includes(q);
        const notesMatch = String(p.notes || '').toLowerCase().includes(q);
        const methodMatch = String(p.payment_method || '').toLowerCase().includes(q);
        return refMatch || invMatch || notesMatch || methodMatch;
      }

      return true;
    });
  }, [payments, activeStatus, activeMethod, searchQuery]);

  // Status Tab List with dynamic counts
  const statusTabs = useMemo(() => {
    const counts = {
      ALL: payments.length,
      COMPLETED: payments.filter((p) => String(p.status).toUpperCase() === 'COMPLETED').length,
      PENDING: payments.filter((p) => String(p.status).toUpperCase() === 'PENDING').length,
      REFUNDED: payments.filter((p) => String(p.status).toUpperCase() === 'REFUNDED').length,
      FAILED: payments.filter((p) => String(p.status).toUpperCase() === 'FAILED').length,
    };

    return [
      { id: 'ALL', label: 'All Payments', count: counts.ALL },
      { id: 'COMPLETED', label: 'Completed', count: counts.COMPLETED },
      { id: 'PENDING', label: 'Pending', count: counts.PENDING },
      { id: 'REFUNDED', label: 'Refunded', count: counts.REFUNDED },
      ...(counts.FAILED > 0 ? [{ id: 'FAILED', label: 'Failed', count: counts.FAILED }] : []),
    ];
  }, [payments]);

  // ── Render Loading Skeleton ────────────────────────────────────────────────

  if (loading) {
    return <PaymentsSkeleton />;
  }

  // ── Main Page Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F1B33] tracking-tight">
            Payment History
          </h1>
          <p className="text-sm text-[#5B6B85] mt-1">
            Review all transaction records, payment methods, receipts, and refund statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchPayments(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm font-semibold text-[#0F1B33] hover:bg-[#F7F9FC] shadow-2xs transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#2457D6]' : 'text-[#5B6B85]'} />
          <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-[16px] p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#D92D20] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[#B42318]">Error Loading Payments</h3>
              <p className="text-xs text-[#B42318]/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchPayments()}
            className="px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#B42318] bg-white border border-[#FECDCA] hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Financial KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1: Total Paid */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Total Settled
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#ECFDF3] flex items-center justify-center text-[#12A150]">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {formatCurrency(metrics.totalPaid)}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">
              Across <strong className="text-[#0F1B33]">{metrics.completedCount}</strong> successful transaction{metrics.completedCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* KPI 2: Successful Payments */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Successful Payments
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#EEF3FF] flex items-center justify-center text-[#2457D6]">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {metrics.completedCount}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">
              {metrics.totalCount > 0
                ? `${Math.round((metrics.completedCount / metrics.totalCount) * 100)}% settlement success rate`
                : 'No transactions yet'}
            </p>
          </div>
        </div>

        {/* KPI 3: Refunded Amount */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Total Refunded
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#F4F3FF] flex items-center justify-center text-[#5925DC]">
              <RotateCcw size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#5925DC] tabular-nums">
              {formatCurrency(metrics.refundedAmount)}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">
              {metrics.refundedCount > 0
                ? `${metrics.refundedCount} reversed transaction${metrics.refundedCount === 1 ? '' : 's'}`
                : 'Zero refunds recorded'}
            </p>
          </div>
        </div>

        {/* KPI 4: Pending / Processing */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Pending / In Review
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FFFAEB] flex items-center justify-center text-[#E8820C]">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {formatCurrency(metrics.pendingAmount)}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">
              {metrics.pendingCount > 0
                ? `${metrics.pendingCount} transaction awaiting confirmation`
                : 'All transactions settled'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Search Controls ─────────────────────────────────── */}
      <div className="space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-[#E4E9F2]">
          {statusTabs.map((tab) => {
            const isActive = activeStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStatus(tab.id)}
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

        {/* Secondary Filters: Method & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A97AD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by transaction reference, invoice #, notes, or method..."
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

          {/* Payment Method Dropdown Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={activeMethod}
                onChange={(e) => setActiveMethod(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-xs sm:text-sm font-semibold text-[#0F1B33] focus:outline-none focus:border-[#2457D6] shadow-2xs cursor-pointer"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="MOCK_GATEWAY">Online Gateway</option>
                <option value="CASH">Cash</option>
                <option value="MANUAL">Manual / Direct</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A97AD] pointer-events-none"
              />
            </div>

            {(activeStatus !== 'ALL' || activeMethod !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setActiveStatus('ALL');
                  setActiveMethod('ALL');
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

      {/* ── Payments List / Table Container ──────────────────────────────── */}
      {payments.length === 0 ? (
        /* Empty State: Zero Total Payments */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#EEF3FF] flex items-center justify-center mx-auto mb-4 text-[#2457D6]">
            <CreditCard size={28} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#0F1B33]">
            No payment history yet
          </h3>
          <p className="text-xs sm:text-sm text-[#5B6B85] max-w-md mx-auto mt-1.5">
            When you settle your pending invoices, your transaction receipts, references, and audit logs will be permanently listed here.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/portal/invoices"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs sm:text-sm font-semibold text-white bg-[#2457D6] hover:bg-[#1C45AE] shadow-xs transition-colors"
            >
              <span>View Unpaid Invoices</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      ) : filteredPayments.length === 0 ? (
        /* Empty State: Filters Returned Zero Results */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 text-center shadow-xs">
          <Layers size={32} className="mx-auto text-[#8A97AD] mb-2" />
          <p className="text-sm font-semibold text-[#0F1B33]">
            No matching payment transactions
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            No payments matched your current filter and search criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveStatus('ALL');
              setActiveMethod('ALL');
              setSearchQuery('');
            }}
            className="mt-4 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold text-[#2457D6] bg-[#EEF3FF] hover:bg-blue-100/50 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Render Payment Items */
        <div className="space-y-4">
          {filteredPayments.map((p) => (
            <PaymentItem key={p.id} payment={p} />
          ))}
        </div>
      )}
    </div>
  );
}

