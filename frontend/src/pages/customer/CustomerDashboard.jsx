import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  FileText,
  CreditCard,
  AlertCircle,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Calendar,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

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

  let styles = 'bg-slate-100 text-[#5B6B85] border-slate-200/80';
  let label = s || 'UNKNOWN';

  if (['ACTIVE', 'PAID', 'COMPLETED', 'ACCEPTED'].includes(s)) {
    styles = 'bg-emerald-50 text-[#12A150] border-emerald-200/70';
    label = s === 'PAID' ? 'Paid' : s === 'ACTIVE' ? 'Active' : s === 'COMPLETED' ? 'Completed' : 'Accepted';
  } else if (['ISSUED', 'PARTIALLY_PAID', 'PENDING', 'SENT', 'PAUSED'].includes(s)) {
    styles = 'bg-amber-50 text-[#E8820C] border-amber-200/70';
    label = s === 'ISSUED' ? 'Pending' : s === 'PARTIALLY_PAID' ? 'Partially Paid' : s === 'SENT' ? 'Sent' : s === 'PAUSED' ? 'Paused' : 'Pending';
  } else if (['OVERDUE', 'FAILED', 'REJECTED', 'EXPIRED'].includes(s)) {
    styles = 'bg-rose-50 text-[#D92D20] border-rose-200/70';
    label = s === 'OVERDUE' ? 'Overdue' : s === 'FAILED' ? 'Failed' : s === 'REJECTED' ? 'Rejected' : 'Expired';
  } else if (['DRAFT', 'CANCELLED', 'CLOSED', 'VOID', 'REFUNDED'].includes(s)) {
    styles = 'bg-gray-100 text-[#5B6B85] border-gray-200';
    label = s === 'DRAFT' ? 'Draft' : s === 'CANCELLED' ? 'Cancelled' : s === 'CLOSED' ? 'Closed' : s === 'REFUNDED' ? 'Refunded' : s;
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-200 rounded-[10px]" />
        <div className="h-4 w-96 bg-gray-100 rounded-[8px]" />
      </div>

      {/* KPI skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs"
          />
        ))}
      </div>

      {/* Two columns skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs" />
        <div className="h-64 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs" />
      </div>

      {/* Bottom tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs" />
        <div className="h-72 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs" />
      </div>
    </div>
  );
}

// ── Main Customer Dashboard Component ────────────────────────────────────────

export default function CustomerDashboard() {
  const { user } = useAuth();

  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Query all 4 endpoints safely with Promise.allSettled
    Promise.allSettled([
      api.get('/subscriptions/'),
      api.get('/invoices/'),
      api.get('/payments/'),
      api.get('/quotations/'),
    ])
      .then(([subRes, invRes, payRes, quoRes]) => {
        if (!isMounted) return;

        // Subscriptions
        if (subRes.status === 'fulfilled') {
          const data = subRes.value.data;
          setSubscriptions(Array.isArray(data) ? data : data.results ?? []);
        }

        // Invoices
        if (invRes.status === 'fulfilled') {
          const data = invRes.value.data;
          setInvoices(Array.isArray(data) ? data : data.results ?? []);
        }

        // Payments
        if (payRes.status === 'fulfilled') {
          const data = payRes.value.data;
          setPayments(Array.isArray(data) ? data : data.results ?? []);
        }

        // Quotations
        if (quoRes.status === 'fulfilled') {
          const data = quoRes.value.data;
          setQuotations(Array.isArray(data) ? data : data.results ?? []);
        }

        // Check if any major endpoint failed
        const failures = [subRes, invRes, payRes, quoRes].filter(
          (r) => r.status === 'rejected'
        );
        if (failures.length > 0 && failures.length < 4) {
          setErrorNotice('Some secondary dashboard data could not be fetched.');
        } else if (failures.length === 4) {
          setErrorNotice('Unable to load customer dashboard data. Please check your connection.');
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorNotice('An unexpected error occurred while loading your dashboard.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Derived KPI Calculations ─────────────────────────────────────────────

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.status === 'ACTIVE'),
    [subscriptions]
  );

  const pendingAmount = useMemo(() => {
    return invoices
      .filter(
        (inv) =>
          ['ISSUED', 'OVERDUE', 'PARTIALLY_PAID'].includes(inv.status) &&
          Number(inv.amount_due) > 0
      )
      .reduce((sum, inv) => sum + (Number(inv.amount_due) || 0), 0);
  }, [invoices]);

  const overdueInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === 'OVERDUE' && Number(inv.amount_due) > 0),
    [invoices]
  );

  const upcomingInvoice = useMemo(() => {
    const pendingList = invoices
      .filter(
        (inv) =>
          ['ISSUED', 'OVERDUE', 'PARTIALLY_PAID'].includes(inv.status) &&
          Number(inv.amount_due) > 0
      )
      .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
    return pendingList[0] || null;
  }, [invoices]);

  // Current primary subscription for the Hero Card
  const currentSubscription = useMemo(() => {
    return (
      subscriptions.find((s) => s.status === 'ACTIVE') ||
      subscriptions.find((s) => s.status === 'PAUSED') ||
      subscriptions[0] ||
      null
    );
  }, [subscriptions]);

  // Calculate billing progress percentage if valid start_date and next_billing_date exist
  const billingProgress = useMemo(() => {
    if (!currentSubscription?.start_date || !currentSubscription?.next_billing_date) {
      return null;
    }
    const start = new Date(currentSubscription.start_date).getTime();
    const next = new Date(currentSubscription.next_billing_date).getTime();
    const now = Date.now();
    if (isNaN(start) || isNaN(next) || next <= start) return null;
    const pct = Math.round(((now - start) / (next - start)) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [currentSubscription]);

  // Reliable spending history aggregation (only from actual completed payments)
  const monthlySpendingData = useMemo(() => {
    const validPayments = payments.filter(
      (p) => p.status === 'COMPLETED' && (p.paid_at || p.created_at) && Number(p.amount) > 0
    );

    if (validPayments.length < 2) {
      return []; // Omit chart if insufficient data points
    }

    const monthMap = {};
    validPayments.forEach((p) => {
      const date = new Date(p.paid_at || p.created_at);
      if (!isNaN(date.getTime())) {
        const key = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        monthMap[key] = (monthMap[key] || 0) + Number(p.amount);
      }
    });

    const entries = Object.entries(monthMap).map(([month, total]) => ({
      month,
      amount: total,
    }));

    // Only render chart if there are at least two distinct monthly data points
    return entries.length >= 2 ? entries : [];
  }, [payments]);

  // Customer Display Name
  const customerName = user?.full_name || user?.first_name || 'Customer';

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-[#0F1B33]">
      {/* ── Section A: Welcome & Reminder Banner ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F1B33] tracking-tight">
            Welcome back, {customerName}
          </h1>
          <p className="text-sm text-[#5B6B85] mt-1">
            Here's an overview of your subscriptions and billing.
          </p>
        </div>

        {/* Dynamic status pill */}
        <div>
          {overdueInvoices.length > 0 ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] bg-rose-50 border border-rose-200 text-[#D92D20] text-xs font-semibold shadow-xs">
              <ShieldAlert size={15} className="shrink-0" />
              <span>
                {overdueInvoices.length} invoice{overdueInvoices.length > 1 ? 's' : ''} overdue
              </span>
            </div>
          ) : upcomingInvoice ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] bg-[#EEF3FF] border border-[#2457D6]/20 text-[#2457D6] text-xs font-semibold shadow-xs">
              <Clock size={15} className="shrink-0" />
              <span>
                Next payment due {formatDate(upcomingInvoice.due_date)}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] bg-emerald-50 border border-emerald-200 text-[#12A150] text-xs font-semibold shadow-xs">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>All accounts up to date</span>
            </div>
          )}
        </div>
      </div>

      {errorNotice && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-[10px] bg-amber-50 border border-amber-200 text-[#E8820C] text-xs font-medium">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* ── Section B: Four Summary Cards (KPIs) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* 1. Total Subscriptions */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Total Subscriptions
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EEF3FF] flex items-center justify-center text-[#2457D6]">
              <RefreshCw size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {subscriptions.length}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            {activeSubscriptions.length} active service{activeSubscriptions.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* 2. Active Subscriptions */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Active Subscriptions
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#12A150]">
              <Zap size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {activeSubscriptions.length}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            Services currently operational
          </p>
        </div>

        {/* 3. Total Invoices */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Total Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {invoices.length}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            {invoices.filter((i) => i.status === 'PAID').length} paid to date
          </p>
        </div>

        {/* 4. Pending Amount */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Pending Amount
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#E8820C]">
              <CreditCard size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {formatCurrency(pendingAmount)}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            {upcomingInvoice ? `Due ${formatDate(upcomingInvoice.due_date)}` : 'No outstanding dues'}
          </p>
        </div>
      </div>

      {/* ── Section C & D: Current Subscription Hero & Upcoming Payment ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* C. Current Subscription Hero Card (Prominent Blue Gradient) */}
        <div className="bg-gradient-to-br from-[#2457D6] via-[#1E48B8] to-[#163897] text-white rounded-[16px] p-6 shadow-md shadow-blue-500/15 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow element */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                Current Subscription
              </span>
              {currentSubscription && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-xs border border-white/20">
                  {currentSubscription.status}
                </span>
              )}
            </div>

            {currentSubscription ? (
              <>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
                  {currentSubscription.lines?.[0]?.plan_name ||
                    currentSubscription.lines?.[0]?.product_name ||
                    currentSubscription.subscription_number}
                </h3>
                <p className="text-xs text-blue-200 font-mono tracking-wide">
                  {currentSubscription.subscription_number}
                </p>

                {currentSubscription.lines?.[0]?.unit_price && (
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums text-white">
                      {formatCurrency(currentSubscription.lines[0].unit_price)}
                    </span>
                    <span className="text-xs text-blue-200 font-medium">
                      / recurring cycle
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="py-6">
                <p className="text-base font-semibold text-white">
                  No active subscription
                </p>
                <p className="text-xs text-blue-100 mt-1">
                  Explore available products and plans to start your Brightloop subscription.
                </p>
                <Link
                  to="/portal/plans"
                  className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-white text-[#2457D6] text-xs font-semibold hover:bg-blue-50 transition-colors shadow-sm"
                >
                  Browse Plans <ArrowUpRight size={14} />
                </Link>
              </div>
            )}
          </div>

          {currentSubscription && (
            <div className="mt-6 pt-5 border-t border-white/15">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-blue-200 block mb-0.5">Start Date</span>
                  <span className="font-semibold text-white tabular-nums">
                    {formatDate(currentSubscription.start_date)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-200 block mb-0.5">Next Billing</span>
                  <span className="font-semibold text-white tabular-nums">
                    {formatDate(currentSubscription.next_billing_date)}
                  </span>
                </div>
              </div>

              {/* Progress indicator only if dates exist */}
              {billingProgress !== null && (
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-blue-200 mb-1.5 font-medium">
                    <span>Cycle Progress</span>
                    <span className="tabular-nums font-semibold text-white">{billingProgress}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-white h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${billingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* D. Upcoming Payment Card (White Card) */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
                Upcoming Payment
              </span>
              {upcomingInvoice && <StatusBadge status={upcomingInvoice.status} />}
            </div>

            {upcomingInvoice ? (
              <>
                <p className="text-xs text-[#5B6B85] mb-1">
                  Invoice <span className="font-mono text-[#0F1B33] font-semibold">{upcomingInvoice.invoice_number}</span>
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold tabular-nums text-[#0F1B33]">
                    {formatCurrency(upcomingInvoice.amount_due)}
                  </span>
                  <span className="text-xs text-[#5B6B85] font-medium">due</span>
                </div>

                <div className="mt-5 p-3.5 rounded-[10px] bg-[#F7F9FC] border border-[#E4E9F2] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#5B6B85]">
                    <Calendar size={15} className="text-[#2457D6]" />
                    <span>Payment Due Date</span>
                  </div>
                  <span className="font-semibold text-[#0F1B33] tabular-nums">
                    {formatDate(upcomingInvoice.due_date)}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#12A150] flex items-center justify-center mb-2.5">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-sm font-semibold text-[#0F1B33]">
                  All payments cleared
                </h4>
                <p className="text-xs text-[#5B6B85] max-w-xs mt-1">
                  You have no pending invoices or outstanding balances due at this time.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#E4E9F2] flex items-center justify-between">
            <span className="text-xs text-[#8A97AD]">
              {upcomingInvoice ? 'Need to review or download PDF?' : 'View invoice history'}
            </span>
            <Link
              to="/portal/invoices"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2457D6] hover:text-[#1C45AE] transition-colors"
            >
              <span>{upcomingInvoice ? 'Go to Invoices' : 'View all invoices'}</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section H: Spending Trend Chart (Only rendered if sufficient data) ── */}
      {monthlySpendingData.length >= 2 && (
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#0F1B33]">
                Payment History Trend
              </h2>
              <p className="text-xs text-[#5B6B85] mt-0.5">
                Monthly completed payments over time
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#12A150] font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <TrendingUp size={13} />
              <span>Verified Ledger</span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpendingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2457D6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2457D6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E9F2" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#8A97AD' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#8A97AD' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Total Paid']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E4E9F2',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#2457D6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Section E: Recent Invoices Table ────────────────────────────── */}
      <div className="bg-white border border-[#E4E9F2] rounded-[16px] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E4E9F2] flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#0F1B33]">
              Recent Invoices
            </h2>
            <p className="text-xs text-[#5B6B85] mt-0.5">
              Latest invoices issued to your account
            </p>
          </div>
          <Link
            to="/portal/invoices"
            className="text-xs font-semibold text-[#2457D6] hover:text-[#1C45AE] flex items-center gap-1 transition-colors"
          >
            <span>View all invoices</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={32} className="mx-auto text-[#8A97AD] mb-2" />
            <p className="text-sm font-semibold text-[#0F1B33]">No invoices found</p>
            <p className="text-xs text-[#5B6B85] mt-1">Invoices will appear here once generated.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F9FC] border-b border-[#E4E9F2] text-[11px] font-semibold uppercase tracking-wider text-[#8A97AD]">
                <tr>
                  <th className="px-6 py-3">Invoice Number</th>
                  <th className="px-6 py-3">Issue Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E9F2]">
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs font-semibold text-[#2457D6]">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-[#5B6B85] tabular-nums">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-[#5B6B85] tabular-nums">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-[#0F1B33] tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section F & G: Recent Payments & Quotations ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* F. Recent Payments */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-[#E4E9F2] flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-[#0F1B33]">
                  Recent Payments
                </h2>
                <p className="text-xs text-[#5B6B85] mt-0.5">
                  Latest recorded payment transactions
                </p>
              </div>
              <Link
                to="/portal/payments"
                className="text-xs font-semibold text-[#2457D6] hover:text-[#1C45AE] flex items-center gap-1 transition-colors"
              >
                <span>View history</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center">
                <CreditCard size={30} className="mx-auto text-[#8A97AD] mb-2" />
                <p className="text-sm font-semibold text-[#0F1B33]">No payment records</p>
                <p className="text-xs text-[#5B6B85] mt-1">Payment receipts will display here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E4E9F2]">
                {payments.slice(0, 4).map((p) => (
                  <div key={p.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                    <div>
                      <p className="text-xs font-mono font-semibold text-[#0F1B33]">
                        {p.transaction_ref}
                      </p>
                      <p className="text-[11px] text-[#8A97AD] mt-0.5">
                        {p.payment_method ? String(p.payment_method).replace(/_/g, ' ') : 'Standard'} • {formatDate(p.paid_at || p.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#0F1B33] tabular-nums">
                        {formatCurrency(p.amount)}
                      </p>
                      <div className="mt-0.5">
                        <StatusBadge status={p.status || 'COMPLETED'} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* G. Recent Quotations */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-[#E4E9F2] flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-[#0F1B33]">
                  Recent Quotations
                </h2>
                <p className="text-xs text-[#5B6B85] mt-0.5">
                  Proposals and quotations issued to you
                </p>
              </div>
              <Link
                to="/portal/quotations"
                className="text-xs font-semibold text-[#2457D6] hover:text-[#1C45AE] flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {quotations.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart size={30} className="mx-auto text-[#8A97AD] mb-2" />
                <p className="text-sm font-semibold text-[#0F1B33]">No quotations</p>
                <p className="text-xs text-[#5B6B85] mt-1">Quotations prepared for you will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E4E9F2]">
                {quotations.slice(0, 4).map((q) => (
                  <div key={q.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                    <div>
                      <p className="text-xs font-mono font-semibold text-[#2457D6]">
                        {q.quotation_number}
                      </p>
                      <p className="text-[11px] text-[#8A97AD] mt-0.5">
                        Issued {formatDate(q.issue_date)} {q.expiry_date ? `• Valid till ${formatDate(q.expiry_date)}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#0F1B33] tabular-nums">
                        {formatCurrency(q.total_amount)}
                      </p>
                      <div className="mt-0.5">
                        <StatusBadge status={q.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

