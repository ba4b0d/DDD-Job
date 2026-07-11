import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import CatalogLayout from './components/CatalogLayout';

// Code splitting — lazy load all pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Materials = lazy(() => import('./pages/Materials'));
const Machines = lazy(() => import('./pages/Machines'));
const Settings = lazy(() => import('./pages/Settings'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Catalog = lazy(() => import('./pages/Catalog'));
const UsersPage = lazy(() => import('./pages/Users'));
const Categories = lazy(() => import('./pages/Categories'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <PageLoader />;
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
