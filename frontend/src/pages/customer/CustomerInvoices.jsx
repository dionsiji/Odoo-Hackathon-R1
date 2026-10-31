import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  CreditCard,
  Layers,
  ArrowUpRight,
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

  if (s === 'PAID') {
    styles = 'bg-emerald-50 text-[#12A150] border-emerald-200/70';
    label = 'Paid';
  } else if (s === 'ISSUED') {
    styles = 'bg-amber-50 text-[#E8820C] border-amber-200/70';
    label = 'Pending';
  } else if (s === 'PARTIALLY_PAID') {
    styles = 'bg-amber-50 text-[#E8820C] border-amber-200/70';
    label = 'Partially Paid';
  } else if (s === 'OVERDUE') {
    styles = 'bg-rose-50 text-[#D92D20] border-rose-200/70';
    label = 'Overdue';
  } else if (s === 'DRAFT') {
    styles = 'bg-slate-100 text-[#5B6B85] border-slate-200';
    label = 'Draft';
  } else if (s === 'VOID' || s === 'CANCELLED') {
    styles = 'bg-gray-100 text-[#8A97AD] border-gray-200';
    label = s === 'VOID' ? 'Void' : 'Cancelled';
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

function InvoicesSkeleton() {
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

// ── Invoice Row / Card Component ─────────────────────────────────────────────

function InvoiceItem({ invoice, onDownload, isDownloading }) {
  const [expanded, setExpanded] = useState(false);
  const lines = invoice.lines || [];

  return (
    <div className="bg-white border border-[#E4E9F2] rounded-[16px] shadow-xs hover:border-gray-300 transition-all overflow-hidden">
      {/* Main summary row */}
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Column: Number, Status & Dates */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-bold text-[#2457D6]">
              {invoice.invoice_number}
            </span>
            <StatusBadge status={invoice.status} />
            {invoice.billing_cycle_start && invoice.billing_cycle_end && (
              <span className="text-[11px] font-medium text-[#8A97AD] bg-[#F7F9FC] px-2 py-0.5 rounded-md border border-[#E4E9F2]">
                Cycle: {formatDate(invoice.billing_cycle_start)} – {formatDate(invoice.billing_cycle_end)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-[#5B6B85] flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-[#8A97AD]" />
              <span>Issued: <strong className="text-[#0F1B33] tabular-nums">{formatDate(invoice.issue_date)}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} className="text-[#8A97AD]" />
              <span>Due: <strong className="text-[#0F1B33] tabular-nums">{formatDate(invoice.due_date)}</strong></span>
            </span>
            <span>
              {lines.length} item{lines.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Right Column: Financial Amounts & Action */}
        <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E4E9F2]">
          {/* Amount Paid / Amount Due breakdown */}
          <div className="text-left lg:text-right">
            <p className="text-lg font-bold tabular-nums text-[#0F1B33]">
              {formatCurrency(invoice.total_amount)}
            </p>
            <div className="text-xs flex items-center lg:justify-end gap-2 mt-0.5">
              {Number(invoice.amount_paid) > 0 && (
                <span className="text-[#12A150] font-medium">
                  Paid {formatCurrency(invoice.amount_paid)}
                </span>
              )}
              {Number(invoice.amount_due) > 0 ? (
                <span className="font-semibold text-[#D92D20]">
                  Due {formatCurrency(invoice.amount_due)}
                </span>
              ) : (
                <span className="text-[#12A150] font-medium">Cleared</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Download PDF button */}
            <button
              type="button"
              onClick={() => onDownload(invoice.id, invoice.invoice_number)}
              disabled={isDownloading}
              title="Download official PDF invoice"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white border border-[#E4E9F2] hover:bg-[#EEF3FF] hover:border-[#2457D6]/30 text-[#2457D6] text-xs font-semibold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <Download size={14} className={isDownloading ? 'animate-bounce' : ''} />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Toggle line items detail */}
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="p-2 rounded-[10px] bg-[#F7F9FC] border border-[#E4E9F2] hover:bg-gray-100 text-[#5B6B85] hover:text-[#0F1B33] transition-colors"
                title={expanded ? 'Hide details' : 'View details'}
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable line items breakdown */}
      {expanded && lines.length > 0 && (
        <div className="px-5 pb-5 pt-3 bg-[#F7F9FC]/70 border-t border-[#E4E9F2]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A97AD] mb-2.5">
            Invoice Line Items Snapshot
          </p>
          <div className="overflow-x-auto bg-white rounded-[12px] border border-[#E4E9F2]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FC] border-b border-[#E4E9F2] text-[10px] font-semibold uppercase tracking-wider text-[#8A97AD]">
                <tr>
                  <th className="px-4 py-2.5">Item Description</th>
                  <th className="px-4 py-2.5">Qty</th>
                  <th className="px-4 py-2.5">Unit Price</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E9F2]">
                {lines.map((line, idx) => (
                  <tr key={line.id || idx} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#0F1B33]">
                        {line.plan_name || line.product_name || line.description || 'Service Item'}
                      </p>
                      {line.description && line.description !== line.product_name && (
                        <p className="text-[11px] text-[#5B6B85] mt-0.5">{line.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#5B6B85] tabular-nums">
                      {line.quantity || 1}
                    </td>
                    <td className="px-4 py-3 text-[#5B6B85] tabular-nums">
                      {formatCurrency(line.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0F1B33] tabular-nums">
                      {formatCurrency(line.line_total || Number(line.unit_price) * (line.quantity || 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal, Tax, Discount summary block */}
          <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-[#5B6B85] px-1">
            <div className="space-y-1">
              {invoice.notes && (
                <p className="text-[11px] text-[#8A97AD]">
                  <strong className="text-[#5B6B85]">Note:</strong> {invoice.notes}
                </p>
              )}
              {invoice.terms && (
                <p className="text-[11px] text-[#8A97AD]">
                  <strong className="text-[#5B6B85]">Terms:</strong> {invoice.terms}
                </p>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-1 self-end bg-white p-3 rounded-[10px] border border-[#E4E9F2]">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8A97AD]">Subtotal:</span>
                <span className="font-semibold text-[#0F1B33] tabular-nums">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-[11px] text-[#E8820C]">
                  <span>Discount {invoice.discount_details?.code ? `(${invoice.discount_details.code})` : ''}:</span>
                  <span className="tabular-nums">- {formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {Number(invoice.tax_amount) > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A97AD]">Tax {invoice.tax_rate_details?.name ? `(${invoice.tax_rate_details.name})` : ''}:</span>
                  <span className="font-semibold text-[#0F1B33] tabular-nums">+ {formatCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-[#E4E9F2] text-[#0F1B33]">
                <span>Total:</span>
                <span className="tabular-nums">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Customer Invoices Component ─────────────────────────────────────────

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/invoices/');
      const list = Array.isArray(data) ? data : data.results ?? [];
      setInvoices(list);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Unable to load your invoices. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle PDF Download
  const handleDownloadPDF = async (id, invoiceNumber) => {
    setDownloadingId(id);
    try {
      const response = await api.get(`/invoices/${id}/pdf/`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice_${invoiceNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Unable to download PDF. Please try again or contact support.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Financial KPIs
  const kpis = useMemo(() => {
    const totalInvoiced = invoices.reduce(
      (sum, inv) => sum + (Number(inv.total_amount) || 0),
      0
    );
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + (Number(inv.amount_paid) || 0),
      0
    );
    const totalDue = invoices.reduce(
      (sum, inv) => sum + (Number(inv.amount_due) || 0),
      0
    );
    const overdueCount = invoices.filter(
      (inv) => inv.status === 'OVERDUE' && Number(inv.amount_due) > 0
    ).length;

    return { totalInvoiced, totalPaid, totalDue, overdueCount };
  }, [invoices]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter((i) => i.status === 'PAID').length;
    const pending = invoices.filter((i) => ['ISSUED', 'PARTIALLY_PAID'].includes(i.status)).length;
    const overdue = invoices.filter((i) => i.status === 'OVERDUE').length;
    const draft = invoices.filter((i) => ['DRAFT', 'VOID', 'CANCELLED'].includes(i.status)).length;
    return { total, paid, pending, overdue, draft };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Filter status
      if (activeFilter === 'PAID' && inv.status !== 'PAID') return false;
      if (activeFilter === 'PENDING' && !['ISSUED', 'PARTIALLY_PAID'].includes(inv.status)) return false;
      if (activeFilter === 'OVERDUE' && inv.status !== 'OVERDUE') return false;
      if (activeFilter === 'DRAFT' && !['DRAFT', 'VOID', 'CANCELLED'].includes(inv.status)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numberMatch = inv.invoice_number?.toLowerCase().includes(q);
        const lineMatch = (inv.lines || []).some(
          (l) =>
            l.product_name?.toLowerCase().includes(q) ||
            l.plan_name?.toLowerCase().includes(q) ||
            l.description?.toLowerCase().includes(q)
        );
        return numberMatch || lineMatch;
      }
      return true;
    });
  }, [invoices, activeFilter, searchQuery]);

  if (loading) {
    return <InvoicesSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-[#0F1B33]">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F1B33] tracking-tight">
            My Invoices
          </h1>
          <p className="text-sm text-[#5B6B85] mt-1">
            Review billing statements, payment statuses, and download official PDF receipts.
          </p>
        </div>

        <Link
          to="/portal/payments"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-white border border-[#E4E9F2] hover:bg-gray-50 text-[#0F1B33] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <CreditCard size={15} className="text-[#2457D6]" />
          <span>Payment History</span>
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
            onClick={fetchInvoices}
            className="px-3 py-1.5 rounded-[8px] bg-white border border-rose-200 hover:bg-rose-100/50 text-[#D92D20] text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Financial KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Invoiced */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Total Invoiced
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {formatCurrency(kpis.totalInvoiced)}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            Across {counts.total} billing statement{counts.total === 1 ? '' : 's'}
          </p>
        </div>

        {/* Total Paid */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Total Paid
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#12A150]">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {formatCurrency(kpis.totalPaid)}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            {counts.paid} fully cleared invoice{counts.paid === 1 ? '' : 's'}
          </p>
        </div>

        {/* Outstanding Due */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Outstanding Due
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#E8820C]">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F1B33] tabular-nums tracking-tight">
            {formatCurrency(kpis.totalDue)}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            {counts.pending} pending settlement
          </p>
        </div>

        {/* Overdue Count */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A97AD]">
              Overdue
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpis.overdueCount > 0 ? 'bg-rose-50 text-[#D92D20]' : 'bg-gray-100 text-[#8A97AD]'}`}>
              <ShieldAlert size={16} />
            </div>
          </div>
          <p className={`text-2xl font-bold tabular-nums tracking-tight ${kpis.overdueCount > 0 ? 'text-[#D92D20]' : 'text-[#0F1B33]'}`}>
            {kpis.overdueCount}
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            {kpis.overdueCount > 0 ? 'Action required promptly' : 'Zero overdue invoices'}
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Status Filter Tabs */}
        <div className="inline-flex items-center p-1 bg-white border border-[#E4E9F2] rounded-[12px] shadow-xs overflow-x-auto">
          {[
            { key: 'ALL', label: `All (${counts.total})` },
            { key: 'PAID', label: `Paid (${counts.paid})` },
            { key: 'PENDING', label: `Pending (${counts.pending})` },
            { key: 'OVERDUE', label: `Overdue (${counts.overdue})` },
            { key: 'DRAFT', label: `Draft (${counts.draft})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-all whitespace-nowrap cursor-pointer ${
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
            placeholder="Search by invoice number…"
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-[10px] bg-white border border-[#E4E9F2] text-[#0F1B33] placeholder-[#8A97AD] focus:border-[#2457D6] focus:outline-none shadow-xs transition-colors"
          />
        </div>
      </div>

      {/* ── Invoices List ──────────────────────────────────────────────── */}
      {invoices.length === 0 ? (
        /* Empty State: Zero Invoices */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-12 text-center shadow-xs flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-[#EEF3FF] text-[#2457D6] flex items-center justify-center mb-3">
            <FileText size={26} />
          </div>
          <h3 className="text-base font-bold text-[#0F1B33]">
            No invoices found
          </h3>
          <p className="text-xs text-[#5B6B85] max-w-sm mt-1 mb-6">
            You currently have no billing statements issued to your account.
          </p>
          <Link
            to="/portal/plans"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#2457D6] hover:bg-[#1C45AE] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <span>Explore Plans</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : filteredInvoices.length === 0 ? (
        /* Empty Filter State */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 text-center shadow-xs">
          <Layers size={32} className="mx-auto text-[#8A97AD] mb-2" />
          <p className="text-sm font-semibold text-[#0F1B33]">
            No matching invoices
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            No invoices matched your current filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-4 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold text-[#2457D6] bg-[#EEF3FF] hover:bg-blue-100/50 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Render Invoice Items */
        <div className="space-y-4">
          {filteredInvoices.map((inv) => (
            <InvoiceItem
              key={inv.id}
              invoice={inv}
              onDownload={handleDownloadPDF}
              isDownloading={downloadingId === inv.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

