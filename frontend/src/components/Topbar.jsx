import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { clsx } from 'clsx';

function NotificationsPanel({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications/?unread=1')
      .then(({ data }) => setItems(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/mark-read/`).catch(() => {});
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const markAll = async () => {
    await api.post('/notifications/mark-all-read/').catch(() => {});
    setItems([]);
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <p className="text-sm font-semibold text-gray-100">Notifications</p>
        {items.length > 0 && (
          <button onClick={markAll} className="text-xs text-blue-400 hover:text-blue-300">
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No unread notifications</p>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className="px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-200">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
                <button
                  onClick={() => markRead(n.id)}
                  className="shrink-0 mt-0.5 text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GlobalSearch({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const search = (q) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/search/?q=${encodeURIComponent(q)}&types=customers,products,plans,quotations,subscriptions,invoices`
        );
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const typeRoutes = {
    customers: '/admin/customers',
    products: '/admin/products',
    plans: '/admin/plans',
    quotations: '/admin/quotations',
    subscriptions: '/admin/subscriptions',
    invoices: '/admin/invoices',
  };

  const goto = (type, id) => {
    navigate(`${typeRoutes[type]}/${id}`);
    onClose();
  };

  const hasResults = results && Object.values(results).some((arr) => arr?.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search size={18} className="text-gray-500 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            placeholder="Search customers, products, invoices…"
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
          />
          {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={16} />
          </button>
        </div>
        {results && (
          <div className="max-h-96 overflow-y-auto p-2">
            {!hasResults ? (
              <p className="text-sm text-gray-500 text-center py-6">No results found</p>
            ) : (
              Object.entries(results).map(([type, items]) =>
                items?.length > 0 ? (
                  <div key={type} className="mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1">
                      {type}
                    </p>
                    {items.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => goto(type, item.id)}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-800 text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0 capitalize">
                          {type.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 truncate">
                            {item.name || item.invoice_number || item.quotation_number || item.subscription_number || item.email || `#${item.id}`}
                          </p>
                          <p className="text-xs text-gray-500 truncate capitalize">{type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Topbar() {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header
        style={{ height: 'var(--topbar-h)' }}
        className="flex items-center justify-between px-6 bg-gray-950 border-b border-gray-800 shrink-0"
      >
        <button
          id="global-search-btn"
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all"
        >
          <Search size={15} />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden sm:inline-flex ml-2 text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        <div className="flex items-center gap-2">
          <div className="relative" ref={notifRef}>
            <button
              id="notif-btn"
              onClick={() => setShowNotif((v) => !v)}
              className="relative p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
            </button>
            {showNotif && <NotificationsPanel onClose={() => setShowNotif(false)} />}
          </div>
        </div>
      </header>

      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </>
  );
}
