import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText, CreditCard } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardHeader, CardBody, Badge, Button, Spinner, Table, Th, Td, Tr } from '../../components/ui';

const STATUS_VARIANT = { ACTIVE: 'success', INACTIVE: 'neutral', SUSPENDED: 'danger' };
const SUB_VARIANT = { ACTIVE: 'success', PAUSED: 'warning', DRAFT: 'info', CLOSED: 'neutral' };
const INV_VARIANT = {
  DRAFT: 'neutral', ISSUED: 'info', PAID: 'success',
  PARTIALLY_PAID: 'warning', OVERDUE: 'danger', VOID: 'neutral', CANCELLED: 'neutral',
};

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-800 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-200 font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/customers/${id}/`),
      api.get('/subscriptions/').then(({ data }) => {
        const all = Array.isArray(data) ? data : data.results ?? [];
        return all.filter((s) => s.customer === Number(id) || s.customer_id === Number(id));
      }),
      api.get('/invoices/').then(({ data }) => {
        const all = Array.isArray(data) ? data : data.results ?? [];
        return all.filter((inv) => inv.customer === Number(id) || inv.customer_id === Number(id));
      }),
    ])
      .then(([custRes, subs, invs]) => {
        setCustomer(custRes.data);
        setSubscriptions(subs);
        setInvoices(invs);
      })
      .catch(() => navigate('/admin/customers'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} className="text-blue-500" />
      </div>
    );
  }

  if (!customer) return null;

  const u = customer.user || {};
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
            {u.first_name?.charAt(0) || u.email?.charAt(0) || '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-50">{fullName}</h1>
            <p className="text-sm text-gray-400">{u.email}</p>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[customer.status] || 'neutral'} className="ml-2">
          {customer.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile */}
        <Card className="lg:col-span-1">
          <CardHeader><p className="text-sm font-semibold text-gray-200">Profile</p></CardHeader>
          <CardBody className="py-2">
            <InfoRow label="Full Name" value={fullName} />
            <InfoRow label="Email" value={u.email} />
            <InfoRow label="Company" value={customer.company_name} />
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Address" value={[customer.address_line1, customer.city, customer.state, customer.country].filter(Boolean).join(', ')} />
            <InfoRow label="Postal Code" value={customer.postal_code} />
            <InfoRow label="Status" value={customer.status} />
            <InfoRow label="Member Since" value={customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '—'} />
          </CardBody>
        </Card>

        {/* Right column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Subscriptions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw size={15} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-200">Subscriptions ({subscriptions.length})</p>
              </div>
              <Link to={`/admin/subscriptions?customer=${id}`} className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
            </CardHeader>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-gray-500 px-5 py-6">No subscriptions found</p>
            ) : (
              <Table>
                <thead>
                  <tr className="bg-gray-900/50">
                    <Th>Number</Th><Th>Status</Th><Th>Start</Th><Th>Next Billing</Th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.slice(0, 5).map((s) => (
                    <Tr key={s.id} onClick={() => navigate(`/admin/subscriptions/${s.id}`)}>
                      <Td className="font-mono text-xs text-blue-400">{s.subscription_number}</Td>
                      <Td><Badge variant={SUB_VARIANT[s.status] || 'neutral'}>{s.status}</Badge></Td>
                      <Td className="text-xs">{s.start_date}</Td>
                      <Td className="text-xs">{s.next_billing_date || '—'}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-200">Invoices ({invoices.length})</p>
              </div>
              <Link to={`/admin/invoices?customer=${id}`} className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
            </CardHeader>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500 px-5 py-6">No invoices found</p>
            ) : (
              <Table>
                <thead>
                  <tr className="bg-gray-900/50">
                    <Th>Invoice</Th><Th>Status</Th><Th>Total</Th><Th>Due</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 5).map((inv) => (
                    <Tr key={inv.id} onClick={() => navigate(`/admin/invoices/${inv.id}`)}>
                      <Td className="font-mono text-xs text-blue-400">{inv.invoice_number}</Td>
                      <Td><Badge variant={INV_VARIANT[inv.status] || 'neutral'}>{inv.status}</Badge></Td>
                      <Td className="text-gray-200">${Number(inv.total_amount).toFixed(2)}</Td>
                      <Td className="text-xs text-gray-400">{inv.due_date}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
