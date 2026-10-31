import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, Trash2, Edit, Eye } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, Button, Input, Table, Th, Td, Tr,
  Badge, EmptyState, Spinner, Modal,
} from '../../components/ui';
import { clsx } from 'clsx';

const STATUS_VARIANT = { ACTIVE: 'success', INACTIVE: 'neutral', SUSPENDED: 'danger' };

function CustomerForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || { company_name: '', phone: '', address_line1: '', city: '', state: '', postal_code: '', country: '', status: 'ACTIVE' }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (initial?.id) {
        const { data } = await api.patch(`/customers/${initial.id}/`, form);
        onSave(data);
      } else {
        setError('Creating a customer requires creating a user account first. Use the backend admin or register the user, then edit their profile here.');
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-sm font-medium text-gray-300">Company Name</label>
          <input name="company_name" value={form.company_name} onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Status</label>
          <select name="status" value={form.status} onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-sm font-medium text-gray-300">Address</label>
          <input name="address_line1" value={form.address_line1} onChange={handleChange} placeholder="Street address"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">City</label>
          <input name="city" value={form.city} onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Country</label>
          <input name="country" value={form.country} onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-100 outline-none focus:border-blue-500" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/customers/')
      .then(({ data }) => setCustomers(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.user?.email?.toLowerCase().includes(q) ||
      c.user?.first_name?.toLowerCase().includes(q) ||
      c.user?.last_name?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.delete(`/customers/${id}/`);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Failed to delete customer.');
    } finally {
      setDeleting(null);
    }
  };

  const exportCsv = async () => {
    const { data } = await api.get('/export/customers.csv', { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} total customers`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              <Download size={15} /> Export CSV
            </Button>
          </>
        }
      />

      <Card>
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, city…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size={28} className="text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={40} />}
            title="No customers found"
            description={search ? 'Try a different search term' : 'No customers yet'}
          />
        ) : (
          <Table>
            <thead>
              <tr className="bg-gray-900/50">
                <Th>Customer</Th>
                <Th>Company</Th>
                <Th>Phone</Th>
                <Th>Location</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <Tr key={c.id} onClick={() => navigate(`/admin/customers/${c.id}`)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {c.user?.first_name?.charAt(0) || c.user?.email?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-100">
                          {c.user?.first_name} {c.user?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{c.user?.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-gray-300">{c.company_name || '—'}</Td>
                  <Td className="text-gray-400">{c.phone || '—'}</Td>
                  <Td className="text-gray-400">
                    {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                  </Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[c.status] || 'neutral'}>{c.status}</Badge>
                  </Td>
                  <Td className="text-gray-500 text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => { setEditTarget(c); setShowEdit(true); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        {deleting === c.id ? <Spinner size={14} /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => { setShowEdit(false); setEditTarget(null); }}
        title="Edit Customer"
        size="md"
      >
        <CustomerForm
          initial={editTarget}
          onSave={(updated) => {
            setCustomers((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
            setShowEdit(false);
          }}
          onClose={() => { setShowEdit(false); setEditTarget(null); }}
        />
      </Modal>
    </div>
  );
}
