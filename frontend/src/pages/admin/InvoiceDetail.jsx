import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, Send, Ban, Slash, CreditCard,
  FileText, RefreshCw, CheckCircle, RotateCcw,
} from 'lucide-react';
import api from '../../lib/api';
import {
  Card, CardHeader, CardBody, Badge, Button, Spinner, Table, Th, Td, Tr,
  Alert, Modal, Input, Select,
} from '../../components/ui';

const STATUS_VARIANT = {
  DRAFT: 'neutral',
  ISSUED: 'info',
  PAID: 'success',
  PARTIALLY_PAID: 'warning',
  OVERDUE: 'danger',
  VOID: 'neutral',
  CANCELLED: 'neutral',
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('STRIPE');
  const [payNotes, setPayNotes] = useState('');

  const fetchInvoice = () => {
    setLoading(true);
    Promise.all([
      api.get(`/invoices/${id}/`),
      api.get('/payments/').then(({ data }) => {
        const all = Array.isArray(data) ? data : data.results ?? [];
        return all.filter((p) => p.invoice === Number(id) || p.invoice_number === invoice?.invoice_number);
      }),
    ])
      .then(([invRes, payRes]) => {
        setInvoice(invRes.data);
        setPayments(payRes);
        setPayAmount(invRes.data.amount_due || '');
      })
      .catch(() => navigate('/admin/invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleAction = async (endpoint, successText) => {
    setActionLoading(true);
    setMsg(null);
    setError(null);
    try {
      await api.post(`/invoices/${id}/${endpoint}/`);
      setMsg(successText);
      fetchInvoice();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || `Failed to ${endpoint} invoice.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/invoices/${id}/pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoice.invoice_number || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download invoice PDF.');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg(null);
    setError(null);
    try {
      await api.post('/payments/', {
        invoice: Number(id),
        amount: payAmount,
        payment_method: payMethod,
        notes: payNotes,
      });
      setPaymentModalOpen(false);
      setMsg('Payment recorded successfully!');
      fetchInvoice();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to record payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundPayment = async (paymentId) => {
    if (!confirm('Are you sure you want to refund this payment?')) return;
    setActionLoading(true);
    try {
      await api.post(`/payments/${paymentId}/refund/`);
      setMsg('Payment successfully refunded.');
      fetchInvoice();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to refund payment.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} className="text-blue-500" />
      </div>
    );
  }

  if (!invoice) return null;

  const canPay = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && Number(invoice.amount_due) > 0;

  return (
    <div className="animate-fade-in max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-50">{invoice.invoice_number}</h1>
              <Badge variant={STATUS_VARIANT[invoice.status] || 'neutral'}>
                {invoice.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Issued on {invoice.issue_date || '—'} · Due on {invoice.due_date || '—'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'DRAFT' && (
            <Button
              variant="primary"
              loading={actionLoading}
              onClick={() => handleAction('issue', 'Invoice issued successfully!')}
            >
              <Send size={15} /> Issue Invoice
            </Button>
          )}

          {canPay && (
            <Button
              variant="primary"
              onClick={() => {
                setPayAmount(invoice.amount_due);
                setPaymentModalOpen(true);
              }}
            >
              <CreditCard size={15} /> Record Payment
            </Button>
          )}

          {['DRAFT', 'ISSUED'].includes(invoice.status) && (
            <Button
              variant="secondary"
              loading={actionLoading}
              onClick={() => handleAction('void', 'Invoice voided.')}
            >
              <Ban size={15} /> Void
            </Button>
          )}

          {['DRAFT', 'ISSUED'].includes(invoice.status) && (
            <Button
              variant="danger"
              loading={actionLoading}
              onClick={() => handleAction('cancel', 'Invoice cancelled.')}
            >
              <Slash size={15} /> Cancel
            </Button>
          )}

          <Button variant="secondary" onClick={handleDownloadPDF}>
            <Download size={15} /> PDF
          </Button>

          <Button variant="ghost" onClick={fetchInvoice}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {/* Meta Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-200">Customer Details</h2>
          </CardHeader>
          <CardBody className="divide-y divide-gray-800 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Customer</span>
              <Link
                to={`/admin/customers/${invoice.customer}`}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                {invoice.customer_details?.company_name || `Customer #${invoice.customer}`}
              </Link>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-200">{invoice.customer_details?.user?.email || '—'}</span>
            </div>
            {invoice.subscription && (
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Linked Subscription</span>
                <Link
                  to={`/admin/subscriptions/${invoice.subscription}`}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  #{invoice.subscription}
                </Link>
              </div>
            )}
            {invoice.quotation && (
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Linked Quotation</span>
                <Link
                  to={`/admin/quotations/${invoice.quotation}`}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  #{invoice.quotation}
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Invoice Status & Details */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-200">Payment Status</h2>
          </CardHeader>
          <CardBody className="divide-y divide-gray-800 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Total Billed</span>
              <span className="font-semibold text-gray-100">${Number(invoice.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-semibold text-green-400">${Number(invoice.amount_paid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Amount Due</span>
              <span className="font-bold text-red-400">${Number(invoice.amount_due).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Created By</span>
              <span className="text-gray-200">{invoice.created_by_email || 'System'}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">Invoice Items</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Description</Th>
                <Th>Product / Plan</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Unit Price</Th>
                <Th align="right">Line Total</Th>
              </tr>
            </thead>
            <tbody>
              {!invoice.lines || invoice.lines.length === 0 ? (
                <Tr>
                  <Td colSpan={5} className="text-center py-6 text-gray-500">
                    No items in this invoice.
                  </Td>
                </Tr>
              ) : (
                invoice.lines.map((line) => (
                  <Tr key={line.id}>
                    <Td className="font-medium text-gray-200">{line.description || '—'}</Td>
                    <Td className="text-gray-400">
                      {line.product_name}
                      {line.variant_name ? ` (${line.variant_name})` : ''}
                      {line.plan_name ? ` · ${line.plan_name}` : ''}
                    </Td>
                    <Td align="right" className="text-gray-300">{line.quantity}</Td>
                    <Td align="right" className="text-gray-300">${Number(line.unit_price).toFixed(2)}</Td>
                    <Td align="right" className="font-semibold text-gray-100">${Number(line.line_total).toFixed(2)}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Totals Summary */}
        <div className="p-4 border-t border-gray-800 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>${Number(invoice.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Discount</span>
              <span>-${Number(invoice.discount_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Tax</span>
              <span>+${Number(invoice.tax_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-100 pt-2 border-t border-gray-800">
              <span>Total Amount</span>
              <span className="text-blue-400">${Number(invoice.total_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-green-400">
              <span>Paid</span>
              <span>${Number(invoice.amount_paid || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-red-400">
              <span>Outstanding Due</span>
              <span>${Number(invoice.amount_due || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Associated Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Associated Payments</h2>
            {canPay && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPayAmount(invoice.amount_due);
                  setPaymentModalOpen(true);
                }}
              >
                <CreditCard size={14} /> Add Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Method</Th>
                <Th>Status</Th>
                <Th align="right">Amount</Th>
                <Th>Date</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <Tr>
                  <Td colSpan={6} className="text-center py-6 text-gray-500">
                    No payment transactions recorded for this invoice yet.
                  </Td>
                </Tr>
              ) : (
                payments.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-mono text-xs text-gray-300">{p.transaction_ref}</Td>
                    <Td className="text-gray-300">{p.payment_method}</Td>
                    <Td>
                      <Badge
                        variant={
                          p.status === 'COMPLETED' ? 'success' :
                          p.status === 'REFUNDED' ? 'neutral' : 'danger'
                        }
                      >
                        {p.status}
                      </Badge>
                    </Td>
                    <Td align="right" className="font-semibold text-gray-100">${Number(p.amount).toFixed(2)}</Td>
                    <Td className="text-gray-400 text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleString() : '—'}</Td>
                    <Td align="right">
                      {p.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleRefundPayment(p.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw size={12} /> Refund
                        </button>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment for ${invoice.invoice_number}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            min="0.01"
            max={invoice.amount_due}
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
          />
          <Select
            label="Payment Method"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            options={[
              { value: 'STRIPE', label: 'Stripe' },
              { value: 'PAYPAL', label: 'PayPal' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'CASH', label: 'Cash' },
              { value: 'CREDIT_CARD', label: 'Credit Card' },
            ]}
          />
          <Input
            label="Notes"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            placeholder="Payment reference, check number, notes..."
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <Button variant="secondary" type="button" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={actionLoading}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
