import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,         // { id, email, full_name, role }
  isLoaded: false,    // true once we've attempted to restore session
  isAuthenticated: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, isLoaded: true };
    case 'CLEAR_USER':
      return { ...state, user: null, isAuthenticated: false, isLoaded: true };
    case 'SET_LOADED':
      return { ...state, isLoaded: true };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session from localStorage on mount
  useEffect(() => {
    // Restore dev preview session if previously toggled
    if (import.meta.env.DEV && localStorage.getItem('bl_dev_preview') === 'true') {
      const role = localStorage.getItem('bl_dev_role') || 'ADMIN';
      dispatch({
        type: 'SET_USER',
        payload: {
          id: 1,
          email: `devika.${role.toLowerCase()}@brightloop.local`,
          full_name: `Devika (${role === 'ADMIN' ? 'Admin' : 'Staff'} Preview)`,
          role,
        },
      });
      return;
    }

    const access = localStorage.getItem('bl_access');
    if (!access) {
      dispatch({ type: 'SET_LOADED' });
      return;
    }

    api
      .get('/auth/me/')
      .then(({ data }) => dispatch({ type: 'SET_USER', payload: data }))
      .catch(() => {
        localStorage.removeItem('bl_access');
        localStorage.removeItem('bl_refresh');
        dispatch({ type: 'CLEAR_USER' });
      });
  }, []);

  // Listen for forced logout events (token refresh failure)
  useEffect(() => {
    const handler = () => dispatch({ type: 'CLEAR_USER' });
    window.addEventListener('bl:logout', handler);
    return () => window.removeEventListener('bl:logout', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    localStorage.setItem('bl_access', data.access);
    localStorage.setItem('bl_refresh', data.refresh);
    // Clear any previous dev mock flag
    localStorage.removeItem('bl_dev_preview');
    localStorage.removeItem('bl_dev_role');

    // Fetch full profile
    const me = await api.get('/auth/me/');
    dispatch({ type: 'SET_USER', payload: me.data });
    return me.data;
  }, []);

  const loginDevPreview = useCallback((role = 'ADMIN') => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('bl_dev_preview', 'true');
    localStorage.setItem('bl_dev_role', role);
    const mockUser = {
      id: 1,
      email: `devika.${role.toLowerCase()}@brightloop.local`,
      full_name: `Devika (${role === 'ADMIN' ? 'Admin' : 'Staff'} Preview)`,
      role,
    };
    dispatch({ type: 'SET_USER', payload: mockUser });
    return mockUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('bl_access');
    localStorage.removeItem('bl_refresh');
    localStorage.removeItem('bl_dev_preview');
    localStorage.removeItem('bl_dev_role');
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  const updateProfile = useCallback((data) => {
    dispatch({ type: 'SET_USER', payload: { ...state.user, ...data } });
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, loginDevPreview, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
