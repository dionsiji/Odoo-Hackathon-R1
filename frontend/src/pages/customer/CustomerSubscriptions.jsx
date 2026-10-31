import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Calendar,
  Search,
  Filter,
  Package,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
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

// ── Soft Status Badge Component ──────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();

  let styles = 'bg-slate-100 text-[#5B6B85] border-slate-200';
  let label = s || 'UNKNOWN';

  if (s === 'ACTIVE') {
    styles = 'bg-emerald-50 text-[#12A150] border-emerald-200/70';
    label = 'Active';
  } else if (s === 'PAUSED') {
    styles = 'bg-amber-50 text-[#E8820C] border-amber-200/70';
    label = 'Paused';
  } else if (s === 'CLOSED') {
    styles = 'bg-rose-50 text-[#D92D20] border-rose-200/70';
    label = 'Closed';
  } else if (s === 'DRAFT') {
    styles = 'bg-slate-100 text-[#5B6B85] border-slate-200';
    label = 'Draft';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}
    >
      {label}
    </span>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function SubscriptionsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-200 rounded-[10px]" />
        <div className="h-4 w-96 bg-gray-100 rounded-[8px]" />
      </div>

      {/* KPI strip skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs"
          />
        ))}
      </div>

      {/* Cards list skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs"
          />
        ))}
      </div>
    </div>
  );
}

// ── Subscription Card Component ──────────────────────────────────────────────

function SubscriptionCard({ subscription }) {
  const [expanded, setExpanded] = useState(false);

  // Line items
  const lines = subscription.lines || [];
  const primaryLine = lines[0];

  // Title: Plan name, product name or subscription number
  const title =
    primaryLine?.plan_name ||
    primaryLine?.product_name ||
    subscription.subscription_number;

  // Total recurring amount across all line items
  const totalRecurring = lines.reduce((sum, line) => {
    const lineTotal = Number(line.line_total) || (Number(line.unit_price) * (line.quantity || 1)) || 0;
    return sum + lineTotal;
  }, 0);

  // Cycle Progress
  const billingProgress = useMemo(() => {
    if (!subscription.start_date || !subscription.next_billing_date) return null;
    const start = new Date(subscription.start_date).getTime();
    const next = new Date(subscription.next_billing_date).getTime();
    const now = Date.now();
    if (isNaN(start) || isNaN(next) || next <= start) return null;
    const pct = Math.round(((now - start) / (next - start)) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [subscription.start_date, subscription.next_billing_date]);

  return (
    <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs hover:border-gray-300 transition-all">
      {/* Top Header: Title, Status & Price */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#E4E9F2]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-lg font-bold text-[#0F1B33] tracking-tight">
              {title}
            </h3>
            <StatusBadge status={subscription.status} />
          </div>
          <p className="font-mono text-xs font-semibold text-[#2457D6]">
            {subscription.subscription_number}
          </p>
          {subscription.quotation_number && (
            <p className="text-xs text-[#8A97AD]">
              Source Quotation: <span className="font-mono">{subscription.quotation_number}</span>
            </p>
          )}
        </div>

        <div className="sm:text-right">
          <p className="text-2xl font-bold tabular-nums text-[#0F1B33]">
            {formatCurrency(totalRecurring > 0 ? totalRecurring : primaryLine?.unit_price)}
          </p>
          <p className="text-xs text-[#5B6B85] mt-0.5">Recurring commitment</p>
        </div>
      </div>

      {/* Middle Dates Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 text-xs">
        <div>
          <span className="text-[#8A97AD] block mb-1">Start Date</span>
          <span className="font-semibold text-[#0F1B33] tabular-nums">
            {formatDate(subscription.start_date)}
          </span>
        </div>

        <div>
          <span className="text-[#8A97AD] block mb-1">Next Billing Date</span>
          <span className="font-semibold text-[#0F1B33] tabular-nums">
            {formatDate(subscription.next_billing_date)}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="text-[#8A97AD] block mb-1">Items / Services</span>
          <span className="font-semibold text-[#0F1B33]">
            {lines.length} service line{lines.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Cycle Progress Bar (when dates are available) */}
      {billingProgress !== null && subscription.status === 'ACTIVE' && (
        <div className="py-2">
          <div className="flex justify-between text-[11px] text-[#5B6B85] mb-1 font-medium">
            <span>Current Billing Cycle Progress</span>
            <span className="tabular-nums font-semibold text-[#0F1B33]">{billingProgress}%</span>
          </div>
          <div className="w-full bg-[#F7F9FC] border border-[#E4E9F2] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#2457D6] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${billingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Expandable Line Items Breakdown */}
      {lines.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E4E9F2]">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#2457D6] hover:text-[#1C45AE] transition-colors"
          >
            <span>{expanded ? 'Hide line item details' : `View ${lines.length} line item details`}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FC] border-b border-[#E4E9F2] text-[10px] font-semibold uppercase tracking-wider text-[#8A97AD]">
                  <tr>
                    <th className="px-3 py-2">Plan / Product</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit Price</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E9F2]">
                  {lines.map((line, idx) => (
                    <tr key={line.id || idx} className="hover:bg-gray-50/70">
                      <td className="px-3 py-2.5 font-medium text-[#0F1B33]">
                        {line.plan_name ? `${line.plan_name} (${line.product_name})` : line.product_name}
                      </td>
                      <td className="px-3 py-2.5 text-[#5B6B85] tabular-nums">
                        {line.quantity || 1}
                      </td>
                      <td className="px-3 py-2.5 text-[#5B6B85] tabular-nums">
                        {formatCurrency(line.unit_price)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[#0F1B33] tabular-nums">
                        {formatCurrency(line.line_total || Number(line.unit_price) * (line.quantity || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Customer Subscriptions Page Component ──────────────────────────────

export default function CustomerSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/subscriptions/');
      const list = Array.isArray(data) ? data : data.results ?? [];
      setSubscriptions(list);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Unable to load your subscriptions. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Status counts
  const counts = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter((s) => s.status === 'ACTIVE').length;
    const paused = subscriptions.filter((s) => s.status === 'PAUSED').length;
    const closed = subscriptions.filter((s) => s.status === 'CLOSED').length;
    return { total, active, paused, closed };
  }, [subscriptions]);

  // Total recurring commitment
  const totalCommitment = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === 'ACTIVE')
      .reduce((sum, s) => {
        const linesTotal = (s.lines || []).reduce((lSum, l) => {
          return lSum + (Number(l.line_total) || (Number(l.unit_price) * (l.quantity || 1)) || 0);
        }, 0);
        return sum + linesTotal;
      }, 0);
  }, [subscriptions]);

  // Next upcoming renewal date
  const nextRenewal = useMemo(() => {
    const activeWithDates = subscriptions
      .filter((s) => s.status === 'ACTIVE' && s.next_billing_date)
      .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date));
    return activeWithDates[0]?.next_billing_date || null;
  }, [subscriptions]);

  // Filtered subscriptions list
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      // Status filter
      if (activeFilter !== 'ALL' && s.status !== activeFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numberMatch = s.subscription_number?.toLowerCase().includes(q);
        const lineMatch = (s.lines || []).some(
          (l) =>
            l.plan_name?.toLowerCase().includes(q) ||
            l.product_name?.toLowerCase().includes(q)
        );
        return numberMatch || lineMatch;
      }
      return true;
    });
  }, [subscriptions, activeFilter, searchQuery]);

  if (loading) {
    return <SubscriptionsSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-[#0F1B33]">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F1B33] tracking-tight">
            My Subscriptions
          </h1>
          <p className="text-sm text-[#5B6B85] mt-1">
            Manage and monitor your active recurring services and plans.
          </p>
        </div>

        <Link
          to="/portal/plans"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#2457D6] hover:bg-[#1C45AE] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Package size={15} />
          <span>Browse Available Plans</span>
        </Link>
      </div>

      {/* ── Error Banner with Retry ────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between p-4 rounded-[12px] bg-rose-50 border border-rose-200 text-[#D92D20] text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchSubscriptions}
            className="px-3 py-1.5 rounded-[8px] bg-white border border-rose-200 hover:bg-rose-100/50 text-[#D92D20] text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Summary KPI Strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Active Subscriptions
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#12A150]">
              <Zap size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {counts.active}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            Out of {counts.total} total recorded
          </p>
        </div>

        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Recurring Monthly Commitment
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EEF3FF] flex items-center justify-center text-[#2457D6]">
              <RefreshCw size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {formatCurrency(totalCommitment)}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            Active recurring commitments
          </p>
        </div>

        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Next Renewal Date
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {formatDate(nextRenewal)}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            Earliest renewal billing window
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Status Filter Tabs */}
        <div className="inline-flex items-center p-1 bg-white border border-[#E4E9F2] rounded-[12px] shadow-xs overflow-x-auto">
          {[
            { key: 'ALL', label: `All (${counts.total})` },
            { key: 'ACTIVE', label: `Active (${counts.active})` },
            { key: 'PAUSED', label: `Paused (${counts.paused})` },
            { key: 'CLOSED', label: `Closed (${counts.closed})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-all whitespace-nowrap ${
                activeFilter === tab.key
                  ? 'bg-[#2457D6] text-white shadow-xs'
                  : 'text-[#5B6B85] hover:text-[#0F1B33] hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A97AD]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by number or plan…"
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-[10px] bg-white border border-[#E4E9F2] text-[#0F1B33] placeholder-[#8A97AD] focus:border-[#2457D6] focus:outline-none shadow-xs transition-colors"
          />
        </div>
      </div>

      {/* ── Subscriptions List ─────────────────────────────────────────── */}
      {subscriptions.length === 0 ? (
        /* Empty State: Zero Subscriptions */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-12 text-center shadow-xs flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-[#EEF3FF] text-[#2457D6] flex items-center justify-center mb-3">
            <RefreshCw size={26} />
          </div>
          <h3 className="text-base font-bold text-[#0F1B33]">
            No subscriptions found
          </h3>
          <p className="text-xs text-[#5B6B85] max-w-sm mt-1 mb-6">
            You currently have no active or historical subscription contracts registered on your account.
          </p>
          <Link
            to="/portal/plans"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#2457D6] hover:bg-[#1C45AE] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <span>Explore Available Plans</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        /* Empty Filter State */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 text-center shadow-xs">
          <Layers size={32} className="mx-auto text-[#8A97AD] mb-2" />
          <p className="text-sm font-semibold text-[#0F1B33]">
            No matching subscriptions
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            No subscriptions matched your current filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-4 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold text-[#2457D6] bg-[#EEF3FF] hover:bg-blue-100/50 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Render Subscription Cards */
        <div className="space-y-4">
          {filteredSubscriptions.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

