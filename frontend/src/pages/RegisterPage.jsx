import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Alert } from '../components/ui';
import { Zap, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password2: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
    setGlobalError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    if (form.password !== form.password2) errs.password2 = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await api.post('/auth/register/', {
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        password:   form.password,
      });
      // Auto-login after registration
      const user = await login(form.email, form.password);
      navigate(user.role === 'CUSTOMER' ? '/portal' : '/admin', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        // Map field-level errors from DRF
        const fieldErrors = {};
        Object.entries(data).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val[0] : val;
        });
        setErrors(fieldErrors);
      } else {
        setGlobalError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-50">Brightloop</p>
            <p className="text-xs text-gray-500 -mt-0.5">Create your account</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-gray-50 mb-1">Create account</h1>
          <p className="text-sm text-gray-400 mb-6">Get started with Brightloop today</p>

          {globalError && (
            <Alert variant="danger" className="mb-4">{globalError}</Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                id="reg-first-name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="Jane"
                error={errors.first_name}
              />
              <Input
                label="Last name"
                id="reg-last-name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Smith"
                error={errors.last_name}
              />
            </div>

            <Input
              label="Email address"
              id="reg-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@company.com"
              autoComplete="email"
              error={errors.email}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-gray-800 text-gray-100 placeholder-gray-500 outline-none transition-colors ${errors.password ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            <Input
              label="Confirm password"
              id="reg-password2"
              type="password"
              name="password2"
              value={form.password2}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.password2}
            />

            <Button
              id="register-submit"
              type="submit"
              size="lg"
              loading={loading}
              className="w-full mt-1"
            >
              Create account
            </Button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
