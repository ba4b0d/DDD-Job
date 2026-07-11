import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, verifyToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('3djat_token');
    if (token) {
      verifyToken()
        .then((res) => {
          setUser({ username: res.data.username, role: res.data.role });
          setMustChangePassword(res.data.must_change_password || false);
        })
        .catch(() => {
          localStorage.removeItem('3djat_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await apiLogin(username, password);
    const data = res.data;
    localStorage.setItem('3djat_token', data.token);
    setUser({ username: data.username, role: data.role, display_name: data.display_name });
    setMustChangePassword(data.must_change_password || false);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('3djat_token');
    setUser(null);
    setMustChangePassword(false);
  };

  const passwordChanged = () => {
    setMustChangePassword(false);
  };

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user, isAdmin, isEmployee, mustChangePassword, passwordChanged }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
