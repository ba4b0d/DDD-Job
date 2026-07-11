import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('3djat_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      localStorage.removeItem('3djat_token');
      window.location.href = '/login';
    }
    const message = error.response?.data?.detail
      || error.response?.data?.message
      || error.message;
    console.error('[API Error]', message, error);
    return Promise.reject(error);
  }
);

// ===== Settings =====
export const getSettings = (config) => api.get('/settings', config);
export const updateSettings = (data) => api.put('/settings', data);

// ===== Materials =====
export const getMaterials = (params, config) => api.get('/materials', { params, ...config });
export const getMaterialsAll = (config) => api.get('/materials/all', config);
export const createMaterial = (data) => api.post('/materials', data);
export const updateMaterial = (id, data) => api.put(`/materials/${id}`, data);
export const deleteMaterial = (id) => api.delete(`/materials/${id}`);

// ===== Machines =====
export const getMachines = (params) => api.get('/machines', { params });
export const getMachinesAll = (config) => api.get('/machines/all', config);
export const createMachine = (data) => api.post('/machines', data);
export const updateMachine = (id, data) => api.put(`/machines/${id}`, data);
export const deleteMachine = (id) => api.delete(`/machines/${id}`);

// ===== Products =====
export const getProducts = (params, config) => api.get('/products', { params, ...config });
export const getProductsAll = () => api.get('/products/all');
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ===== Product Images =====
export const uploadProductImage = (productId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/products/${productId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const deleteProductImage = (productId) => api.delete(`/products/${productId}/image`);

// ===== Categories =====
export const getCategories = (config) => api.get('/products/categories', config);

// ===== Calculator =====
export const calculate = (data) => api.post('/calculate', data);

// ===== Public Catalog (no auth) =====
export const getCatalog = () => axios.get('/api/v1/catalog');
export const getCatalogCategories = () => axios.get('/api/v1/catalog/categories');

// ===== Stats =====
export const getStats = (config) => api.get('/stats', config);

// ===== Auth =====
export const login = (username, password) => api.post('/auth/login', { username, password });
export const verifyToken = () => api.get('/auth/verify');

// ===== Users (admin only) =====
export const getUsers = () => api.get('/auth/users');
export const createUser = (data) => api.post('/auth/users', data);
export const updateUser = (id, data) => api.put(`/auth/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/auth/users/${id}`);
export const changePassword = (id, password) => api.put(`/auth/users/${id}/password`, { password });
export const changeMyPassword = (password) => api.post('/auth/change-my-password', { password });

// ===== Categories (admin + employee) =====
export const getCategoriesList = () => api.get('/categories');
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

export default api;
