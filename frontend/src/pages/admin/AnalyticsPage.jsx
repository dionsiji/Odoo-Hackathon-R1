import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, RefreshCw, FileText } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, CardBody, Spinner, Input, Button } from '../../components/ui';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

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

function Stat({ label, value, sub, icon: Icon, color }) {
  return (
    <Card className="p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-50">{value}</p>
      <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </Card>
  );
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/analytics/overview/'),
      api.get(`/analytics/revenue/?from=${dateRange.from}&to=${dateRange.to}`),
    ]).then(([ov, rv]) => {
      setOverview(ov.data);
      setRevenue(rv.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

  const chartData = revenue?.by_date
    ? Object.entries(revenue.by_date).map(([date, val]) => ({ date: date.slice(5), revenue: Number(val) }))
    : [];

  const methodData = revenue?.by_payment_method
    ? Object.entries(revenue.by_payment_method).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value: Number(value) }))
    : [];

  const subData = overview?.subscriptions
    ? Object.entries(overview.subscriptions)
        .filter(([k]) => k !== 'total')
        .map(([name, value]) => ({ name: name.toUpperCase(), value: Number(value) }))
        .filter((d) => d.value > 0)
    : [];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Revenue and subscription metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.from} onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500" />
          <span className="text-gray-500 text-sm">to</span>
          <input type="date" value={dateRange.to} onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500" />
          <Button size="sm" onClick={load}>Apply</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner size={36} className="text-blue-500" /></div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat label="Total Revenue" value={fmt(overview?.total_revenue_collected)} icon={DollarSign} color="bg-gradient-to-br from-green-500 to-emerald-600" />
            <Stat label="MRR" value={fmt(overview?.mrr)} icon={TrendingUp} color="bg-gradient-to-br from-blue-500 to-blue-600"
              sub={`ARR: ${fmt(overview?.arr)}`} />
            <Stat label="Active Subs" value={overview?.subscriptions?.active ?? '—'} icon={RefreshCw} color="bg-gradient-to-br from-violet-500 to-purple-600"
              sub={`${overview?.subscriptions?.total} total`} />
            <Stat label="Outstanding" value={fmt(overview?.outstanding_receivables)} icon={FileText} color="bg-gradient-to-br from-amber-500 to-orange-600"
              sub={`${overview?.invoices?.overdue ?? 0} overdue`} />
          </div>

          {/* Revenue area chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <p className="text-sm font-semibold text-gray-200">Revenue Over Time</p>
                  <p className="text-xs text-gray-500">{dateRange.from} → {dateRange.to}</p>
                </div>
              </CardHeader>
              <CardBody>
                {chartData.length === 0 ? (
                  <div className="h-56 flex items-center justify-center">
                    <p className="text-sm text-gray-500">No revenue data in this period</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#ag)" name="Revenue" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            {/* Subscription pie chart */}
            <Card>
              <CardHeader>
                <p className="text-sm font-semibold text-gray-200">Subscription Status</p>
              </CardHeader>
              <CardBody>
                {subData.length === 0 ? (
                  <div className="h-56 flex items-center justify-center">
                    <p className="text-sm text-gray-500">No data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={subData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                        {subData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val, name) => [val, name]} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Payment methods bar chart */}
          <Card>
            <CardHeader>
              <p className="text-sm font-semibold text-gray-200">Revenue by Payment Method</p>
            </CardHeader>
            <CardBody>
              {methodData.length === 0 ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-sm text-gray-500">No payment data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={methodData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
