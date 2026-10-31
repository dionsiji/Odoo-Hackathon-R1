import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Download, Send, Ban, Slash, FileText } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, Button, Badge, EmptyState, Spinner, Modal,
  Input, Table, Th, Td, Tr,
} from '../../components/ui';

const STATUS_VARIANT = {
  DRAFT: 'neutral', ISSUED: 'info', PAID: 'success',
  PARTIALLY_PAID: 'warning', OVERDUE: 'danger', VOID: 'neutral', CANCELLED: 'neutral',
};

function CreateInvoiceForm({ customers, products, allVariants, taxRates, discounts, onSave, onClose }) {
  const [form, setForm] = useState({
    customer: '', due_date: '', tax_rate: '', discount: '', notes: '', terms: '',
    lines: [{ product: '', variant: null, quantity: 1, unit_price: '0.00' }],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const f = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const updateLine = (i, key, val) =>
    setForm((p) => { const lines = [...p.lines]; lines[i] = { ...lines[i], [key]: val }; return { ...p, lines }; });

  const addLine = () =>
    setForm((p) => ({ ...p, lines: [...p.lines, { product: '', variant: null, quantity: 1, unit_price: '0.00' }] }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = {
        customer: Number(form.customer),
        due_date: form.due_date,
        tax_rate: form.tax_rate ? Number(form.tax_rate) : null,
        discount: form.discount ? Number(form.discount) : null,
        notes: form.notes,
        terms: form.terms,
        lines: form.lines.map((l) => ({
          product: Number(l.product),
          variant: l.variant ? Number(l.variant) : null,
          quantity: Number(l.quantity),
          unit_price: l.unit_price,
        })),
      };
      const { data } = await api.post('/invoices/', payload);
      onSave(data);
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Failed to create invoice');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
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
        <Input label="Due Date" type="date" name="due_date" value={form.due_date} onChange={f} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Tax Rate</label>
          <select name="tax_rate" value={form.tax_rate} onChange={f}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500">
            <option value="">None</option>
            {taxRates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Discount</label>
          <select name="discount" value={form.discount} onChange={f}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500">
            <option value="">None</option>
            {discounts.map((d) => <option key={d.id} value={d.id}>{d.code} ({d.discount_type === 'PERCENTAGE' ? `${d.amount}%` : `$${d.amount}`})</option>)}
          </select>
        </div>
      </div>

      {/* Lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Line Items</label>
          <Button size="xs" variant="outline" type="button" onClick={addLine}><Plus size={12} /> Add Line</Button>
        </div>
        <div className="flex flex-col gap-2">
          {form.lines.map((line, i) => {
            const pVariants = allVariants.filter((v) => v.product === line.product);
            return (
              <div key={i} className="flex items-end gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Product</label>
                  <select value={line.product} onChange={(e) => updateLine(i, 'product', Number(e.target.value))}
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-lg border border-gray-600 bg-gray-700 text-gray-100 outline-none">
                    <option value="">Select…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-xs text-gray-400">Variant</label>
                  <select value={line.variant || ''} onChange={(e) => updateLine(i, 'variant', e.target.value ? Number(e.target.value) : null)}
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-lg border border-gray-600 bg-gray-700 text-gray-100 outline-none">
                    <option value="">None</option>
                    {pVariants.map((v) => <option key={v.id} value={v.id}>{v.variant_name}</option>)}
                  </select>
                </div>
                <div className="w-16">
                  <label className="text-xs text-gray-400">Qty</label>
                  <input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))}
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-lg border border-gray-600 bg-gray-700 text-gray-100 outline-none" />
                </div>
                <div className="w-24">
                  <label className="text-xs text-gray-400">Unit Price</label>
                  <input type="number" step="0.01" value={line.unit_price} onChange={(e) => updateLine(i, 'unit_price', e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-lg border border-gray-600 bg-gray-700 text-gray-100 outline-none" />
                </div>
                <button type="button" onClick={() => setForm((p) => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }))}
                  className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>Create Invoice</Button>
      </div>
    </form>
  );
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [allVariants, setAllVariants] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [acting, setActing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/invoices/'),
      api.get('/customers/'),
      api.get('/products/'),
      api.get('/tax-rates/'),
      api.get('/discounts/'),
    ]).then(async ([invRes, cRes, pRes, taxRes, discRes]) => {
      setInvoices(Array.isArray(invRes.data) ? invRes.data : invRes.data.results ?? []);
      setCustomers(Array.isArray(cRes.data) ? cRes.data : cRes.data.results ?? []);
      const prods = Array.isArray(pRes.data) ? pRes.data : pRes.data.results ?? [];
      setProducts(prods);
      setTaxRates(Array.isArray(taxRes.data) ? taxRes.data : taxRes.data.results ?? []);
      setDiscounts(Array.isArray(discRes.data) ? discRes.data : discRes.data.results ?? []);
      const variantPromises = prods.map((p) =>
        api.get(`/products/${p.id}/variants/`).then(({ data }) =>
          (Array.isArray(data) ? data : data.results ?? []).map((v) => ({ ...v, product: p.id }))
        ).catch(() => [])
      );
      setAllVariants((await Promise.all(variantPromises)).flat());
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (id, action) => {
    setActing(`${id}-${action}`);
    try {
      await api.post(`/invoices/${id}/${action}/`);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action}`);
    } finally { setActing(null); }
  };

  const downloadPdf = async (id, number) => {
    const { data } = await api.get(`/invoices/${id}/pdf/`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a'); a.href = url; a.download = `invoice_${number}.pdf`; a.click();
  };

  const exportCsv = async () => {
    const { data } = await api.get('/export/invoices.csv', { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click();
  };

  const getCustomerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? `${c.user?.first_name || ''} ${c.user?.last_name || ''}`.trim() || c.user?.email : `#${id}`;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} total invoices`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv}><Download size={15} /> Export</Button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={15} /> New Invoice</Button>
          </>
        }
      />
      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-blue-500" /></div>
        ) : invoices.length === 0 ? (
          <EmptyState icon={<FileText size={40} />} title="No invoices yet" action={<Button onClick={() => setShowCreate(true)}><Plus size={15} /> New Invoice</Button>} />
        ) : (
          <Table>
            <thead>
              <tr className="bg-gray-900/50">
                <Th>Invoice</Th><Th>Customer</Th><Th>Status</Th>
                <Th>Total</Th><Th>Due</Th><Th>Paid</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <Tr key={inv.id} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>
                  <Td className="font-mono text-xs text-blue-400">{inv.invoice_number}</Td>
                  <Td className="text-gray-300">{getCustomerName(inv.customer)}</Td>
                  <Td><Badge variant={STATUS_VARIANT[inv.status] || 'neutral'}>{inv.status}</Badge></Td>
                  <Td className="font-semibold text-gray-100">${Number(inv.total_amount).toFixed(2)}</Td>
                  <Td className="text-xs text-gray-400">{inv.due_date}</Td>
                  <Td className="text-sm">
                    <span className="text-green-400">${Number(inv.amount_paid).toFixed(2)}</span>
                    {Number(inv.amount_due) > 0 && (
                      <span className="text-gray-500 ml-1">/ ${Number(inv.amount_due).toFixed(2)} due</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => navigate(`/admin/invoices/${inv.id}`)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Download PDF">
                        <Download size={14} />
                      </button>
                      {inv.status === 'DRAFT' && (
                        <button onClick={() => doAction(inv.id, 'issue')} title="Issue"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                          {acting === `${inv.id}-issue` ? <Spinner size={14} /> : <Send size={14} />}
                        </button>
                      )}
                      {(inv.status === 'DRAFT' || inv.status === 'ISSUED' || inv.status === 'OVERDUE') && (
                        <button onClick={() => doAction(inv.id, 'void')} title="Void"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                          {acting === `${inv.id}-void` ? <Spinner size={14} /> : <Slash size={14} />}
                        </button>
                      )}
                      {inv.status === 'DRAFT' && (
                        <button onClick={() => doAction(inv.id, 'cancel')} title="Cancel"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          {acting === `${inv.id}-cancel` ? <Spinner size={14} /> : <Ban size={14} />}
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Invoice" size="xl">
        <CreateInvoiceForm
          customers={customers}
          products={products}
          allVariants={allVariants}
          taxRates={taxRates}
          discounts={discounts}
          onSave={(saved) => { setInvoices((prev) => [saved, ...prev]); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
