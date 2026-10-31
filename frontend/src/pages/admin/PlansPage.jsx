import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Zap } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, Button, Badge, EmptyState, Spinner, Modal,
  Input, Select, Textarea, Table, Th, Td, Tr,
} from '../../components/ui';

const INTERVAL_VARIANT = { MONTHLY: 'info', QUARTERLY: 'brand', YEARLY: 'success' };

function PlanForm({ initial, products, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || {
      name: '', description: '', product: '', variant: '',
      price: '', billing_interval: 'MONTHLY', trial_period_days: 0, is_active: true,
    }
  );
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load variants when product changes
  useEffect(() => {
    if (!form.product) { setVariants([]); return; }
    api.get(`/products/${form.product}/variants/`)
      .then(({ data }) => setVariants(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setVariants([]));
  }, [form.product]);

  const f = (e) =>
    setForm((p) => ({
      ...p,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        product: Number(form.product),
        variant: form.variant ? Number(form.variant) : null,
        trial_period_days: Number(form.trial_period_days) || 0,
      };
      const { data } = initial?.id
        ? await api.patch(`/plans/${initial.id}/`, payload)
        : await api.post('/plans/', payload);
      onSave(data);
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
      <Input label="Plan Name" name="name" value={form.name} onChange={f} required placeholder="Storage Pro Monthly" />
      <Textarea label="Description" name="description" value={form.description} onChange={f} rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Product <span className="text-red-400">*</span></label>
          <select name="product" value={form.product} onChange={f} required
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500">
            <option value="">Select product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Variant (optional)</label>
          <select name="variant" value={form.variant} onChange={f}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500"
            disabled={!form.product}>
            <option value="">None</option>
            {variants.map((v) => <option key={v.id} value={v.id}>{v.variant_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="Price ($)" type="number" step="0.01" name="price" value={form.price} onChange={f} required placeholder="45.00" />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Billing Interval</label>
          <select name="billing_interval" value={form.billing_interval} onChange={f}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500">
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
        <Input label="Trial Days" type="number" name="trial_period_days" value={form.trial_period_days} onChange={f} placeholder="0" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" name="is_active" checked={form.is_active} onChange={f} className="w-4 h-4 rounded accent-blue-500" />
        <span className="text-sm text-gray-300">Active</span>
      </label>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Update' : 'Create Plan'}</Button>
      </div>
    </form>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/plans/'), api.get('/products/')])
      .then(([planRes, prodRes]) => {
        setPlans(Array.isArray(planRes.data) ? planRes.data : planRes.data.results ?? []);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.results ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plan?')) return;
    await api.delete(`/plans/${id}/`).catch(() => alert('Could not delete plan.'));
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const getProductName = (id) => products.find((p) => p.id === id)?.name || `Product #${id}`;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Subscription Plans"
        subtitle={`${plans.length} plans configured`}
        actions={
          <Button size="sm" onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <Plus size={15} /> Create Plan
          </Button>
        }
      />
      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-blue-500" /></div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={<Zap size={40} />}
            title="No plans yet"
            description="Create your first subscription plan"
            action={<Button onClick={() => setShowModal(true)}><Plus size={15} /> Create Plan</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr className="bg-gray-900/50">
                <Th>Plan</Th>
                <Th>Product</Th>
                <Th>Price</Th>
                <Th>Interval</Th>
                <Th>Trial</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <Tr key={plan.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Zap size={14} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-100">{plan.name}</p>
                        {plan.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{plan.description}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td className="text-gray-400">{getProductName(plan.product)}</Td>
                  <Td className="font-semibold text-gray-100">${Number(plan.price).toFixed(2)}</Td>
                  <Td>
                    <Badge variant={INTERVAL_VARIANT[plan.billing_interval] || 'neutral'}>
                      {plan.billing_interval}
                    </Badge>
                  </Td>
                  <Td className="text-gray-400">
                    {plan.trial_period_days > 0 ? `${plan.trial_period_days} days` : 'None'}
                  </Td>
                  <Td>
                    <Badge variant={plan.is_active ? 'success' : 'neutral'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditTarget(plan); setShowModal(true); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Plan' : 'Create Subscription Plan'}
        size="lg"
      >
        <PlanForm
          initial={editTarget}
          products={products}
          onSave={(saved) => {
            setPlans((prev) =>
              editTarget ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]
            );
            setShowModal(false);
          }}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      </Modal>
    </div>
  );
}
