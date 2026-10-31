import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Zap,
  Check,
  Clock,
  Layers,
  Search,
  Filter,
  Tag,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  ShoppingCart,
  Sparkles,
  Info,
} from 'lucide-react';
import api from '../../lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val) {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getIntervalLabel(interval) {
  const i = String(interval || '').toUpperCase();
  switch (i) {
    case 'MONTHLY':
      return { label: 'Monthly', suffix: '/ month', badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'QUARTERLY':
      return { label: 'Quarterly', suffix: '/ quarter', badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'YEARLY':
      return { label: 'Yearly', suffix: '/ year', badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    default:
      return { label: interval || 'Standard', suffix: '', badgeStyle: 'bg-gray-50 text-gray-700 border-gray-200' };
  }
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function PlansSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-200 rounded-[10px]" />
        <div className="h-4 w-96 bg-gray-100 rounded-[8px]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-white border border-[#E4E9F2] rounded-[16px] p-5 shadow-xs"
          />
        ))}
      </div>

      <div className="h-96 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs" />
    </div>
  );
}

// ── Plan Card Component ──────────────────────────────────────────────────────

function PlanCard({ plan }) {
  const intervalInfo = getIntervalLabel(plan.billing_interval);

  // Parse description lines for feature bullets if available
  const featureBullets = useMemo(() => {
    if (!plan.description) return [];
    return plan.description
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [plan.description]);

  return (
    <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs hover:border-[#2457D6]/40 hover:shadow-sm transition-all flex flex-col justify-between group">
      <div>
        {/* Header Tags */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${intervalInfo.badgeStyle}`}
          >
            {intervalInfo.label}
          </span>

          {plan.trial_period_days > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#E8820C] bg-[#FFFAEB] border border-[#FEDF89] px-2 py-0.5 rounded-full">
              <Clock size={11} />
              {plan.trial_period_days}-day free trial
            </span>
          )}
        </div>

        {/* Plan Title & Product Link */}
        <h3 className="text-lg font-bold text-[#0F1B33] group-hover:text-[#2457D6] transition-colors">
          {plan.name}
        </h3>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5B6B85] bg-[#F7F9FC] px-2 py-0.5 rounded-md border border-[#E4E9F2]">
            <Package size={11} className="text-[#8A97AD]" />
            {plan.product_name || 'Core Product'}
          </span>

          {plan.variant_name && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2457D6] bg-[#EEF3FF] px-2 py-0.5 rounded-md border border-blue-100">
              <Layers size={11} />
              {plan.variant_name}
            </span>
          )}
        </div>

        {/* Pricing Display */}
        <div className="my-5 pb-5 border-b border-[#E4E9F2]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {formatCurrency(plan.price)}
            </span>
            <span className="text-xs font-medium text-[#5B6B85]">
              {intervalInfo.suffix}
            </span>
          </div>
          <span className="text-[11px] text-[#8A97AD] block mt-1">
            Billed on recurring {intervalInfo.label.toLowerCase()} intervals
          </span>
        </div>

        {/* Plan Features / Description */}
        <div className="space-y-2 mb-6">
          <div className="text-xs font-bold text-[#5B6B85] uppercase tracking-wider mb-2">
            Plan Highlights
          </div>

          {featureBullets.length > 0 ? (
            <ul className="space-y-2 text-xs text-[#0F1B33]">
              {featureBullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#ECFDF3] text-[#12A150] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={10} />
                  </div>
                  <span className="leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-[#5B6B85] leading-relaxed">
              Standard tier features, automated recurring provisioning, and verified invoice billing.
            </div>
          )}
        </div>
      </div>

      {/* Plan Action Footer */}
      <div className="pt-4 border-t border-[#E4E9F2] flex items-center justify-between text-xs text-[#5B6B85]">
        <span>Managed by Subscription Desk</span>
        <Link
          to="/portal/quotations"
          className="inline-flex items-center gap-1 font-semibold text-[#2457D6] hover:underline"
        >
          Request Quote <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ── Product Card Component ───────────────────────────────────────────────────

function ProductCard({ product, plans }) {
  const variants = product.variants || [];
  const relatedPlans = plans.filter((p) => p.product === product.id);

  return (
    <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs hover:border-gray-300 transition-all space-y-5">
      {/* Product Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-[#0F1B33]">
              {product.name}
            </h3>
            {product.category && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2457D6] bg-[#EEF3FF] px-2.5 py-0.5 rounded-full border border-blue-100">
                <Tag size={10} />
                {product.category}
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-[#8A97AD]">
            SKU: {product.sku}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF] self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-[#12A150]" />
          Available
        </span>
      </div>

      {/* Description */}
      {product.description ? (
        <p className="text-sm text-[#5B6B85] leading-relaxed">
          {product.description}
        </p>
      ) : (
        <p className="text-xs text-[#8A97AD] italic">
          No additional description provided for this catalog product.
        </p>
      )}

      {/* Product Variants (if configured) */}
      {variants.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E4E9F2]">
          <div className="text-xs font-bold text-[#5B6B85] uppercase tracking-wider">
            Available Editions & Variants ({variants.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {variants.map((v) => (
              <div
                key={v.id}
                className="bg-[#F7F9FC] p-3 rounded-[12px] border border-[#E4E9F2] space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0F1B33]">
                    {v.variant_name}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#2457D6] tabular-nums">
                    {formatCurrency(v.price)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#8A97AD]">
                  SKU: {v.sku}
                </div>
                {v.description && (
                  <p className="text-xs text-[#5B6B85] mt-1">{v.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Associated Subscription Plans */}
      <div className="pt-2 border-t border-[#E4E9F2]">
        <div className="text-xs font-bold text-[#5B6B85] uppercase tracking-wider mb-2">
          Associated Subscription Plans ({relatedPlans.length})
        </div>

        {relatedPlans.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {relatedPlans.map((rp) => {
              const intInfo = getIntervalLabel(rp.billing_interval);
              return (
                <div
                  key={rp.id}
                  className="bg-white px-3 py-1.5 rounded-[10px] border border-[#E4E9F2] text-xs flex items-center gap-2 shadow-2xs"
                >
                  <span className="font-semibold text-[#0F1B33]">{rp.name}</span>
                  <span className="font-mono font-bold text-[#2457D6] tabular-nums">
                    {formatCurrency(rp.price)}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${intInfo.badgeStyle}`}>
                    {intInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[#8A97AD] italic">
            Custom enterprise plans available upon quotation.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Customer Plans Component ────────────────────────────────────────────

export default function CustomerPlans() {
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // View state: 'plans' or 'products'
  const [activeTab, setActiveTab] = useState('plans');

  // Filters
  const [selectedInterval, setSelectedInterval] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Fetch Catalog Data ─────────────────────────────────────────────────────

  const fetchCatalog = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [plansRes, productsRes] = await Promise.all([
        api.get('/plans/'),
        api.get('/products/'),
      ]);

      const plansData = Array.isArray(plansRes.data)
        ? plansRes.data
        : plansRes.data?.results ?? [];

      const productsData = Array.isArray(productsRes.data)
        ? productsRes.data
        : productsRes.data?.results ?? [];

      setPlans(plansData);
      setProducts(productsData);
    } catch (err) {
      console.error('Failed to load catalog plans or products:', err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          'Failed to load catalog offerings. Please check your network and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // ── Categories List ────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats).sort();
  }, [products]);

  // ── Filtered Plans ─────────────────────────────────────────────────────────

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      // 1. Billing interval filter
      if (selectedInterval !== 'ALL') {
        const bi = String(p.billing_interval || '').toUpperCase();
        if (bi !== selectedInterval) return false;
      }

      // 2. Product filter
      if (selectedProduct !== 'ALL') {
        if (String(p.product) !== String(selectedProduct)) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = String(p.name || '').toLowerCase().includes(q);
        const prodMatch = String(p.product_name || '').toLowerCase().includes(q);
        const varMatch = String(p.variant_name || '').toLowerCase().includes(q);
        const descMatch = String(p.description || '').toLowerCase().includes(q);
        return nameMatch || prodMatch || varMatch || descMatch;
      }

      return true;
    });
  }, [plans, selectedInterval, selectedProduct, searchQuery]);

  // ── Filtered Products ──────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Category filter
      if (selectedCategory !== 'ALL') {
        if (String(p.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = String(p.name || '').toLowerCase().includes(q);
        const skuMatch = String(p.sku || '').toLowerCase().includes(q);
        const catMatch = String(p.category || '').toLowerCase().includes(q);
        const descMatch = String(p.description || '').toLowerCase().includes(q);
        const varMatch = (p.variants || []).some(
          (v) =>
            String(v.variant_name || '').toLowerCase().includes(q) ||
            String(v.sku || '').toLowerCase().includes(q)
        );
        return nameMatch || skuMatch || catMatch || descMatch || varMatch;
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // ── Render Loading Skeleton ────────────────────────────────────────────────

  if (loading) {
    return <PlansSkeleton />;
  }

  // ── Main Page Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F1B33] tracking-tight">
            Plans & Catalog
          </h1>
          <p className="text-sm text-[#5B6B85] mt-1">
            Explore standard subscription tiers, product editions, and recurring pricing schedules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchCatalog(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm font-semibold text-[#0F1B33] hover:bg-[#F7F9FC] shadow-2xs transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#2457D6]' : 'text-[#5B6B85]'} />
          <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-[16px] p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#D92D20] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[#B42318]">Error Loading Catalog</h3>
              <p className="text-xs text-[#B42318]/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchCatalog()}
            className="px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#B42318] bg-white border border-[#FECDCA] hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── KPI Metric Strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1: Active Plans */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Subscription Plans
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#EEF3FF] flex items-center justify-center text-[#2457D6]">
              <Zap size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {plans.length}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">Available active pricing tiers</p>
          </div>
        </div>

        {/* KPI 2: Products Available */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Core Products
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#ECFDF3] flex items-center justify-center text-[#12A150]">
              <Package size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-[#0F1B33] tabular-nums">
              {products.length}
            </div>
            <p className="text-xs text-[#5B6B85] mt-1">Across verified product lines</p>
          </div>
        </div>

        {/* KPI 3: Supported Intervals */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Billing Cadences
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FFFAEB] flex items-center justify-center text-[#E8820C]">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-base font-bold text-[#0F1B33] flex items-center gap-1.5 flex-wrap">
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-md">
                Monthly
              </span>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5 rounded-md">
                Quarterly
              </span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-md">
                Yearly
              </span>
            </div>
            <p className="text-xs text-[#5B6B85] mt-2">Flexible renewal cycles</p>
          </div>
        </div>

        {/* KPI 4: Enterprise Quotes */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#5B6B85] uppercase tracking-wider">
              Custom Deals
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#F4F3FF] flex items-center justify-center text-[#5925DC]">
              <ShoppingCart size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm font-bold text-[#0F1B33]">
              Bespoke Proposals
            </div>
            <Link
              to="/portal/quotations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2457D6] hover:underline mt-1"
            >
              Check Quotations <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── View Switcher: Plans vs Products ─────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-[#E4E9F2]">
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'plans'
              ? 'border-[#2457D6] text-[#2457D6]'
              : 'border-transparent text-[#5B6B85] hover:text-[#0F1B33]'
          }`}
        >
          <Zap size={16} />
          <span>Subscription Plans ({plans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'products'
              ? 'border-[#2457D6] text-[#2457D6]'
              : 'border-transparent text-[#5B6B85] hover:text-[#0F1B33]'
          }`}
        >
          <Package size={16} />
          <span>Product Catalog ({products.length})</span>
        </button>
      </div>

      {/* ── Filters & Search Controls ────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Sub-Filters for Plans View */}
        {activeTab === 'plans' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'ALL', label: 'All Intervals' },
              { id: 'MONTHLY', label: 'Monthly' },
              { id: 'QUARTERLY', label: 'Quarterly' },
              { id: 'YEARLY', label: 'Yearly' },
            ].map((int) => {
              const isActive = selectedInterval === int.id;
              return (
                <button
                  key={int.id}
                  type="button"
                  onClick={() => setSelectedInterval(int.id)}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-[#2457D6] text-white border-[#2457D6]'
                      : 'bg-white text-[#5B6B85] border-[#E4E9F2] hover:bg-[#F7F9FC]'
                  }`}
                >
                  {int.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Sub-Filters for Products View */}
        {activeTab === 'products' && categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer border ${
                selectedCategory === 'ALL'
                  ? 'bg-[#2457D6] text-white border-[#2457D6]'
                  : 'bg-white text-[#5B6B85] border-[#E4E9F2] hover:bg-[#F7F9FC]'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer border ${
                  selectedCategory === cat
                    ? 'bg-[#2457D6] text-white border-[#2457D6]'
                    : 'bg-white text-[#5B6B85] border-[#E4E9F2] hover:bg-[#F7F9FC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Universal Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A97AD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'plans'
                  ? 'Search by plan name, product, or description...'
                  : 'Search by product name, SKU, or category...'
              }
              className="w-full pl-10 pr-9 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] placeholder-[#8A97AD] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A97AD] hover:text-[#0F1B33] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {(selectedInterval !== 'ALL' || selectedCategory !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedInterval('ALL');
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-xs font-semibold text-[#D92D20] hover:bg-red-50 rounded-[10px] border border-transparent hover:border-red-100 transition-colors cursor-pointer shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Content View A: Subscription Plans ───────────────────────────── */}
      {activeTab === 'plans' && (
        <div>
          {plans.length === 0 ? (
            <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 text-center shadow-xs">
              <Zap size={32} className="mx-auto text-[#8A97AD] mb-2" />
              <p className="text-base font-bold text-[#0F1B33]">No subscription plans available</p>
              <p className="text-xs text-[#5B6B85] mt-1">
                Standard subscription plans have not yet been published to the catalog.
              </p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 text-center shadow-xs">
              <Layers size={32} className="mx-auto text-[#8A97AD] mb-2" />
              <p className="text-sm font-semibold text-[#0F1B33]">No matching subscription plans</p>
              <p className="text-xs text-[#5B6B85] mt-1">
                No plans matched your current filter and search settings.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedInterval('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold text-[#2457D6] bg-[#EEF3FF] hover:bg-blue-100/50 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Content View B: Product Catalog ──────────────────────────────── */}
      {activeTab === 'products' && (
        <div>
          {products.length === 0 ? (
            <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 text-center shadow-xs">
              <Package size={32} className="mx-auto text-[#8A97AD] mb-2" />
              <p className="text-base font-bold text-[#0F1B33]">No products available</p>
              <p className="text-xs text-[#5B6B85] mt-1">
                Products have not yet been published to the customer catalog.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-8 text-center shadow-xs">
              <Layers size={32} className="mx-auto text-[#8A97AD] mb-2" />
              <p className="text-sm font-semibold text-[#0F1B33]">No matching products</p>
              <p className="text-xs text-[#5B6B85] mt-1">
                No products matched your current category or search query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold text-[#2457D6] bg-[#EEF3FF] hover:bg-blue-100/50 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  plans={plans}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Enterprise / Custom Guidance Card ────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#2457D6] to-[#163897] rounded-[16px] p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20">
            <Sparkles size={12} />
            <span>Enterprise & Custom Contracts</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight">
            Need customized pricing, volume seats, or special SLA terms?
          </h3>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Our enterprise sales team can generate a customized proposal tailored to your team. Review active quotations anytime in your Customer Portal.
          </p>
        </div>

        <Link
          to="/portal/quotations"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-white text-[#2457D6] text-sm font-bold hover:bg-blue-50 shadow-sm transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>View Quotations</span>
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}

