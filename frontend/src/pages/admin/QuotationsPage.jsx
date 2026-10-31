import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Send, Check, X, ShoppingCart } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, Button, Badge, EmptyState, Spinner, Modal,
  Input, Select, Table, Th, Td, Tr, Textarea,
} from '../../components/ui';

const STATUS_VARIANT = {
  DRAFT: 'neutral', SENT: 'info', ACCEPTED: 'success', REJECTED: 'danger', EXPIRED: 'warning',
};

function LineItem({ line, products, variants, onChange, onRemove }) {
  const pVariants = variants.filter((v) => v.product === line.product);
  return (
    <div className="flex items-end gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex-1 flex flex-col gap-1.5">
        <label className="text-xs text-gray-400">Product</label>
        <select
          value={line.product}
          onChange={(e) => onChange('product', Number(e.target.value))}
          className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-600 bg-gray-700 text-gray-100 outline-none"
        >
          <option value="">Select…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="w-36 flex flex-col gap-1.5">
        <label className="text-xs text-gray-400">Variant</label>
        <select
          value={line.variant || ''}
          onChange={(e) => onChange('variant', e.target.value ? Number(e.target.value) : null)}
          className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-600 bg-gray-700 text-gray-100 outline-none"
        >
          <option value="">None</option>
          {pVariants.map((v) => <option key={v.id} value={v.id}>{v.variant_name}</option>)}
        </select>
      </div>
      <div className="w-20 flex flex-col gap-1.5">
        <label className="text-xs text-gray-400">Qty</label>
        <input
          type="number" min="1" value={line.quantity}
          onChange={(e) => onChange('quantity', Number(e.target.value))}
          className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-600 bg-gray-700 text-gray-100 outline-none"
        />
      </div>
      <div className="w-28 flex flex-col gap-1.5">
        <label className="text-xs text-gray-400">Unit Price</label>
        <input
          type="number" step="0.01" min="0" value={line.unit_price}
          onChange={(e) => onChange('unit_price', e.target.value)}
          className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-600 bg-gray-700 text-gray-100 outline-none"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function QuotationForm({ customers, products, allVariants, onSave, onClose }) {
  const [form, setForm] = useState({
    customer: '', issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: '', discount_amount: '0.00', tax_amount: '0.00', notes: '', terms: '',
    lines: [{ product: '', variant: null, description: '', quantity: 1, unit_price: '0.00' }],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const f = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const updateLine = (i, key, val) =>
    setForm((p) => {
      const lines = [...p.lines];
      lines[i] = { ...lines[i], [key]: val };
      return { ...p, lines };
    });

  const addLine = () =>
    setForm((p) => ({ ...p, lines: [...p.lines, { product: '', variant: null, description: '', quantity: 1, unit_price: '0.00' }] }));

  const removeLine = (i) =>
    setForm((p) => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.lines.every((l) => l.product)) { setError('Each line must have a product'); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        customer: Number(form.customer),
        lines: form.lines.map((l) => ({ ...l, product: Number(l.product) })),
      };
      const { data } = await api.post('/quotations/', payload);
      onSave(data);
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Failed to create quotation');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5 col-span-1">
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
        <Input label="Issue Date" type="date" name="issue_date" value={form.issue_date} onChange={f} required />
        <Input label="Expiry Date" type="date" name="expiry_date" value={form.expiry_date} onChange={f} required />
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Line Items</label>
          <Button size="xs" variant="outline" type="button" onClick={addLine}><Plus size={12} /> Add Line</Button>
        </div>
        <div className="flex flex-col gap-2">
          {form.lines.map((line, i) => (
            <LineItem
              key={i}
              line={line}
              products={products}
              variants={allVariants}
              onChange={(k, v) => updateLine(i, k, v)}
              onRemove={() => removeLine(i)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Discount ($)" type="number" step="0.01" name="discount_amount" value={form.discount_amount} onChange={f} />
        <Input label="Tax ($)" type="number" step="0.01" name="tax_amount" value={form.tax_amount} onChange={f} />
      </div>
      <Textarea label="Notes" name="notes" value={form.notes} onChange={f} rows={2} />
      <Textarea label="Terms" name="terms" value={form.terms} onChange={f} rows={2} />

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>Create Quotation</Button>
      </div>
    </form>
  );
}

export default function QuotationsPage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/quotations/'),
      api.get('/customers/'),
      api.get('/products/'),
    ]).then(async ([qRes, cRes, pRes]) => {
      setQuotations(Array.isArray(qRes.data) ? qRes.data : qRes.data.results ?? []);
      setCustomers(Array.isArray(cRes.data) ? cRes.data : cRes.data.results ?? []);
      const prods = Array.isArray(pRes.data) ? pRes.data : pRes.data.results ?? [];
      setProducts(prods);
      // Load variants for all products
      const variantPromises = prods.map((p) =>
        api.get(`/products/${p.id}/variants/`).then(({ data }) =>
          (Array.isArray(data) ? data : data.results ?? []).map((v) => ({ ...v, product: p.id }))
        ).catch(() => [])
      );
      const allV = (await Promise.all(variantPromises)).flat();
      setAllVariants(allV);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (id, action) => {
    try {
      await api.post(`/quotations/${id}/${action}/`);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action}`);
    }
  };

  const getCustomerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? `${c.user?.first_name || ''} ${c.user?.last_name || ''}`.trim() || c.user?.email : `#${id}`;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quotations"
        subtitle={`${quotations.length} total quotations`}
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> New Quotation
          </Button>
        }
      />
      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-blue-500" /></div>
        ) : quotations.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={40} />}
            title="No quotations yet"
            description="Create a quotation for a customer"
            action={<Button onClick={() => setShowCreate(true)}><Plus size={15} /> New Quotation</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr className="bg-gray-900/50">
                <Th>Number</Th><Th>Customer</Th><Th>Status</Th>
                <Th>Total</Th><Th>Issue Date</Th><Th>Expiry</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <Tr key={q.id} onClick={() => navigate(`/admin/quotations/${q.id}`)}>
                  <Td className="font-mono text-xs text-blue-400">{q.quotation_number}</Td>
                  <Td className="text-gray-300">{getCustomerName(q.customer)}</Td>
                  <Td><Badge variant={STATUS_VARIANT[q.status] || 'neutral'}>{q.status}</Badge></Td>
                  <Td className="font-semibold text-gray-100">${Number(q.total_amount).toFixed(2)}</Td>
                  <Td className="text-xs text-gray-400">{q.issue_date}</Td>
                  <Td className="text-xs text-gray-400">{q.expiry_date}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/admin/quotations/${q.id}`)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      {q.status === 'DRAFT' && (
                        <button
                          onClick={() => doAction(q.id, 'send')}
                          title="Send Quotation"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          <Send size={14} />
                        </button>
                      )}
                      {q.status === 'SENT' && (
                        <>
                          <button
                            onClick={() => doAction(q.id, 'accept')}
                            title="Accept"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => doAction(q.id, 'reject')}
                            title="Reject"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Quotation"
        size="xl"
      >
        <QuotationForm
          customers={customers}
          products={products}
          allVariants={allVariants}
          onSave={(saved) => { setQuotations((prev) => [saved, ...prev]); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
