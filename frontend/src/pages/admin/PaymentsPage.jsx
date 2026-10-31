import { useState, useEffect, useCallback } from 'react';
import { Plus, CreditCard, RotateCcw } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, Button, Badge, EmptyState, Spinner, Modal,
  Input, Table, Th, Td, Tr,
} from '../../components/ui';

const STATUS_VARIANT = {
  COMPLETED: 'success', PENDING: 'warning', FAILED: 'danger', REFUNDED: 'neutral',
};

const PAYMENT_METHODS = ['MANUAL', 'BANK_TRANSFER', 'CREDIT_CARD', 'CASH', 'MOCK_GATEWAY'];

function RecordPaymentForm({ invoices, onSave, onClose }) {
  const [form, setForm] = useState({ invoice: '', amount: '', payment_method: 'MANUAL', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const f = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const unpaidInvoices = invoices.filter((inv) =>
    ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status)
  );

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/payments/', {
        invoice: Number(form.invoice),
        amount: form.amount,
        payment_method: form.payment_method,
        notes: form.notes,
      });
      onSave(data);
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Failed to record payment');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Invoice <span className="text-red-400">*</span></label>
        <select name="invoice" value={form.invoice} onChange={f} required
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500">
          <option value="">Select invoice…</option>
          {unpaidInvoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoice_number} — Due: ${Number(inv.amount_due).toFixed(2)}
            </option>
          ))}
        </select>
        {unpaidInvoices.length === 0 && (
          <p className="text-xs text-amber-400">No outstanding invoices to pay.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Amount ($)" type="number" step="0.01" name="amount" value={form.amount} onChange={f} required placeholder="150.00" />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Payment Method</label>
          <select name="payment_method" value={form.payment_method} onChange={f}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500">
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Notes / Reference</label>
        <input name="notes" value={form.notes} onChange={f} placeholder="Wire confirmation #12345"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500" />
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>Record Payment</Button>
      </div>
    </form>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecord, setShowRecord] = useState(false);
  const [refunding, setRefunding] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/payments/'), api.get('/invoices/')])
      .then(([pRes, invRes]) => {
        setPayments(Array.isArray(pRes.data) ? pRes.data : pRes.data.results ?? []);
        setInvoices(Array.isArray(invRes.data) ? invRes.data : invRes.data.results ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const doRefund = async (id) => {
    if (!window.confirm('Refund this payment? This will reverse the invoice balance.')) return;
    setRefunding(id);
    try {
      await api.post(`/payments/${id}/refund/`, { notes: 'Customer requested refund' });
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to refund');
    } finally { setRefunding(null); }
  };

  const totalCollected = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payments"
        subtitle={`$${totalCollected.toFixed(2)} total collected`}
        actions={
          <Button size="sm" onClick={() => setShowRecord(true)}>
            <Plus size={15} /> Record Payment
          </Button>
        }
      />
      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-blue-500" /></div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={40} />}
            title="No payments recorded"
            action={<Button onClick={() => setShowRecord(true)}><Plus size={15} /> Record Payment</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr className="bg-gray-900/50">
                <Th>Ref</Th><Th>Invoice</Th><Th>Amount</Th>
                <Th>Method</Th><Th>Status</Th><Th>Date</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <Tr key={p.id}>
                  <Td className="font-mono text-xs text-blue-400">{p.transaction_ref}</Td>
                  <Td className="text-gray-400 text-xs">
                    {invoices.find((inv) => inv.id === p.invoice)?.invoice_number || `#${p.invoice}`}
                  </Td>
                  <Td className="font-semibold text-gray-100">${Number(p.amount).toFixed(2)}</Td>
                  <Td className="text-gray-400 text-sm">{p.payment_method?.replace(/_/g, ' ')}</Td>
                  <Td><Badge variant={STATUS_VARIANT[p.status] || 'neutral'}>{p.status}</Badge></Td>
                  <Td className="text-xs text-gray-500">
                    {p.paid_at ? new Date(p.paid_at).toLocaleString() : '—'}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end">
                      {p.status === 'COMPLETED' && (
                        <button
                          onClick={() => doRefund(p.id)}
                          disabled={refunding === p.id}
                          title="Refund"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          {refunding === p.id ? <Spinner size={14} /> : <RotateCcw size={14} />}
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={showRecord} onClose={() => setShowRecord(false)} title="Record Payment">
        <RecordPaymentForm
          invoices={invoices}
          onSave={(saved) => { setPayments((prev) => [saved, ...prev]); setShowRecord(false); load(); }}
          onClose={() => setShowRecord(false)}
        />
      </Modal>
    </div>
  );
}
