import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import DashboardLayout from './components/DashboardLayout';

// Auth Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Admin / Staff Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CustomersPage from './pages/admin/CustomersPage';
import CustomerDetail from './pages/admin/CustomerDetail';
import ProductsPage from './pages/admin/ProductsPage';
import PlansPage from './pages/admin/PlansPage';
import QuotationsPage from './pages/admin/QuotationsPage';
import QuotationDetail from './pages/admin/QuotationDetail';
import SubscriptionsPage from './pages/admin/SubscriptionsPage';
import SubscriptionDetail from './pages/admin/SubscriptionDetail';
import InvoicesPage from './pages/admin/InvoicesPage';
import InvoiceDetail from './pages/admin/InvoiceDetail';
import PaymentsPage from './pages/admin/PaymentsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import ActivityLogsPage from './pages/admin/ActivityLogsPage';
import CsvImportPage from './pages/admin/CsvImportPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* Admin & Staff Protected Routes */}
          <Route
            path="/admin"
            element={
              <RequireAuth allowedRoles={['ADMIN', 'STAFF']}>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="quotations/:id" element={<QuotationDetail />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="activity" element={<ActivityLogsPage />} />

            {/* Admin only routes */}
            <Route
              path="analytics"
              element={
                <RequireAuth allowedRoles={['ADMIN']}>
                  <AnalyticsPage />
                </RequireAuth>
              }
            />
            <Route
              path="import"
              element={
                <RequireAuth allowedRoles={['ADMIN']}>
                  <CsvImportPage />
                </RequireAuth>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
