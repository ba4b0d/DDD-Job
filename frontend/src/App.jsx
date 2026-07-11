import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import CatalogLayout from './components/CatalogLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Materials from './pages/Materials';
import Machines from './pages/Machines';
import Settings from './pages/Settings';
import Calculator from './pages/Calculator';
import Catalog from './pages/Catalog';
import UsersPage from './pages/Users';
import Categories from './pages/Categories';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/catalog" element={<CatalogLayout><Catalog /></CatalogLayout>} />

      {/* Protected admin+employee */}
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Layout><Products /></Layout></ProtectedRoute>} />
      <Route path="/products/:id" element={<ProtectedRoute><Layout><ProductDetail /></Layout></ProtectedRoute>} />
      <Route path="/products/:id/edit" element={<ProtectedRoute><Layout><ProductDetail /></Layout></ProtectedRoute>} />
      <Route path="/calculator" element={<ProtectedRoute><Layout><Calculator /></Layout></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><Layout><Categories /></Layout></ProtectedRoute>} />

      {/* Protected admin only */}
      <Route path="/materials" element={<ProtectedRoute><Layout><Materials /></Layout></ProtectedRoute>} />
      <Route path="/machines" element={<ProtectedRoute><Layout><Machines /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Layout><UsersPage /></Layout></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}