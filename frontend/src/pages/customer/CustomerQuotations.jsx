import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  ArrowUpRight,
  Check,
  X,
  Package,
  Info,
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
  let label = s || 'Unknown';
  let dotColor = 'bg-[#8A97AD]';

  if (s === 'SENT') {
    styles = 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]';
    label = 'Pending Review';
    dotColor = 'bg-[#E8820C]';
  } else if (s === 'ACCEPTED') {
    styles = 'bg-[#ECFDF3] text-[#027A48] border-[#D1FADF]';
    label = 'Accepted';
    dotColor = 'bg-[#12A150]';
  } else if (s === 'REJECTED') {
    styles = 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]';
    label = 'Declined';
    dotColor = 'bg-[#D92D20]';
  } else if (s === 'EXPIRED') {
    styles = 'bg-[#F7F9FC] text-[#5B6B85] border-[#E4E9F2]';
    label = 'Expired';
    dotColor = 'bg-[#8A97AD]';
  } else if (s === 'DRAFT') {
    styles = 'bg-slate-100 text-[#5B6B85] border-slate-200';
    label = 'Draft';
    dotColor = 'bg-[#8A97AD]';
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

function QuotationsSkeleton() {
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

// ── Confirmation Modal Component ─────────────────────────────────────────────

function ConfirmationModal({ isOpen, onClose, onConfirm, type, quotation, loading, error }) {
  if (!isOpen || !quotation) return null;

  const isAccept = type === 'ACCEPT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-[16px] border border-[#E4E9F2] shadow-xl max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${
                isAccept ? 'bg-[#ECFDF3] text-[#12A150]' : 'bg-[#FEF3F2] text-[#D92D20]'
              }`}
            >
              {isAccept ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F1B33]">
                {isAccept ? 'Accept Quotation' : 'Decline Quotation'}
              </h3>
              <p className="font-mono text-xs font-semibold text-[#2457D6] mt-0.5">
                {quotation.quotation_number}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-[8px] text-[#8A97AD] hover:text-[#0F1B33] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <div className="text-sm text-[#5B6B85] space-y-2">
          {isAccept ? (
            <p>
              Are you sure you want to accept this quotation for{' '}
              <strong className="text-[#0F1B33] font-bold tabular-nums">
                {formatCurrency(quotation.total_amount)}
              </strong>
              ? By accepting, you confirm your agreement with the line items and proposed terms.
            </p>
          ) : (
            <p>
              Are you sure you want to decline this quotation for{' '}
              <strong className="text-[#0F1B33] font-bold tabular-nums">
                {formatCurrency(quotation.total_amount)}
              </strong>
              ? This quotation will be closed and marked as rejected.
            </p>
          )}

          {error && (
            <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs p-3 rounded-[10px]">
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-[10px] text-xs sm:text-sm font-semibold text-[#5B6B85] hover:text-[#0F1B33] hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs sm:text-sm font-semibold text-white transition-colors shadow-xs cursor-pointer disabled:opacity-60 ${
              isAccept
                ? 'bg-[#12A150] hover:bg-[#0E8341]'
                : 'bg-[#D92D20] hover:bg-[#B42318]'
            }`}
          >
            {loading && <RefreshCw size={14} className="animate-spin" />}
            <span>
              {loading
                ? isAccept
                  ? 'Accepting…'
                  : 'Declining…'
                : isAccept
                ? 'Confirm & Accept'
                : 'Confirm & Decline'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Quotation Row / Card Component ───────────────────────────────────────────

function QuotationCard({ quotation, onOpenAction }) {
  const [expanded, setExpanded] = useState(false);
  const lines = quotation.lines || [];
  const isSent = String(quotation.status || '').toUpperCase() === 'SENT';

  return (
    <div className="bg-white border border-[#E4E9F2] rounded-[16px] shadow-xs hover:border-gray-300 transition-all overflow-hidden">
      {/* Summary Row */}
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Column: Number, Status & Dates */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-bold text-[#2457D6] bg-[#EEF3FF] px-2.5 py-1 rounded-[8px]">
              {quotation.quotation_number}
            </span>
            <StatusBadge status={quotation.status} />

            {/* Item count tag */}
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5B6B85] bg-[#F7F9FC] px-2.5 py-0.5 rounded-md border border-[#E4E9F2]">
              <Package size={12} className="text-[#8A97AD]" />
              {lines.length} item{lines.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#5B6B85] flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-[#8A97AD]" />
              <span>
                Issued:{' '}
                <strong className="text-[#0F1B33] tabular-nums">
                  {formatDate(quotation.issue_date)}
                </strong>
              </span>
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} className="text-[#8A97AD]" />
              <span>
                Valid Until:{' '}
                <strong className="text-[#0F1B33] tabular-nums">
                  {formatDate(quotation.expiry_date)}
                </strong>
              </span>
            </span>

            {quotation.customer_company && (
              <span className="text-[#8A97AD] hidden sm:inline">
                Company: <strong className="text-[#0F1B33]">{quotation.customer_company}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Amount & Action Buttons */}
        <div className="flex items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E4E9F2]">
          <div className="text-left lg:text-right">
            <div className="text-xs font-medium text-[#5B6B85] uppercase tracking-wider">
              Total Proposed
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {formatCurrency(quotation.total_amount)}
            </div>
          </div>

          {/* Quick Actions (only enabled when status === 'SENT') */}
          {isSent && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAction('ACCEPT', quotation)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#12A150] hover:bg-[#0E8341] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                title="Accept this quotation"
              >
                <Check size={13} />
                <span>Accept</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAction('REJECT', quotation)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white border border-[#E4E9F2] hover:bg-red-50 hover:border-red-200 text-[#D92D20] text-xs font-semibold transition-colors cursor-pointer"
                title="Decline this quotation"
              >
                <X size={13} />
                <span>Decline</span>
              </button>
            </div>
          )}

          {/* Expand / Collapse Toggle */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-[8px] border border-[#E4E9F2] hover:bg-[#F7F9FC] text-[#5B6B85] hover:text-[#0F1B33] transition-colors cursor-pointer"
            title={expanded ? 'Hide line items' : 'View line items'}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Line Items & Breakdown Drawer */}
      {expanded && (
        <div className="bg-[#F7F9FC] border-t border-[#E4E9F2] p-5 sm:p-6 space-y-6 animate-fade-in text-sm">
          {/* Line Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#5B6B85] uppercase tracking-wider">
              Proposed Products & Services
            </h4>

            {lines.length === 0 ? (
              <p className="text-xs text-[#8A97AD] italic">
                No individual line items listed on this quotation.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-[12px] border border-[#E4E9F2] bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#E4E9F2] text-[#5B6B85] font-semibold uppercase">
                      <th className="py-2.5 px-4">Item & Description</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E9F2]">
                    {lines.map((line) => (
                      <tr key={line.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#0F1B33] block text-xs sm:text-sm">
                            {line.product_name || 'Proposed Product'}
                          </span>
                          {line.variant_name && (
                            <span className="inline-block mt-0.5 text-[11px] font-medium text-[#2457D6] bg-[#EEF3FF] px-2 py-0.5 rounded-md border border-blue-100">
                              Variant: {line.variant_name}
                            </span>
                          )}
                          {line.description && (
                            <p className="text-xs text-[#5B6B85] mt-1">{line.description}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums font-mono text-[#0F1B33]">
                          {line.quantity}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-mono text-[#5B6B85]">
                          {formatCurrency(line.unit_price)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-mono font-semibold text-[#0F1B33]">
                          {formatCurrency(line.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pricing Summary Breakdown */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pt-2">
            {/* Notes & Terms on Left */}
            <div className="space-y-3 flex-1">
              {quotation.notes && (
                <div className="bg-white p-3.5 rounded-[12px] border border-[#E4E9F2] shadow-2xs">
                  <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider block mb-1">
                    Special Notes
                  </span>
                  <p className="text-xs text-[#0F1B33] whitespace-pre-line leading-relaxed">
                    {quotation.notes}
                  </p>
                </div>
              )}

              {quotation.terms && (
                <div className="bg-white p-3.5 rounded-[12px] border border-[#E4E9F2] shadow-2xs">
                  <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider block mb-1">
                    Terms & Conditions
                  </span>
                  <p className="text-xs text-[#5B6B85] whitespace-pre-line leading-relaxed">
                    {quotation.terms}
                  </p>
                </div>
              )}

              {!quotation.notes && !quotation.terms && (
                <div className="text-xs text-[#8A97AD] italic">
                  Standard Brightloop subscription and service terms apply to this proposal.
                </div>
              )}
            </div>

            {/* Financial Totals on Right */}
            <div className="w-full sm:w-72 bg-white rounded-[12px] border border-[#E4E9F2] p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-[#5B6B85]">
                <span>Subtotal</span>
                <span className="tabular-nums font-mono font-medium text-[#0F1B33]">
                  {formatCurrency(quotation.subtotal)}
                </span>
              </div>

              {Number(quotation.discount_amount) > 0 && (
                <div className="flex items-center justify-between text-xs text-[#12A150]">
                  <span>Discount</span>
                  <span className="tabular-nums font-mono font-medium">
                    -{formatCurrency(quotation.discount_amount)}
                  </span>
                </div>
              )}

              {Number(quotation.tax_amount) > 0 && (
                <div className="flex items-center justify-between text-xs text-[#5B6B85]">
                  <span>Tax Amount</span>
                  <span className="tabular-nums font-mono font-medium text-[#0F1B33]">
                    +{formatCurrency(quotation.tax_amount)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-[#E4E9F2] flex items-center justify-between text-sm font-bold text-[#0F1B33]">
                <span>Total Amount</span>
                <span className="text-[#2457D6] tabular-nums font-mono">
                  {formatCurrency(quotation.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Customer Quotations Component ───────────────────────────────────────

export default function CustomerQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modal State
  const [actionModal, setActionModal] = useState(null); // { type: 'ACCEPT'|'REJECT', quotation }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // ── Fetch Quotations ────────────────────────────────────────────────────────

  const fetchQuotations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.get('/quotations/');
      const rawData = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      setQuotations(rawData);
    } catch (err) {
      console.error('Failed to load customer quotations:', err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          'Failed to load quotations. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // ── Handle Accept / Reject Action ──────────────────────────────────────────

  const handleOpenAction = (type, quotation) => {
    setActionError(null);
    setActionModal({ type, quotation });
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    const { type, quotation } = actionModal;
    setActionLoading(true);
    setActionError(null);

    try {
      const endpoint =
        type === 'ACCEPT'
          ? `/quotations/${quotation.id}/accept/`
          : `/quotations/${quotation.id}/reject/`;

      const res = await api.post(endpoint);
      const updated = res.data;

      // Update state locally
      setQuotations((prev) =>
        prev.map((q) =>
          q.id === quotation.id
            ? updated || { ...q, status: type === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' }
            : q
        )
      );

      // Toast feedback
      setFeedbackToast({
        type: type === 'ACCEPT' ? 'success' : 'neutral',
        message:
          type === 'ACCEPT'
            ? `Quotation ${quotation.quotation_number} accepted successfully.`
            : `Quotation ${quotation.quotation_number} has been declined.`,
      });

      // Auto clear toast
      setTimeout(() => setFeedbackToast(null), 4000);

      // Close modal
      setActionModal(null);
    } catch (err) {
      console.error(`Failed to ${type.toLowerCase()} quotation:`, err);
      setActionError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          `Failed to process request. Please try again.`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ── KPI Metrics ────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let acceptedCount = 0;
    let acceptedAmount = 0;
    let closedCount = 0;

    quotations.forEach((q) => {
      const amt = Number(q.total_amount) || 0;
      const st = String(q.status || '').toUpperCase();

      if (st === 'SENT') {
        pendingCount += 1;
        pendingAmount += amt;
      } else if (st === 'ACCEPTED') {
        acceptedCount += 1;
        acceptedAmount += amt;
      } else if (st === 'REJECTED' || st === 'EXPIRED') {
        closedCount += 1;
      }
    });

    return {
      totalCount: quotations.length,
      pendingCount,
      pendingAmount,
      acceptedCount,
      acceptedAmount,
      closedCount,
    };
  }, [quotations]);

  // ── Status Filter Tabs with Counts ─────────────────────────────────────────

  const statusTabs = useMemo(() => {
    const counts = {
      ALL: quotations.length,
      SENT: quotations.filter((q) => String(q.status).toUpperCase() === 'SENT').length,
      ACCEPTED: quotations.filter((q) => String(q.status).toUpperCase() === 'ACCEPTED').length,
      REJECTED: quotations.filter((q) => String(q.status).toUpperCase() === 'REJECTED').length,
      EXPIRED: quotations.filter((q) => String(q.status).toUpperCase() === 'EXPIRED').length,
    };

    return [
      { id: 'ALL', label: 'All Quotations', count: counts.ALL },
      { id: 'SENT', label: 'Pending Review', count: counts.SENT },
      { id: 'ACCEPTED', label: 'Accepted', count: counts.ACCEPTED },
      { id: 'REJECTED', label: 'Declined', count: counts.REJECTED },
      { id: 'EXPIRED', label: 'Expired', count: counts.EXPIRED },
    ];
  }, [quotations]);

  // ── Search & Filter Logic ──────────────────────────────────────────────────

  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // 1. Status Filter
      if (activeStatus !== 'ALL') {
        const s = String(q.status || '').toUpperCase();
        if (s !== activeStatus) return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const numMatch = String(q.quotation_number || '').toLowerCase().includes(query);
        const notesMatch = String(q.notes || '').toLowerCase().includes(query);
        const termsMatch = String(q.terms || '').toLowerCase().includes(query);
        const lineMatch = (q.lines || []).some(
          (l) =>
            String(l.product_name || '').toLowerCase().includes(query) ||
            String(l.variant_name || '').toLowerCase().includes(query) ||
            String(l.description || '').toLowerCase().includes(query)
        );
        return numMatch || notesMatch || termsMatch || lineMatch;
      }

      return true;
    });
  }, [quotations, activeStatus, searchQuery]);

  // ── Render Loading Skeleton ────────────────────────────────────────────────

  if (loading) {
    return <QuotationsSkeleton />;
  }

  // ── Main Page Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F1B33] tracking-tight">
            Quotations & Proposals
          </h1>
          <p className="text-sm text-[#5B6B85] mt-1">
            Review custom subscription proposals, pricing breakdowns, and approve new contracts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchQuotations(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm font-semibold text-[#0F1B33] hover:bg-[#F7F9FC] shadow-2xs transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#2457D6]' : 'text-[#5B6B85]'} />
          <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── Action Feedback Toast Banner ─────────────────────────────────── */}
      {feedbackToast && (
        <div
          className={`p-4 rounded-[12px] border text-sm flex items-center justify-between gap-3 animate-fade-in ${
            feedbackToast.type === 'success'
              ? 'bg-[#ECFDF3] border-[#D1FADF] text-[#027A48]'
              : 'bg-gray-100 border-gray-200 text-[#0F1B33]'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span className="font-semibold">{feedbackToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-current opacity-70 hover:opacity-100 p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-[16px] p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#D92D20] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[#B42318]">Error Loading Quotations</h3>
              <p className="text-xs text-[#B42318]/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchQuotations()}
            className="px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#B42318] bg-white border border-[#FECDCA] hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── KPI Metrics Strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1: Total Quotations */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Total Proposals
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#EEF3FF] flex items-center justify-center text-[#2457D6]">
              <ShoppingCart size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {metrics.totalCount}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">All customized quotes received</p>
          </div>
        </div>

        {/* KPI 2: Pending Review */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Pending Review
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FFFAEB] flex items-center justify-center text-[#E8820C]">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {metrics.pendingCount}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">
              Worth <strong className="text-[#0F1B33]">{formatCurrency(metrics.pendingAmount)}</strong> awaiting decision
            </p>
          </div>
        </div>

        {/* KPI 3: Accepted */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Accepted Proposals
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#ECFDF3] flex items-center justify-center text-[#12A150]">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#12A150] tabular-nums">
              {metrics.acceptedCount}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">
              Total value <strong className="text-[#0F1B33]">{formatCurrency(metrics.acceptedAmount)}</strong>
            </p>
          </div>
        </div>

        {/* KPI 4: Closed / Expired */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Closed / Expired
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-gray-100 flex items-center justify-center text-[#8A97AD]">
              <XCircle size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#5B6B85] tabular-nums">
              {metrics.closedCount}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">Archived or expired proposals</p>
          </div>
        </div>
      </div>

      {/* ── Status Filter Tabs & Search ──────────────────────────────────── */}
      <div className="space-y-4">
        {/* Status Tabs */}
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

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A97AD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by quotation #, item name, variant, or description..."
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

          {(activeStatus !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setActiveStatus('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-xs font-semibold text-[#D92D20] hover:bg-red-50 rounded-[10px] border border-transparent hover:border-red-100 transition-colors cursor-pointer shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Quotation Items Container ────────────────────────────────────── */}
      {quotations.length === 0 ? (
        /* Empty State: Zero Quotations */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#EEF3FF] flex items-center justify-center mx-auto mb-4 text-[#2457D6]">
            <ShoppingCart size={28} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#0F1B33]">
            No quotations available
          </h3>
          <p className="text-xs sm:text-sm text-[#5B6B85] max-w-md mx-auto mt-1.5">
            You do not have any pending or past customized proposals. Custom pricing or enterprise deals prepared by our sales team will show up here.
          </p>
          <div className="mt-6">
            <Link
              to="/portal"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs sm:text-sm font-semibold text-white bg-[#2457D6] hover:bg-[#1C45AE] shadow-xs transition-colors"
            >
              <span>Back to Dashboard</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      ) : filteredQuotations.length === 0 ? (
        /* Empty State: Filter Returned Zero Results */
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 text-center shadow-xs">
          <Layers size={32} className="mx-auto text-[#8A97AD] mb-2" />
          <p className="text-sm font-semibold text-[#0F1B33]">
            No matching quotations
          </p>
          <p className="text-xs text-[#5B6B85] mt-1">
            No quotations matched your current filter and search criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveStatus('ALL');
              setSearchQuery('');
            }}
            className="mt-4 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold text-[#2457D6] bg-[#EEF3FF] hover:bg-blue-100/50 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Render Quotation Cards */
        <div className="space-y-4">
          {filteredQuotations.map((q) => (
            <QuotationCard
              key={q.id}
              quotation={q}
              onOpenAction={handleOpenAction}
            />
          ))}
        </div>
      )}

      {/* ── Confirmation Modal ───────────────────────────────────────────── */}
      <ConfirmationModal
        isOpen={Boolean(actionModal)}
        onClose={() => {
          if (!actionLoading) setActionModal(null);
        }}
        onConfirm={handleConfirmAction}
        type={actionModal?.type}
        quotation={actionModal?.quotation}
        loading={actionLoading}
        error={actionError}
      />
    </div>
  );
}

