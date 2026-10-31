import { useState } from 'react';
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, Users, Package, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { PageHeader, Card, CardHeader, CardBody, Button, Alert, Spinner, Badge } from '../../components/ui';

export default function CsvImportPage() {
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'products'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const endpoint = activeTab === 'customers' ? '/import/customers/' : '/import/products/';

    try {
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Import failed. Check file format.');
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = (type) => {
    let content = '';
    let filename = '';
    if (type === 'customers') {
      content = 'email,first_name,last_name,password,company_name,phone\njane.smith@acme.com,Jane,Smith,SecurePass123!,Acme Corp,+1234567890\n';
      filename = 'customers_template.csv';
    } else {
      content = 'name,sku,category,description\nPremium Cloud Hosting,HOST-PREM-01,Hosting,High speed cloud instances with 99.9% SLA\n';
      filename = 'products_template.csv';
    }
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const downloadExport = async (type) => {
    try {
      const response = await api.get(`/export/${type}.csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert(`Failed to export ${type} CSV.`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <PageHeader
        title="Data Migration & CSV Tools"
        subtitle="Bulk import customers & catalog products, or export system data to CSV"
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-800 gap-4">
        <button
          onClick={() => { setActiveTab('customers'); setFile(null); setResult(null); setError(null); }}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'customers'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users size={16} /> Customer Import
        </button>
        <button
          onClick={() => { setActiveTab('products'); setFile(null); setResult(null); setError(null); }}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Package size={16} /> Product Catalog Import
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Import Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-100 capitalize">
                Import {activeTab} via CSV
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeTab === 'customers'
                  ? 'Required columns: email, first_name, last_name, password, company_name'
                  : 'Required columns: name, sku (optional: category, description)'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadSample(activeTab)}
            >
              <Download size={14} /> Download Sample CSV
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-xl p-8 text-center bg-gray-900/50 transition-colors">
              <Upload size={36} className="mx-auto text-gray-500 mb-3" />
              <p className="text-sm text-gray-300 font-medium">
                {file ? file.name : 'Choose a CSV file or drag and drop here'}
              </p>
              <p className="text-xs text-gray-500 mt-1">UTF-8 encoded CSV files only</p>
              <input
                type="file"
                accept=".csv"
                id="csv-file-input"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="csv-file-input"
                className="mt-4 inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Browse File
              </label>
            </div>

            <div className="flex justify-end gap-3">
              {file && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setFile(null)}
                >
                  Clear File
                </Button>
              )}
              <Button
                variant="primary"
                type="submit"
                disabled={!file}
                loading={uploading}
              >
                <Upload size={15} /> Upload & Process CSV
              </Button>
            </div>
          </form>

          {/* Results Display */}
          {result && (
            <div className="mt-6 pt-6 border-t border-gray-800 space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 size={18} />
                <span className="font-semibold text-sm">
                  Successfully imported {result.created} new {activeTab}!
                </span>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-semibold">
                      {result.errors.length} rows encountered errors and were skipped:
                    </span>
                  </div>
                  <ul className="text-xs text-red-300/80 space-y-1 list-disc list-inside">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* CSV Export Section */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-100">Export System Data</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Download full CSV exports of current operational records
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-200">Customers</p>
                <p className="text-xs text-gray-500 mt-1">Export customer contacts & profiles</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => downloadExport('customers')}
              >
                <Download size={13} /> Export CSV
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-200">Products</p>
                <p className="text-xs text-gray-500 mt-1">Export active catalog items</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => downloadExport('products')}
              >
                <Download size={13} /> Export CSV
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-200">Invoices</p>
                <p className="text-xs text-gray-500 mt-1">Export billing records & balances</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => downloadExport('invoices')}
              >
                <Download size={13} /> Export CSV
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-200">Payments</p>
                <p className="text-xs text-gray-500 mt-1">Export payment transaction logs</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => downloadExport('payments')}
              >
                <Download size={13} /> Export CSV
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
