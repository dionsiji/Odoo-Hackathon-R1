import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Package, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, Button, Badge, EmptyState, Spinner, Modal,
  Input, Select, Textarea, Table, Th, Td, Tr,
} from '../../components/ui';
import { clsx } from 'clsx';

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || { name: '', description: '', sku: '', category: '', is_active: true }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const f = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = initial?.id
        ? await api.patch(`/products/${initial.id}/`, form)
        : await api.post('/products/', form);
      onSave(data);
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
      <Input label="Product Name" name="name" value={form.name} onChange={f} required placeholder="e.g. Cloud Storage" />
      <Textarea label="Description" name="description" value={form.description} onChange={f} placeholder="Optional description" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="SKU" name="sku" value={form.sku} onChange={f} required placeholder="PROD-001" />
        <Input label="Category" name="category" value={form.category} onChange={f} placeholder="Infrastructure" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" name="is_active" checked={form.is_active} onChange={f}
          className="w-4 h-4 rounded accent-blue-500" />
        <span className="text-sm text-gray-300">Active (visible to customers)</span>
      </label>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}

function VariantForm({ productId, initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || { variant_name: '', sku: '', description: '', price: '', is_active: true }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const f = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = initial?.id
        ? await api.patch(`/products/${productId}/variants/${initial.id}/`, form)
        : await api.post(`/products/${productId}/variants/`, form);
      onSave(data);
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
      <Input label="Variant Name" name="variant_name" value={form.variant_name} onChange={f} required placeholder="e.g. 1TB Tier" />
      <Textarea label="Description" name="description" value={form.description} onChange={f} rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="SKU" name="sku" value={form.sku} onChange={f} required placeholder="VAR-001" />
        <Input label="Price ($)" type="number" step="0.01" name="price" value={form.price} onChange={f} required placeholder="49.99" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" name="is_active" checked={form.is_active} onChange={f}
          className="w-4 h-4 rounded accent-blue-500" />
        <span className="text-sm text-gray-300">Active</span>
      </label>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Update' : 'Add Variant'}</Button>
      </div>
    </form>
  );
}

function ProductRow({ product, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [variants, setVariants] = useState(product.variants || []);
  const [loadingV, setLoadingV] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editVariant, setEditVariant] = useState(null);

  const loadVariants = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (variants.length === 0) {
      setLoadingV(true);
      try {
        const { data } = await api.get(`/products/${product.id}/variants/`);
        setVariants(Array.isArray(data) ? data : data.results ?? []);
      } finally { setLoadingV(false); }
    }
  };

  return (
    <>
      <Tr>
        <Td>
          <button onClick={loadVariants} className="p-1 rounded text-gray-500 hover:text-gray-300">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </Td>
        <Td>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
              <Package size={14} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-100">{product.name}</p>
              {product.category && <p className="text-xs text-gray-500">{product.category}</p>}
            </div>
          </div>
        </Td>
        <Td className="font-mono text-xs text-gray-400">{product.sku}</Td>
        <Td><Badge variant={product.is_active ? 'success' : 'neutral'}>{product.is_active ? 'Active' : 'Inactive'}</Badge></Td>
        <Td className="text-xs text-gray-500">{product.created_at ? new Date(product.created_at).toLocaleDateString() : '—'}</Td>
        <Td>
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => onEdit(product)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
              <Edit size={14} />
            </button>
            <button onClick={() => onDelete(product.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </Td>
      </Tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-gray-800/30 border-t border-gray-800">
            <div className="px-8 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Variants</p>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => { setEditVariant(null); setShowVariantModal(true); }}
                >
                  <Plus size={12} /> Add Variant
                </Button>
              </div>
              {loadingV ? (
                <div className="py-4 flex justify-center"><Spinner size={18} className="text-blue-500" /></div>
              ) : variants.length === 0 ? (
                <p className="text-sm text-gray-500 py-3">No variants yet</p>
              ) : (
                <div className="space-y-1.5">
                  {variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800 border border-gray-700">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm text-gray-200">{v.variant_name}</p>
                          <p className="text-xs text-gray-500 font-mono">{v.sku}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-semibold text-gray-100">${Number(v.price).toFixed(2)}</p>
                        <Badge variant={v.is_active ? 'success' : 'neutral'}>{v.is_active ? 'Active' : 'Inactive'}</Badge>
                        <button
                          onClick={() => { setEditVariant(v); setShowVariantModal(true); }}
                          className="p-1 rounded text-gray-500 hover:text-blue-400 transition-colors"
                        >
                          <Edit size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
      <Modal
        open={showVariantModal}
        onClose={() => { setShowVariantModal(false); setEditVariant(null); }}
        title={editVariant ? 'Edit Variant' : 'Add Variant'}
      >
        <VariantForm
          productId={product.id}
          initial={editVariant}
          onSave={(saved) => {
            setVariants((prev) =>
              editVariant ? prev.map((v) => (v.id === saved.id ? saved : v)) : [...prev, saved]
            );
            setShowVariantModal(false);
          }}
          onClose={() => { setShowVariantModal(false); setEditVariant(null); }}
        />
      </Modal>
    </>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/products/')
      .then(({ data }) => setProducts(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await api.delete(`/products/${id}/`).catch(() => alert('Could not delete product.'));
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Products"
        subtitle={`${products.length} products in catalog`}
        actions={
          <Button size="sm" onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <Plus size={15} /> Add Product
          </Button>
        }
      />
      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-blue-500" /></div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package size={40} />}
            title="No products yet"
            description="Add your first product to get started"
            action={<Button onClick={() => setShowModal(true)}><Plus size={15} /> Add Product</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr className="bg-gray-900/50">
                <Th className="w-8"></Th>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onEdit={(prod) => { setEditTarget(prod); setShowModal(true); }}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Product' : 'Add Product'}
      >
        <ProductForm
          initial={editTarget}
          onSave={(saved) => {
            setProducts((prev) =>
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
