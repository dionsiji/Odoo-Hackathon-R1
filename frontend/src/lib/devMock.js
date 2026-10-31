/**
 * Development-only Mock Data Engine
 * Activated ONLY when import.meta.env.DEV is true AND bl_dev_preview is enabled.
 * Tree-shaken out in production builds.
 */

export const mockAnalyticsOverview = {
  metrics: {
    active_subscriptions: 148,
    mrr: 24650.00,
    arr: 295800.00,
    overdue_invoices: 4,
    pending_quotations: 7,
  },
  revenue_trend: [
    { month: 'Nov 2025', revenue: 18200, subscriptions: 112 },
    { month: 'Dec 2025', revenue: 20100, subscriptions: 124 },
    { month: 'Jan 2026', revenue: 21500, subscriptions: 130 },
    { month: 'Feb 2026', revenue: 22800, subscriptions: 138 },
    { month: 'Mar 2026', revenue: 23900, subscriptions: 142 },
    { month: 'Apr 2026', revenue: 24650, subscriptions: 148 },
  ],
  status_distribution: {
    ACTIVE: 124,
    PAUSED: 16,
    DRAFT: 8,
  },
  recent_activities: [
    { id: 101, action: 'PAYMENT_RECORDED', actor_email: 'billing@brightloop.local', object_type: 'Invoice', object_repr: 'INV-2026-0042', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), metadata: { amount: '499.00', method: 'STRIPE' } },
    { id: 102, action: 'ACTIVATED', actor_email: 'staff@brightloop.local', object_type: 'Subscription', object_repr: 'SUB-2026-0089', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), metadata: { plan: 'Enterprise Cloud' } },
    { id: 103, action: 'STATUS_CHANGED', actor_email: 'admin@brightloop.local', object_type: 'Quotation', object_repr: 'QUO-2026-0112', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), metadata: { status: 'ACCEPTED' } },
    { id: 104, action: 'CREATED', actor_email: 'staff@brightloop.local', object_type: 'CustomerProfile', object_repr: 'Acme Global Corp', created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(), metadata: { company: 'Acme Global Corp' } },
  ],
};

export const mockCustomers = [
  {
    id: 1,
    user: { id: 10, email: 'alex.rivera@acme.com', first_name: 'Alex', last_name: 'Rivera' },
    company_name: 'Acme Global Corp',
    phone: '+1 (555) 234-5678',
    address_line1: '100 Market St, Suite 400',
    city: 'San Francisco',
    country: 'United States',
    status: 'ACTIVE',
    created_at: '2026-01-15T09:00:00Z',
  },
  {
    id: 2,
    user: { id: 11, email: 'sarah.connor@cyberdyne.io', first_name: 'Sarah', last_name: 'Connor' },
    company_name: 'Cyberdyne Systems',
    phone: '+1 (555) 987-6543',
    address_line1: '742 Evergreen Terrace',
    city: 'Austin',
    country: 'United States',
    status: 'ACTIVE',
    created_at: '2026-02-01T11:20:00Z',
  },
  {
    id: 3,
    user: { id: 12, email: 'elena.rostova@nexus.tech', first_name: 'Elena', last_name: 'Rostova' },
    company_name: 'Nexus Technologies GmbH',
    phone: '+49 30 123456',
    address_line1: 'Friedrichstraße 12',
    city: 'Berlin',
    country: 'Germany',
    status: 'ACTIVE',
    created_at: '2026-02-20T14:15:00Z',
  },
  {
    id: 4,
    user: { id: 13, email: 'marcus.vance@vancemedia.com', first_name: 'Marcus', last_name: 'Vance' },
    company_name: 'Vance Digital Media',
    phone: '+44 20 7946 0991',
    address_line1: '221B Baker Street',
    city: 'London',
    country: 'United Kingdom',
    status: 'INACTIVE',
    created_at: '2026-03-05T16:30:00Z',
  },
];

