import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, XCircle, FileText, RefreshCw, Zap } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, CardBody, Badge, Button, Spinner, Table, Th, Td, Tr, Alert } from '../../components/ui';

const STATUS_VARIANT = {
  DRAFT: 'info',
  ACTIVE: 'success',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  EXPIRED: 'danger',
};

export default function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const fetchSubscription = () => {
    setLoading(true);
    api.get(`/subscriptions/${id}/`)
      .then(({ data }) => setSubscription(data))
      .catch(() => navigate('/admin/subscriptions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const handleAction = async (endpoint, successText) => {
    setActionLoading(true);
    setMsg(null);
    setError(null);
    try {
      await api.post(`/subscriptions/${id}/${endpoint}/`);
      setMsg(successText);
      fetchSubscription();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || `Failed to ${endpoint} subscription.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setActionLoading(true);
    setMsg(null);
    setError(null);
    try {
      const res = await api.post(`/subscriptions/${id}/generate-invoice/`);
      setMsg('Invoice successfully generated for subscription!');
      if (res.data?.id) {
        navigate(`/admin/invoices/${res.data.id}`);
      } else {
        fetchSubscription();
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to generate invoice.');
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

  if (!subscription) return null;

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
              <h1 className="text-xl font-bold text-gray-50">{subscription.subscription_number}</h1>
              <Badge variant={STATUS_VARIANT[subscription.status] || 'neutral'}>
                {subscription.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Created on {subscription.created_at ? new Date(subscription.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Lifecycle actions */}
        <div className="flex flex-wrap items-center gap-2">
          {subscription.status === 'DRAFT' && (
            <Button
              variant="primary"
              loading={actionLoading}
              onClick={() => handleAction('activate', 'Subscription activated!')}
            >
              <Play size={15} /> Activate
            </Button>
          )}

          {subscription.status === 'ACTIVE' && (
            <>
              <Button
                variant="secondary"
                loading={actionLoading}
                onClick={handleGenerateInvoice}
              >
                <FileText size={15} /> Bill / Generate Invoice
              </Button>
              <Button
                variant="secondary"
                loading={actionLoading}
                onClick={() => handleAction('renew', 'Subscription renewed!')}
              >
                <RotateCcw size={15} /> Renew
              </Button>
              <Button
                variant="warning"
                loading={actionLoading}
                onClick={() => handleAction('pause', 'Subscription paused.')}
              >
                <Pause size={15} /> Pause
              </Button>
              <Button
                variant="danger"
                loading={actionLoading}
                onClick={() => handleAction('close', 'Subscription closed.')}
              >
                <XCircle size={15} /> Close
              </Button>
            </>
          )}

          {subscription.status === 'PAUSED' && (
            <>
              <Button
                variant="primary"
                loading={actionLoading}
                onClick={() => handleAction('resume', 'Subscription resumed!')}
              >
                <Play size={15} /> Resume
              </Button>
              <Button
                variant="danger"
                loading={actionLoading}
                onClick={() => handleAction('close', 'Subscription closed.')}
              >
                <XCircle size={15} /> Close
              </Button>
            </>
          )}

          <Button variant="ghost" onClick={fetchSubscription}>
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
              <span className="text-gray-500">Customer ID</span>
              <Link
                to={`/admin/customers/${subscription.customer}`}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                #{subscription.customer}
              </Link>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Company</span>
              <span className="text-gray-200">{subscription.customer_company || '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-200">{subscription.customer_email || '—'}</span>
            </div>
            {subscription.quotation && (
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Source Quotation</span>
                <Link
                  to={`/admin/quotations/${subscription.quotation}`}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  {subscription.quotation_number || `#${subscription.quotation}`}
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Schedule & Billing Details */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-200">Billing Schedule</h2>
          </CardHeader>
          <CardBody className="divide-y divide-gray-800 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Start Date</span>
              <span className="text-gray-200">{subscription.start_date || '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">End Date</span>
              <span className="text-gray-200">{subscription.end_date || 'Ongoing'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Next Billing Date</span>
              <span className="text-blue-400 font-semibold">{subscription.next_billing_date || '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Created By</span>
              <span className="text-gray-200">{subscription.created_by_email || 'System'}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Subscription Lines */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">Subscription Plans & Items</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Variant</Th>
                <Th>Plan</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Unit Price</Th>
                <Th align="right">Line Total</Th>
              </tr>
            </thead>
            <tbody>
              {!subscription.lines || subscription.lines.length === 0 ? (
                <Tr>
                  <Td colSpan={6} className="text-center py-6 text-gray-500">
                    No items in this subscription.
                  </Td>
                </Tr>
              ) : (
                subscription.lines.map((line) => (
                  <Tr key={line.id}>
                    <Td className="font-medium text-gray-200">
                      {line.product_name || `Product #${line.product}`}
                    </Td>
                    <Td className="text-gray-400">{line.variant_name || '—'}</Td>
                    <Td className="text-blue-400 font-medium">{line.plan_name || '—'}</Td>
                    <Td align="right" className="text-gray-300">{line.quantity}</Td>
                    <Td align="right" className="text-gray-300">${Number(line.unit_price).toFixed(2)}</Td>
                    <Td align="right" className="font-semibold text-gray-100">${Number(line.line_total).toFixed(2)}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
