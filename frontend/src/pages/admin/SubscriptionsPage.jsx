import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Play, Pause, SkipForward, RotateCcw, XCircle, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, Button, Badge, EmptyState, Spinner, Modal,
  Input, Table, Th, Td, Tr,
} from '../../components/ui';

const STATUS_VARIANT = {
  DRAFT: 'neutral', ACTIVE: 'success', PAUSED: 'warning', CLOSED: 'danger',
};

const LIFECYCLE_ACTIONS = {
  DRAFT:  [{ action: 'activate', icon: Play,       label: 'Activate', variant: 'success' }],
  ACTIVE: [
    { action: 'pause',  icon: Pause,      label: 'Pause',  variant: 'warning' },
    { action: 'renew',  icon: RotateCcw,  label: 'Renew',  variant: 'secondary' },
    { action: 'close',  icon: XCircle,    label: 'Close',  variant: 'danger' },
  ],
  PAUSED: [
    { action: 'resume', icon: Play,       label: 'Resume', variant: 'success' },
    { action: 'close',  icon: XCircle,    label: 'Close',  variant: 'danger' },
  ],
  CLOSED: [],
};

function CreateSubscriptionForm({ customers, quotations, onSave, onClose }) {
  const [mode, setMode] = useState('quotation'); // 'quotation' | 'standalone'
  const [form, setForm] = useState({
    customer: '', quotation: '', start_date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const f = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // Accepted quotations only
  const acceptedQuotes = quotations.filter((q) => q.status === 'ACCEPTED');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = {
        customer: Number(form.customer),
        start_date: form.start_date,
        ...(mode === 'quotation' && form.quotation ? { quotation: Number(form.quotation) } : {}),
      };
      const { data } = await api.post('/subscriptions/', payload);
      onSave(data);
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Failed to create subscription');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-2">
        {['quotation', 'standalone'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
              mode === m
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {m === 'quotation' ? 'From Accepted Quotation' : 'Standalone'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Customer <span className="text-red-400">*</span></label>
        <select name="customer" value={form.customer} onChange={f} required
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500">
          <option value="">Select customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.user?.first_name} {c.user?.last_name} — {c.company_name || c.user?.email}
            </option>
          ))}
        </select>
      </div>

      {mode === 'quotation' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Accepted Quotation</label>
          <select name="quotation" value={form.quotation} onChange={f}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500">
            <option value="">Select quotation…</option>
            {acceptedQuotes.map((q) => (
              <option key={q.id} value={q.id}>{q.quotation_number} — ${Number(q.total_amount).toFixed(2)}</option>
            ))}
          </select>
          {acceptedQuotes.length === 0 && (
            <p className="text-xs text-amber-400">No accepted quotations available.</p>
          )}
        </div>
      )}

      <Input label="Start Date" type="date" name="start_date" value={form.start_date} onChange={f} required />

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>Create Subscription</Button>
      </div>
    </form>
  );
}

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [acting, setActing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/subscriptions/'), api.get('/customers/'), api.get('/quotations/')])
      .then(([sRes, cRes, qRes]) => {
        setSubscriptions(Array.isArray(sRes.data) ? sRes.data : sRes.data.results ?? []);
        setCustomers(Array.isArray(cRes.data) ? cRes.data : cRes.data.results ?? []);
        setQuotations(Array.isArray(qRes.data) ? qRes.data : qRes.data.results ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (id, action) => {
    setActing(`${id}-${action}`);
    try {
      await api.post(`/subscriptions/${id}/${action}/`);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action}`);
    } finally { setActing(null); }
  };

  const getCustomerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? `${c.user?.first_name || ''} ${c.user?.last_name || ''}`.trim() || c.user?.email : `#${id}`;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Subscriptions"
        subtitle={`${subscriptions.length} total subscriptions`}
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> New Subscription
          </Button>
        }
      />
      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-blue-500" /></div>
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={<RefreshCw size={40} />}
            title="No subscriptions yet"
            description="Create a subscription for a customer"
            action={<Button onClick={() => setShowCreate(true)}><Plus size={15} /> New Subscription</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr className="bg-gray-900/50">
                <Th>Number</Th><Th>Customer</Th><Th>Status</Th>
                <Th>Start</Th><Th>Next Billing</Th><Th>End</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => {
                const actions = LIFECYCLE_ACTIONS[s.status] || [];
                return (
                  <Tr key={s.id} onClick={() => navigate(`/admin/subscriptions/${s.id}`)}>
                    <Td className="font-mono text-xs text-blue-400">{s.subscription_number}</Td>
                    <Td className="text-gray-300">{getCustomerName(s.customer)}</Td>
                    <Td><Badge variant={STATUS_VARIANT[s.status] || 'neutral'}>{s.status}</Badge></Td>
                    <Td className="text-xs text-gray-400">{s.start_date}</Td>
                    <Td className="text-xs text-gray-400">{s.next_billing_date || '—'}</Td>
                    <Td className="text-xs text-gray-400">{s.end_date || '—'}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/admin/subscriptions/${s.id}`)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        {actions.map(({ action, icon: Icon, label, variant }) => (
                          <button
                            key={action}
                            title={label}
                            disabled={acting === `${s.id}-${action}`}
                            onClick={() => doAction(s.id, action)}
                            className={`p-1.5 rounded-lg transition-colors text-gray-500 ${
                              variant === 'success' ? 'hover:text-green-400 hover:bg-green-500/10' :
                              variant === 'warning' ? 'hover:text-amber-400 hover:bg-amber-500/10' :
                              variant === 'danger'  ? 'hover:text-red-400 hover:bg-red-500/10' :
                              'hover:text-gray-200 hover:bg-gray-700'
                            }`}
                          >
                            {acting === `${s.id}-${action}` ? <Spinner size={14} /> : <Icon size={14} />}
                          </button>
                        ))}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Subscription"
      >
        <CreateSubscriptionForm
          customers={customers}
          quotations={quotations}
          onSave={(saved) => { setSubscriptions((prev) => [saved, ...prev]); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