export const mockProducts = [
  {
    id: 1,
    name: 'Brightloop Cloud ERP',
    sku: 'PROD-BL-ERP',
    category: 'SaaS Platform',
    description: 'All-in-one ERP suite with accounting, inventory, and recurring billing modules.',
    is_active: true,
    variants: [
      { id: 11, product: 1, variant_name: 'Standard Cloud', sku: 'PROD-BL-ERP-STD', price: '199.00', is_active: true },
      { id: 12, product: 1, variant_name: 'Dedicated Enterprise', sku: 'PROD-BL-ERP-ENT', price: '799.00', is_active: true },
    ],
  },
  {
    id: 2,
    name: 'Advanced Analytics Add-on',
    sku: 'PROD-BL-ANA',
    category: 'Add-ons',
    description: 'Real-time forecasting, AI cohort analysis, and executive KPI export reporting.',
    is_active: true,
    variants: [
      { id: 21, product: 2, variant_name: 'Pro Analytics', sku: 'PROD-BL-ANA-PRO', price: '99.00', is_active: true },
    ],
  },
  {
    id: 3,
    name: 'Enterprise Support SLA',
    sku: 'PROD-BL-SUP',
    category: 'Support',
    description: '24/7 priority support with 15-minute response time SLA and dedicated solution architect.',
    is_active: true,
    variants: [
      { id: 31, product: 3, variant_name: '24/7 Dedicated', sku: 'PROD-BL-SUP-247', price: '350.00', is_active: true },
    ],
  },
];

export const mockPlans = [
  {
    id: 1,
    name: 'Startup Monthly',
    product: 1,
    product_name: 'Brightloop Cloud ERP',
    variant: 11,
    variant_name: 'Standard Cloud',
    billing_interval: 'MONTHLY',
    price: '199.00',
    trial_days: 14,
    is_active: true,
  },
  {
    id: 2,
    name: 'Enterprise Annual',
    product: 1,
    product_name: 'Brightloop Cloud ERP',
    variant: 12,
    variant_name: 'Dedicated Enterprise',
    billing_interval: 'ANNUAL',
    price: '7990.00',
    trial_days: 30,
    is_active: true,
  },
  {
    id: 3,
    name: 'Analytics Pro Quarterly',
    product: 2,
    product_name: 'Advanced Analytics Add-on',
    variant: 21,
    variant_name: 'Pro Analytics',
    billing_interval: 'QUARTERLY',
    price: '270.00',
    trial_days: 7,
    is_active: true,
  },
];

export const mockQuotations = [
  {
    id: 1,
    quotation_number: 'QUO-2026-0112',
    customer: 1,
    customer_email: 'alex.rivera@acme.com',
    customer_company: 'Acme Global Corp',
    issue_date: '2026-03-25',
    expiry_date: '2026-04-25',
    status: 'ACCEPTED',
    subtotal: '998.00',
    discount_amount: '50.00',
    tax_amount: '94.80',
    total_amount: '1042.80',
    notes: 'Includes first-year early adopter onboarding guarantee.',
    terms: 'Net 30 payment terms upon invoice issuance.',
    created_by_email: 'staff@brightloop.local',
    created_at: '2026-03-25T10:00:00Z',
    lines: [
      { id: 1, product: 1, product_name: 'Brightloop Cloud ERP', variant: 11, variant_name: 'Standard Cloud', quantity: 2, unit_price: '199.00', line_total: '398.00' },
      { id: 2, product: 2, product_name: 'Advanced Analytics Add-on', variant: 21, variant_name: 'Pro Analytics', quantity: 1, unit_price: '600.00', line_total: '600.00' },
    ],
  },
  {
    id: 2,
    quotation_number: 'QUO-2026-0113',
    customer: 2,
    customer_email: 'sarah.connor@cyberdyne.io',
    customer_company: 'Cyberdyne Systems',
    issue_date: '2026-03-28',
    expiry_date: '2026-04-28',
    status: 'SENT',
    subtotal: '7990.00',
    discount_amount: '500.00',
    tax_amount: '749.00',
    total_amount: '8239.00',
    notes: 'Custom dedicated cluster deployment in Frankfurt region.',
    terms: 'Valid for 30 calendar days.',
    created_by_email: 'admin@brightloop.local',
    created_at: '2026-03-28T14:30:00Z',
    lines: [
      { id: 3, product: 1, product_name: 'Brightloop Cloud ERP', variant: 12, variant_name: 'Dedicated Enterprise', quantity: 1, unit_price: '7990.00', line_total: '7990.00' },
    ],
  },
  {
    id: 3,
    quotation_number: 'QUO-2026-0114',
    customer: 3,
    customer_email: 'elena.rostova@nexus.tech',
    customer_company: 'Nexus Technologies GmbH',
    issue_date: '2026-04-01',
    expiry_date: '2026-05-01',
    status: 'DRAFT',
    subtotal: '350.00',
    discount_amount: '0.00',
    tax_amount: '35.00',
    total_amount: '385.00',
    notes: 'Draft awaiting customer confirmation on technical SLA specs.',
    created_by_email: 'staff@brightloop.local',
    created_at: '2026-04-01T09:15:00Z',
    lines: [
      { id: 4, product: 3, product_name: 'Enterprise Support SLA', variant: 31, variant_name: '24/7 Dedicated', quantity: 1, unit_price: '350.00', line_total: '350.00' },
    ],
  },
];

