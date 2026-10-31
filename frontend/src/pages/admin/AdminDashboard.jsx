import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, Users, RefreshCw, FileText, DollarSign,
  AlertTriangle, Activity, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, CardBody, Spinner, Badge } from '../../components/ui';
import { clsx } from 'clsx';

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, iconColor, sub, trend, loading }) {
  return (
    <Card className="relative overflow-hidden group hover:border-gray-700 transition-colors">
      <div className="px-5 py-5">
        <div className="flex items-start justify-between mb-4">
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              iconColor
            )}
          >
            <Icon size={18} className="text-white" />
          </div>
          {trend !== undefined && (
            <span
              className={clsx(
                'flex items-center gap-1 text-xs font-semibold',
                trend >= 0 ? 'text-green-400' : 'text-red-400'
              )}
            >
              {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        {loading ? (
          <>
            <div className="skeleton h-7 w-28 mb-1.5 rounded" />
            <div className="skeleton h-4 w-20 rounded" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-50">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
          </>
        )}
      </div>
      {/* Gradient accent line */}
      <div className={clsx('absolute bottom-0 left-0 right-0 h-0.5', iconColor)} />
    </Card>
  );
}

// ── Custom Recharts Tooltip ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 shadow-xl text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: ${Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ── Subscription Status Mini-cards ────────────────────────────────────────────
function SubStatusBar({ subs, loading }) {
  const items = [
    { label: 'Active',  key: 'active',  color: 'bg-green-500' },
    { label: 'Paused',  key: 'paused',  color: 'bg-amber-500' },
    { label: 'Draft',   key: 'draft',   color: 'bg-blue-500' },
    { label: 'Closed',  key: 'closed',  color: 'bg-gray-600' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, key, color }) => (
        <div key={key} className="flex flex-col items-center py-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
          <div className={clsx('w-2.5 h-2.5 rounded-full mb-2', color)} />
          {loading ? (
            <div className="skeleton h-6 w-8 rounded mb-1" />
          ) : (
            <p className="text-xl font-bold text-gray-50">{subs?.[key] ?? 0}</p>
          )}
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Invoice Status Bar ─────────────────────────────────────────────────────────
function InvoiceStatusBar({ inv, loading }) {
  const items = [
    { label: 'Paid',     key: 'paid',          badgeVariant: 'success' },
    { label: 'Issued',   key: 'issued',         badgeVariant: 'info' },
    { label: 'Overdue',  key: 'overdue',        badgeVariant: 'danger' },
    { label: 'Draft',    key: 'draft',          badgeVariant: 'neutral' },
    { label: 'Partial',  key: 'partially_paid', badgeVariant: 'warning' },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(({ label, key, badgeVariant }) => (
        <div key={key} className="flex items-center gap-2">
          <Badge variant={badgeVariant}>{label}</Badge>
          {loading ? (
            <div className="skeleton h-4 w-6 rounded" />
          ) : (
            <span className="text-sm font-semibold text-gray-300">{inv?.[key] ?? 0}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    // Overview KPIs
    api.get('/analytics/overview/')
      .then(({ data }) => setOverview(data))
      .catch(() => setOverview(null))
      .finally(() => setLoadingOverview(false));

    // Revenue chart — last 30 days
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    api.get(`/analytics/revenue/?from=${from}&to=${to}`)
      .then(({ data }) => setRevenue(data))
      .catch(() => setRevenue(null))
      .finally(() => setLoadingRevenue(false));

    // Recent activity
    api.get('/activity-logs/')
      .then(({ data }) => {
        const logs = Array.isArray(data) ? data : data.results ?? [];
        setActivityLogs(logs.slice(0, 8));
      })
      .catch(() => setActivityLogs([]))
      .finally(() => setLoadingLogs(false));
  }, []);

  const fmt = (n) =>
    n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  // Build chart data from revenue response
  const chartData = revenue?.by_date
    ? Object.entries(revenue.by_date).map(([date, val]) => ({
        date: date.slice(5), // MM-DD
        revenue: Number(val),
      }))
    : [];

  // Build payment method breakdown
  const methodData = revenue?.by_payment_method
    ? Object.entries(revenue.by_payment_method).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value: Number(value),
      }))
    : [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-50">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Real-time overview of your subscription business</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Revenue Collected"
          value={fmt(overview?.total_revenue_collected)}
          icon={DollarSign}
          iconColor="bg-gradient-to-br from-green-500 to-emerald-600"
          loading={loadingOverview}
        />
        <KpiCard
          label="Monthly Recurring Revenue"
          value={fmt(overview?.mrr)}
          icon={TrendingUp}
          iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
          sub={overview?.arr ? `ARR: ${fmt(overview.arr)}` : null}
          loading={loadingOverview}
        />
        <KpiCard
          label="Active Subscriptions"
          value={overview?.subscriptions?.active ?? '—'}
          icon={RefreshCw}
          iconColor="bg-gradient-to-br from-violet-500 to-purple-600"
          sub={overview ? `${overview.subscriptions?.total} total` : null}
          loading={loadingOverview}
        />
        <KpiCard
          label="Outstanding Receivables"
          value={fmt(overview?.outstanding_receivables)}
          icon={AlertTriangle}
          iconColor="bg-gradient-to-br from-amber-500 to-orange-600"
          sub={overview ? `${overview.invoices?.overdue ?? 0} overdue invoices` : null}
          loading={loadingOverview}
        />
      </div>

      {/* Subscriptions & Invoices overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <div>
              <p className="text-sm font-semibold text-gray-200">Subscriptions</p>
              <p className="text-xs text-gray-500 mt-0.5">Status breakdown</p>
            </div>
            <Link to="/admin/subscriptions" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowUpRight size={13} />
            </Link>
          </CardHeader>
          <CardBody>
            <SubStatusBar subs={overview?.subscriptions} loading={loadingOverview} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <p className="text-sm font-semibold text-gray-200">Invoices</p>
              <p className="text-xs text-gray-500 mt-0.5">{overview?.invoices?.total ?? '—'} total</p>
            </div>
            <Link to="/admin/invoices" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowUpRight size={13} />
            </Link>
          </CardHeader>
          <CardBody>
            <InvoiceStatusBar inv={overview?.invoices} loading={loadingOverview} />
          </CardBody>
        </Card>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Area chart - daily revenue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <p className="text-sm font-semibold text-gray-200">Revenue — Last 30 Days</p>
              <p className="text-xs text-gray-500">Collected payments</p>
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            {loadingRevenue ? (
              <div className="h-48 flex items-center justify-center">
                <Spinner size={24} className="text-blue-500" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-gray-500">No revenue data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" name="Revenue" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Bar chart - payment methods */}
        <Card>
          <CardHeader>
            <div>
              <p className="text-sm font-semibold text-gray-200">By Payment Method</p>
              <p className="text-xs text-gray-500">30-day breakdown</p>
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            {loadingRevenue ? (
              <div className="h-48 flex items-center justify-center">
                <Spinner size={24} className="text-blue-500" />
              </div>
            ) : methodData.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-gray-500">No data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={methodData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-200">Recent Activity</p>
          </div>
          <Link to="/admin/activity" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View all <ArrowUpRight size={13} />
          </Link>
        </CardHeader>
        <div>
          {loadingLogs ? (
            <div className="flex justify-center py-8">
              <Spinner size={22} className="text-blue-500" />
            </div>
          ) : activityLogs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No activity yet</p>
          ) : (
            <ul>
              {activityLogs.map((log, i) => (
                <li
                  key={log.id}
                  className={clsx(
                    'flex items-start gap-3 px-6 py-3 hover:bg-gray-800/50 transition-colors',
                    i < activityLogs.length - 1 && 'border-b border-gray-800'
                  )}
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity size={13} className="text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200">
                      <span className="font-medium">{log.action?.replace(/_/g, ' ')}</span>
                      {log.object_repr && (
                        <span className="text-gray-400"> — {log.object_repr}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {log.actor_email || 'System'} ·{' '}
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
