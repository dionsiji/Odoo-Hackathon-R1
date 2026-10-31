import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Check, X, FileText, ShoppingCart, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, CardBody, Badge, Button, Spinner, Table, Th, Td, Tr, Alert } from '../../components/ui';

const STATUS_VARIANT = {
  DRAFT: 'neutral',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warning',
};

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const fetchQuotation = () => {
    setLoading(true);
    api.get(`/quotations/${id}/`)
      .then(({ data }) => setQuotation(data))
      .catch(() => navigate('/admin/quotations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const handleAction = async (endpoint, successText) => {
    setActionLoading(true);
    setMsg(null);
    setError(null);
    try {
      await api.post(`/quotations/${id}/${endpoint}/`);
      setMsg(successText);
      fetchQuotation();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || `Failed to ${endpoint} quotation.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setActionLoading(true);
    setMsg(null);
    setError(null);
    try {
      const res = await api.post(`/quotations/${id}/generate-invoice/`);
      setMsg('Invoice successfully generated!');
      if (res.data?.id) {
        navigate(`/admin/invoices/${res.data.id}`);
      } else {
        fetchQuotation();
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to generate invoice from quotation.');
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

  if (!quotation) return null;

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
              <h1 className="text-xl font-bold text-gray-50">{quotation.quotation_number}</h1>
              <Badge variant={STATUS_VARIANT[quotation.status] || 'neutral'}>
                {quotation.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Created on {quotation.created_at ? new Date(quotation.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Action buttons based on status */}
        <div className="flex flex-wrap items-center gap-2">
          {quotation.status === 'DRAFT' && (
            <Button
              variant="secondary"
              loading={actionLoading}
              onClick={() => handleAction('send', 'Quotation sent successfully!')}
            >
              <Send size={15} /> Send Quotation
            </Button>
          )}

          {quotation.status === 'SENT' && (
            <>
              <Button
                variant="primary"
                loading={actionLoading}
                onClick={() => handleAction('accept', 'Quotation accepted!')}
              >
                <Check size={15} /> Mark Accepted
              </Button>
              <Button
                variant="danger"
                loading={actionLoading}
                onClick={() => handleAction('reject', 'Quotation rejected.')}
              >
                <X size={15} /> Reject
              </Button>
            </>
          )}

          {quotation.status === 'ACCEPTED' && (
            <Button
              variant="primary"
              loading={actionLoading}
              onClick={handleGenerateInvoice}
            >
              <FileText size={15} /> Convert to Invoice
            </Button>
          )}

          <Button variant="ghost" onClick={fetchQuotation}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-200">Customer Details</h2>
          </CardHeader>
          <CardBody className="divide-y divide-gray-800 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Customer ID</span>
              <Link
                to={`/admin/customers/${quotation.customer}`}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                #{quotation.customer}
              </Link>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Company</span>
              <span className="text-gray-200">{quotation.customer_company || '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-200">{quotation.customer_email || '—'}</span>
            </div>
          </CardBody>
        </Card>

        {/* Quotation Details */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-200">Quotation Meta</h2>
          </CardHeader>
          <CardBody className="divide-y divide-gray-800 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Issue Date</span>
              <span className="text-gray-200">{quotation.issue_date || '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Expiry Date</span>
              <span className="text-gray-200">{quotation.expiry_date || '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Created By</span>
              <span className="text-gray-200">{quotation.created_by_email || 'System'}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">Line Items</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Variant</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Unit Price</Th>
                <Th align="right">Line Total</Th>
              </tr>
            </thead>
            <tbody>
              {!quotation.lines || quotation.lines.length === 0 ? (
                <Tr>
                  <Td colSpan={5} className="text-center py-6 text-gray-500">
                    No line items attached.
                  </Td>
                </Tr>
              ) : (
                quotation.lines.map((line) => (
                  <Tr key={line.id}>
                    <Td className="font-medium text-gray-200">
                      {line.product_name || `Product #${line.product}`}
                    </Td>
                    <Td className="text-gray-400">{line.variant_name || '—'}</Td>
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
              <span>${Number(quotation.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Discount</span>
              <span>-${Number(quotation.discount_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Tax</span>
              <span>+${Number(quotation.tax_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-100 pt-2 border-t border-gray-800">
              <span>Total Amount</span>
              <span className="text-blue-400">${Number(quotation.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes & Terms */}
      {(quotation.notes || quotation.terms) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quotation.notes && (
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-gray-200">Notes</h3></CardHeader>
              <CardBody><p className="text-sm text-gray-300 whitespace-pre-wrap">{quotation.notes}</p></CardBody>
            </Card>
          )}
          {quotation.terms && (
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-gray-200">Terms & Conditions</h3></CardHeader>
              <CardBody><p className="text-sm text-gray-400 whitespace-pre-wrap">{quotation.terms}</p></CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