export const mockSubscriptions = [
  {
    id: 1,
    subscription_number: 'SUB-2026-0089',
    customer: 1,
    customer_email: 'alex.rivera@acme.com',
    customer_company: 'Acme Global Corp',
    quotation: 1,
    quotation_number: 'QUO-2026-0112',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    next_billing_date: '2026-05-01',
    status: 'ACTIVE',
    created_by_email: 'admin@brightloop.local',
    created_at: '2026-01-01T00:00:00Z',
    lines: [
      { id: 1, product: 1, product_name: 'Brightloop Cloud ERP', variant: 11, variant_name: 'Standard Cloud', plan: 1, plan_name: 'Startup Monthly', quantity: 2, unit_price: '199.00', line_total: '398.00' },
    ],
  },
  {
    id: 2,
    subscription_number: 'SUB-2026-0090',
    customer: 2,
    customer_email: 'sarah.connor@cyberdyne.io',
    customer_company: 'Cyberdyne Systems',
    quotation: 2,
    quotation_number: 'QUO-2026-0113',
    start_date: '2026-02-15',
    end_date: '2027-02-14',
    next_billing_date: '2027-02-15',
    status: 'ACTIVE',
    created_by_email: 'staff@brightloop.local',
    created_at: '2026-02-15T12:00:00Z',
    lines: [
      { id: 2, product: 1, product_name: 'Brightloop Cloud ERP', variant: 12, variant_name: 'Dedicated Enterprise', plan: 2, plan_name: 'Enterprise Annual', quantity: 1, unit_price: '7990.00', line_total: '7990.00' },
    ],
  },
  {
    id: 3,
    subscription_number: 'SUB-2026-0091',
    customer: 3,
    customer_email: 'elena.rostova@nexus.tech',
    customer_company: 'Nexus Technologies GmbH',
    start_date: '2026-03-01',
    end_date: '2026-09-01',
    next_billing_date: '2026-05-01',
    status: 'PAUSED',
    created_by_email: 'admin@brightloop.local',
    created_at: '2026-03-01T10:00:00Z',
    lines: [
      { id: 3, product: 2, product_name: 'Advanced Analytics Add-on', variant: 21, variant_name: 'Pro Analytics', plan: 3, plan_name: 'Analytics Pro Quarterly', quantity: 1, unit_price: '270.00', line_total: '270.00' },
    ],
  },
];

