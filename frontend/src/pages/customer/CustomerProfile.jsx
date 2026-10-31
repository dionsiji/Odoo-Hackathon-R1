import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  Mail,
  Briefcase,
  Phone,
  MapPin,
  Shield,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Check,
  Building,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(first, last, email) {
  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
  if (first) return first.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return 'CU';
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
      <div className="h-44 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs" />
        <div className="h-80 bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs" />
      </div>
    </div>
  );
}

// ── Main Customer Profile Component ──────────────────────────────────────────

export default function CustomerProfile() {
  const { user: contextUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });

  // Original pristine snapshot to detect unsaved changes and allow reset
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  // Read-only metadata
  const [meta, setMeta] = useState({
    id: null,
    role: 'CUSTOMER',
    status: 'ACTIVE',
    date_joined: null,
    created_at: null,
    updated_at: null,
  });

  // ── Load User & Customer Profile Data ──────────────────────────────────────

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [authRes, profileRes] = await Promise.allSettled([
        api.get('/auth/me/'),
        api.get('/customers/me/'),
      ]);

      const authData = authRes.status === 'fulfilled' ? authRes.value.data : {};
      const profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : {};

      const mergedForm = {
        first_name: authData.first_name || '',
        last_name: authData.last_name || '',
        email: authData.email || profileData.email || contextUser?.email || '',
        phone: profileData.phone || '',
        company_name: profileData.company_name || '',
        address_line1: profileData.address_line1 || '',
        address_line2: profileData.address_line2 || '',
        city: profileData.city || '',
        state: profileData.state || '',
        postal_code: profileData.postal_code || '',
        country: profileData.country || '',
      };

      setForm(mergedForm);
      setInitialSnapshot(mergedForm);

      setMeta({
        id: profileData.id || authData.id || null,
        role: authData.role || profileData.role || 'CUSTOMER',
        status: profileData.status || 'ACTIVE',
        date_joined: authData.date_joined || null,
        created_at: profileData.created_at || null,
        updated_at: profileData.updated_at || null,
      });
    } catch (err) {
      console.error('Failed to load profile details:', err);
      setError('Failed to load your profile details. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [contextUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Unsaved Changes Detection ──────────────────────────────────────────────

  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshot) return false;
    return (
      form.first_name !== initialSnapshot.first_name ||
      form.last_name !== initialSnapshot.last_name ||
      form.phone !== initialSnapshot.phone ||
      form.company_name !== initialSnapshot.company_name ||
      form.address_line1 !== initialSnapshot.address_line1 ||
      form.address_line2 !== initialSnapshot.address_line2 ||
      form.city !== initialSnapshot.city ||
      form.state !== initialSnapshot.state ||
      form.postal_code !== initialSnapshot.postal_code ||
      form.country !== initialSnapshot.country
    );
  }, [form, initialSnapshot]);

  // ── Form Input Change Handler ──────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Reset Handler ──────────────────────────────────────────────────────────

  const handleReset = () => {
    if (initialSnapshot) {
      setForm(initialSnapshot);
      setError(null);
    }
  };

  // ── Submit / Save Handler ──────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasUnsavedChanges) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updateTasks = [];

      // 1. Check if auth details changed (first_name, last_name)
      const authChanged =
        form.first_name !== initialSnapshot.first_name ||
        form.last_name !== initialSnapshot.last_name;

      if (authChanged) {
        updateTasks.push(
          api.patch('/auth/me/', {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
          })
        );
      }

      // 2. Check if customer profile details changed
      const profileChanged =
        form.phone !== initialSnapshot.phone ||
        form.company_name !== initialSnapshot.company_name ||
        form.address_line1 !== initialSnapshot.address_line1 ||
        form.address_line2 !== initialSnapshot.address_line2 ||
        form.city !== initialSnapshot.city ||
        form.state !== initialSnapshot.state ||
        form.postal_code !== initialSnapshot.postal_code ||
        form.country !== initialSnapshot.country;

      if (profileChanged) {
        updateTasks.push(
          api.patch('/customers/me/', {
            phone: form.phone.trim(),
            company_name: form.company_name.trim(),
            address_line1: form.address_line1.trim(),
            address_line2: form.address_line2.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            postal_code: form.postal_code.trim(),
            country: form.country.trim(),
          })
        );
      }

      await Promise.all(updateTasks);

      // Update snapshot
      setInitialSnapshot({ ...form });
      setSuccessMsg('Your profile and contact details were saved successfully.');

      // Auto clear success message
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      const detail =
        err.response?.data?.detail ||
        (typeof err.response?.data === 'object'
          ? Object.entries(err.response.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
              .join('; ')
          : null) ||
        'Failed to save changes. Please check input values and try again.';
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  // ── Render Skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return <ProfileSkeleton />;
  }

  const initials = getInitials(form.first_name, form.last_name, form.email);
  const displayName =
    form.first_name || form.last_name
      ? `${form.first_name} ${form.last_name}`.trim()
      : form.email.split('@')[0];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F1B33] tracking-tight">
            My Profile & Account
          </h1>
          <p className="text-sm text-[#5B6B85] mt-1">
            Manage your personal profile, corporate identity, billing address, and contact details.
          </p>
        </div>

        <button
          type="button"
          onClick={loadProfile}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm font-semibold text-[#0F1B33] hover:bg-[#F7F9FC] shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className="text-[#5B6B85]" />
          <span>Reload</span>
        </button>
      </div>

      {/* ── Alerts & Toasts ──────────────────────────────────────────────── */}
      {successMsg && (
        <div className="bg-[#ECFDF3] border border-[#D1FADF] rounded-[16px] p-4 flex items-center justify-between gap-3 text-sm text-[#027A48] animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-[#12A150] shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="p-1 rounded-md hover:bg-green-100 text-[#027A48] transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-[16px] p-4 flex items-start justify-between gap-3 text-sm text-[#B42318] animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-[#D92D20] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Failed to save profile</span>
              <span className="text-xs text-[#B42318]/90 mt-0.5 block">{error}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 rounded-md hover:bg-red-100 text-[#B42318] transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Profile Hero Overview Card ─────────────────────────────────────── */}
      <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar Initials Badge */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#EEF3FF] border border-blue-100 flex items-center justify-center text-[#2457D6] font-bold text-xl sm:text-2xl shadow-xs shrink-0 font-mono">
            {initials}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F1B33]">
                {displayName}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#12A150]" />
                Customer Account
              </span>
            </div>

            <p className="text-sm text-[#5B6B85] flex items-center gap-1.5 flex-wrap">
              <Mail size={13} className="text-[#8A97AD]" />
              <span>{form.email}</span>
              {form.company_name && (
                <>
                  <span className="text-[#8A97AD]">•</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#0F1B33]">
                    <Briefcase size={13} className="text-[#8A97AD]" />
                    {form.company_name}
                  </span>
                </>
              )}
            </p>

            {meta.date_joined && (
              <p className="text-xs text-[#8A97AD] flex items-center gap-1">
                <Calendar size={12} />
                <span>Member since {formatDate(meta.date_joined)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex flex-col sm:items-end gap-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E4E9F2] w-full sm:w-auto">
          <span className="text-xs text-[#8A97AD] uppercase tracking-wider font-semibold">
            Status
          </span>
          <span className="text-sm font-semibold text-[#0F1B33] capitalize">
            {meta.status.toLowerCase()}
          </span>
        </div>
      </div>

      {/* ── Main Edit Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Personal & Company & Address */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Personal Details */}
            <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4E9F2] pb-3">
                <User size={18} className="text-[#2457D6]" />
                <h3 className="text-base font-bold text-[#0F1B33]">
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F1B33]">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="e.g. John"
                    maxLength={150}
                    className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F1B33]">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="e.g. Doe"
                    maxLength={150}
                    className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                  />
                </div>

                {/* Email (Read Only) */}
                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#0F1B33]">
                      Email Address
                    </label>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#8A97AD]">
                      <Lock size={11} />
                      Read-only
                    </span>
                  </div>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full px-3.5 py-2 rounded-[10px] bg-[#F7F9FC] border border-[#E4E9F2] text-sm text-[#5B6B85] cursor-not-allowed select-none font-mono"
                  />
                  <p className="text-[11px] text-[#8A97AD]">
                    Email is associated with your primary authentication credentials and cannot be changed directly.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Company & Contact */}
            <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4E9F2] pb-3">
                <Briefcase size={18} className="text-[#2457D6]" />
                <h3 className="text-base font-bold text-[#0F1B33]">
                  Company & Direct Contact
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F1B33]">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="e.g. Acme Innovations Pvt Ltd"
                    maxLength={255}
                    className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F1B33]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 98765 43210"
                    maxLength={30}
                    className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Registered Billing Address */}
            <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4E9F2] pb-3">
                <MapPin size={18} className="text-[#2457D6]" />
                <h3 className="text-base font-bold text-[#0F1B33]">
                  Billing Address
                </h3>
              </div>

              <div className="space-y-4">
                {/* Address Line 1 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F1B33]">
                    Street Address Line 1
                  </label>
                  <input
                    type="text"
                    name="address_line1"
                    value={form.address_line1}
                    onChange={handleChange}
                    placeholder="e.g. 102 Business Square, MG Road"
                    maxLength={255}
                    className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                  />
                </div>

                {/* Address Line 2 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F1B33]">
                    Street Address Line 2 <span className="text-[#8A97AD] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="address_line2"
                    value={form.address_line2}
                    onChange={handleChange}
                    placeholder="Suite, unit, floor, building details"
                    maxLength={255}
                    className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                  />
                </div>

                {/* City & State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0F1B33]">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="e.g. Bengaluru"
                      maxLength={100}
                      className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0F1B33]">
                      State / Province
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      placeholder="e.g. Karnataka"
                      maxLength={100}
                      className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Postal Code & Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0F1B33]">
                      Postal / ZIP Code
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      value={form.postal_code}
                      onChange={handleChange}
                      placeholder="e.g. 560001"
                      maxLength={20}
                      className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0F1B33]">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      placeholder="e.g. India"
                      maxLength={100}
                      className="w-full px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E9F2] text-sm text-[#0F1B33] focus:outline-none focus:border-[#2457D6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Column: Security & Account Summary */}
          <div className="space-y-6">
            <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-[#E4E9F2] pb-3">
                <Shield size={18} className="text-[#2457D6]" />
                <h3 className="text-base font-bold text-[#0F1B33]">
                  Security & Details
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[#8A97AD] block">Account Authority</span>
                  <span className="font-semibold text-[#0F1B33] mt-0.5 block">
                    {meta.role === 'CUSTOMER' ? 'Customer Self-Service' : meta.role}
                  </span>
                </div>

                {meta.id && (
                  <div>
                    <span className="text-[#8A97AD] block">Customer Reference ID</span>
                    <span className="font-mono font-bold text-[#2457D6] mt-0.5 block">
                      CUST-#{meta.id}
                    </span>
                  </div>
                )}

                {meta.date_joined && (
                  <div>
                    <span className="text-[#8A97AD] block">Registration Date</span>
                    <span className="text-[#0F1B33] font-medium tabular-nums mt-0.5 block">
                      {formatDate(meta.date_joined)}
                    </span>
                  </div>
                )}

                {meta.updated_at && (
                  <div>
                    <span className="text-[#8A97AD] block">Last Profile Update</span>
                    <span className="text-[#0F1B33] font-medium tabular-nums mt-0.5 block">
                      {formatDate(meta.updated_at)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#E4E9F2] space-y-1.5">
                  <span className="text-[#8A97AD] block font-semibold uppercase tracking-wider text-[11px]">
                    Credentials
                  </span>
                  <div className="flex items-center justify-between bg-[#F7F9FC] p-2.5 rounded-[10px] border border-[#E4E9F2]">
                    <span className="font-mono text-xs text-[#5B6B85]">••••••••••••</span>
                    <span className="text-[11px] font-semibold text-[#2457D6]">Protected</span>
                  </div>
                  <p className="text-[11px] text-[#8A97AD] leading-relaxed">
                    To modify your login email or account credentials, please contact support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Save / Cancel Action Bar ─────────────────────────────────── */}
        <div className="bg-white border border-[#E4E9F2] rounded-[16px] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#5B6B85]">
            {hasUnsavedChanges ? (
              <span className="text-[#E8820C] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E8820C] animate-pulse" />
                You have unsaved changes in your profile.
              </span>
            ) : (
              <span className="text-[#8A97AD]">
                All profile information is synchronized with server records.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasUnsavedChanges || saving}
              className="px-4 py-2 rounded-[10px] text-xs sm:text-sm font-semibold text-[#5B6B85] hover:text-[#0F1B33] hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Discard Changes
            </button>

            <button
              type="submit"
              disabled={!hasUnsavedChanges || saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-[10px] text-xs sm:text-sm font-semibold text-white bg-[#2457D6] hover:bg-[#1C45AE] shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving Changes…</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