export const mockInvoices = [
  {
    id: 1,
    invoice_number: 'INV-2026-0042',
    customer: 1,
    customer_details: {
      id: 1,
      company_name: 'Acme Global Corp',
      user: { email: 'alex.rivera@acme.com', first_name: 'Alex', last_name: 'Rivera' },
    },
    subscription: 1,
    quotation: 1,
    issue_date: '2026-04-01',
    due_date: '2026-04-30',
    status: 'PAID',
    subtotal: '398.00',
    discount_amount: '0.00',
    tax_amount: '39.80',
    total_amount: '437.80',
    amount_paid: '437.80',
    amount_due: '0.00',
    created_by_email: 'billing@brightloop.local',
    created_at: '2026-04-01T08:00:00Z',
    lines: [
      { id: 1, description: 'Brightloop Cloud ERP - Standard Monthly', product_name: 'Brightloop Cloud ERP', variant_name: 'Standard Cloud', plan_name: 'Startup Monthly', quantity: 2, unit_price: '199.00', line_total: '398.00' },
    ],
  },
  {
    id: 2,
    invoice_number: 'INV-2026-0043',
    customer: 2,
    customer_details: {
      id: 2,
      company_name: 'Cyberdyne Systems',
      user: { email: 'sarah.connor@cyberdyne.io', first_name: 'Sarah', last_name: 'Connor' },
    },
    subscription: 2,
    issue_date: '2026-04-10',
    due_date: '2026-05-10',
    status: 'ISSUED',
    subtotal: '7990.00',
    discount_amount: '500.00',
    tax_amount: '749.00',
    total_amount: '8239.00',
    amount_paid: '0.00',
    amount_due: '8239.00',
    created_by_email: 'billing@brightloop.local',
    created_at: '2026-04-10T09:30:00Z',
    lines: [
      { id: 2, description: 'Dedicated Enterprise Cloud Platform - 1 Year', product_name: 'Brightloop Cloud ERP', variant_name: 'Dedicated Enterprise', plan_name: 'Enterprise Annual', quantity: 1, unit_price: '7990.00', line_total: '7990.00' },
    ],
  },
  {
    id: 3,
    invoice_number: 'INV-2026-0044',
    customer: 3,
    customer_details: {
      id: 3,
      company_name: 'Nexus Technologies GmbH',
      user: { email: 'elena.rostova@nexus.tech', first_name: 'Elena', last_name: 'Rostova' },
    },
    issue_date: '2026-03-15',
    due_date: '2026-04-15',
    status: 'OVERDUE',
    subtotal: '270.00',
    discount_amount: '0.00',
    tax_amount: '27.00',
    total_amount: '297.00',
    amount_paid: '0.00',
    amount_due: '297.00',
    created_by_email: 'billing@brightloop.local',
    created_at: '2026-03-15T11:00:00Z',
    lines: [
      { id: 3, description: 'Advanced Analytics Add-on Quarterly Subscription', product_name: 'Advanced Analytics Add-on', variant_name: 'Pro Analytics', plan_name: 'Analytics Pro Quarterly', quantity: 1, unit_price: '270.00', line_total: '270.00' },
    ],
  },
];

export const mockPayments = [
  {
    id: 1,
    transaction_ref: 'TXN-BL-98124',
    invoice: 1,
    invoice_number: 'INV-2026-0042',
    customer: 1,
    customer_email: 'alex.rivera@acme.com',
    amount: '437.80',
    payment_method: 'STRIPE',
    status: 'COMPLETED',
    notes: 'Auto-charged via Stripe Checkout',
    paid_at: '2026-04-01T08:15:22Z',
    recorded_by_email: 'billing@brightloop.local',
  },
  {
    id: 2,
    transaction_ref: 'TXN-BL-97451',
    invoice: 2,
    invoice_number: 'INV-2026-0043',
    customer: 2,
    customer_email: 'sarah.connor@cyberdyne.io',
    amount: '1500.00',
    payment_method: 'BANK_TRANSFER',
    status: 'COMPLETED',
    notes: 'Initial wire transfer advance payment',
    paid_at: '2026-04-12T14:40:00Z',
    recorded_by_email: 'staff@brightloop.local',
  },
];

export const mockNotifications = [
  { id: 1, title: 'Invoice INV-2026-0042 Paid', message: 'Payment of $437.80 was successfully processed via Stripe.', is_read: false, created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
  { id: 2, title: 'New Quotation Accepted', message: 'Cyberdyne Systems accepted quotation QUO-2026-0113.', is_read: false, created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
  { id: 3, title: 'Overdue Notice', message: 'Invoice INV-2026-0044 for Nexus Technologies is now past due.', is_read: false, created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString() },
];

/**
 * Dispatches simulated mock response for preview mode
 */
export function handleDevMockRequest(config) {
  const url = config.url.replace(/^\/api\/v1/, '').split('?')[0];

  // Overview & Analytics
  if (url === '/analytics/overview/' || url === '/analytics/overview') {
    return { data: mockAnalyticsOverview, status: 200 };
  }
  if (url === '/analytics/revenue/' || url === '/analytics/revenue') {
    return {
      data: {
        revenue_trend: mockAnalyticsOverview.revenue_trend,
        mrr_breakdown: [
          { plan: 'Startup Monthly', mrr: 12400 },
          { plan: 'Enterprise Annual', mrr: 8900 },
          { plan: 'Analytics Add-on', mrr: 3350 },
        ],
        churn_rate: '1.2%',
      },
      status: 200,
    };
  }

  // Customers
  if (url === '/customers/' || url === '/customers') {
    return { data: mockCustomers, status: 200 };
  }
  const custMatch = url.match(/^\/customers\/(\d+)\/?$/);
  if (custMatch) {
    const c = mockCustomers.find((item) => item.id === Number(custMatch[1])) || mockCustomers[0];
    return { data: c, status: 200 };
  }

  // Products
  if (url === '/products/' || url === '/products') {
    return { data: mockProducts, status: 200 };
  }
  const prodMatch = url.match(/^\/products\/(\d+)\/?$/);
  if (prodMatch) {
    const p = mockProducts.find((item) => item.id === Number(prodMatch[1])) || mockProducts[0];
    return { data: p, status: 200 };
  }
  const varMatch = url.match(/^\/products\/(\d+)\/variants\/?$/);
  if (varMatch) {
    const p = mockProducts.find((item) => item.id === Number(varMatch[1])) || mockProducts[0];
    return { data: p.variants || [], status: 200 };
  }

  // Plans
  if (url === '/plans/' || url === '/plans') {
    return { data: mockPlans, status: 200 };
  }

  // Quotations
  if (url === '/quotations/' || url === '/quotations') {
    return { data: mockQuotations, status: 200 };
  }
  const quoMatch = url.match(/^\/quotations\/(\d+)\/?$/);
  if (quoMatch) {
    const q = mockQuotations.find((item) => item.id === Number(quoMatch[1])) || mockQuotations[0];
    return { data: q, status: 200 };
  }
  if (url.includes('/generate-invoice/')) {
    return { data: { id: 1, invoice_number: 'INV-2026-0042' }, status: 201 };
  }

  // Subscriptions
  if (url === '/subscriptions/' || url === '/subscriptions') {
    return { data: mockSubscriptions, status: 200 };
  }
  const subMatch = url.match(/^\/subscriptions\/(\d+)\/?$/);
  if (subMatch) {
    const s = mockSubscriptions.find((item) => item.id === Number(subMatch[1])) || mockSubscriptions[0];
    return { data: s, status: 200 };
  }

  // Invoices
  if (url === '/invoices/' || url === '/invoices') {
    return { data: mockInvoices, status: 200 };
  }
  const invMatch = url.match(/^\/invoices\/(\d+)\/?$/);
  if (invMatch) {
    const inv = mockInvoices.find((item) => item.id === Number(invMatch[1])) || mockInvoices[0];
    return { data: inv, status: 200 };
  }
  if (url.includes('/pdf/')) {
    const blob = new Blob(['%PDF-1.4 Mock PDF Content for Dev Preview'], { type: 'application/pdf' });
    return { data: blob, status: 200 };
  }

  // Payments
  if (url === '/payments/' || url === '/payments') {
    return { data: mockPayments, status: 200 };
  }

  // Activity Logs
  if (url === '/activity-logs/' || url === '/activity-logs') {
    return { data: mockAnalyticsOverview.recent_activities, status: 200 };
  }

  // Notifications
  if (url === '/notifications/' || url === '/notifications') {
    return { data: mockNotifications, status: 200 };
  }

  // Global Search
  if (url.includes('/search/')) {
    return {
      data: {
        customers: mockCustomers.slice(0, 2),
        products: mockProducts.slice(0, 2),
        invoices: mockInvoices.slice(0, 2),
        quotations: mockQuotations.slice(0, 2),
        subscriptions: mockSubscriptions.slice(0, 2),
      },
      status: 200,
    };
  }

  // Auth Me
  if (url.includes('/auth/me/')) {
    const role = localStorage.getItem('bl_dev_role') || 'ADMIN';
    return {
      data: {
        id: 1,
        email: `devika.${role.toLowerCase()}@brightloop.local`,
        full_name: `Devika (${role === 'ADMIN' ? 'Admin' : 'Staff'} Preview)`,
        role,
      },
      status: 200,
    };
  }

  // Default success for any POST / PUT actions
  return {
    data: {
      status: 'success',
      detail: 'Simulated operation succeeded in Dev Preview Mode.',
      id: Math.floor(Math.random() * 1000) + 10,
    },
    status: 200,
  };
}
