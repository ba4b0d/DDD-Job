import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const testState = vi.hoisted(() => ({
  navigate: vi.fn(),
  auth: {
    user: { username: 'employee', role: 'employee' },
    isAdmin: false,
    isEmployee: true,
    isAuthenticated: true,
    loading: false,
  },
  api: {
    getProductsAll: vi.fn(),
    getMaterialsAll: vi.fn(),
    getMachinesAll: vi.fn(),
    getCategoriesList: vi.fn(),
    getCategoriesFlat: vi.fn(),
    getCollectionsAll: vi.fn(),
    createProduct: vi.fn(),
    exportProducts: vi.fn(),
    importProducts: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    permanentDeleteProduct: vi.fn(),
    bulkProductAction: vi.fn(),
    uploadProductImages: vi.fn(),
    deleteProductImage: vi.fn(),
    setPrimaryImage: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => testState.navigate,
  };
});

vi.mock('../lib/auth', () => ({
  useAuth: () => testState.auth,
}));

vi.mock('../lib/api', () => testState.api);

vi.mock('../hooks/useProductCalculation', () => ({
  default: () => ({ calcResult: null, calculating: false }),
}));

vi.mock('../components/SearchBar', () => ({
  default: ({ value, onChange, placeholder }) => (
    <input aria-label="product-search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  ),
}));

vi.mock('../components/FilterBar', () => ({
  default: () => null,
}));

vi.mock('../components/PriceDisplay', () => ({
  default: ({ suggestedPrice, finalPrice }) => (
    <span>{finalPrice ?? suggestedPrice ?? '—'}</span>
  ),
}));

import ProductForm from '../components/ProductForm';
import Products from '../pages/Products';

const product = {
  id: 7,
  name: 'Test Product',
  product_id: 'SKU-7',
  material_id: 1,
  machine_id: 2,
  material_name: 'PLA',
  weight_g: 12,
  print_time_hours: 1,
  suggested_price: 1000,
  final_price: null,
  is_active: true,
  categories: [],
  category: '',
};

function resetApiMocks() {
  Object.values(testState.api).forEach((mock) => mock.mockReset());
  testState.api.getProductsAll.mockResolvedValue({ data: [product] });
  testState.api.getMaterialsAll.mockResolvedValue({ data: [{ id: 1, name: 'PLA', color: 'White', is_default: true }] });
  testState.api.getMachinesAll.mockResolvedValue({ data: [{ id: 2, name: 'Printer', is_default: true }] });
  testState.api.getCategoriesList.mockResolvedValue({ data: [] });
  testState.api.getCategoriesFlat.mockResolvedValue({ data: [] });
  testState.api.getCollectionsAll.mockResolvedValue({ data: [{ id: 11, name: 'VIP Collection' }] });
  testState.api.createProduct.mockResolvedValue({ data: { id: 101, name: 'Created Product' } });
  testState.api.updateProduct.mockResolvedValue({ data: {} });
  testState.api.bulkProductAction.mockResolvedValue({ data: { updated: 1 } });
  testState.api.uploadProductImages.mockResolvedValue({ data: {} });
}

function renderProducts() {
  return render(
    <MemoryRouter>
      <Products />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  resetApiMocks();
  testState.navigate.mockReset();
  testState.auth = {
    user: { username: 'employee', role: 'employee' },
    isAdmin: false,
    isEmployee: true,
    isAuthenticated: true,
    loading: false,
  };
  global.URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
  global.URL.revokeObjectURL = vi.fn();
  window.alert = vi.fn();
});

describe('product management regressions', () => {
  it('removes a newly selected image from the pending upload queue before submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ id: 101 });
    const onCancel = vi.fn();

    const { container } = render(
      <MemoryRouter>
        <ProductForm initialData={{}} onSubmit={onSubmit} onCancel={onCancel} submitLabel="ایجاد محصول" />
      </MemoryRouter>
    );

    await waitFor(() => expect(testState.api.getMaterialsAll).toHaveBeenCalled());
    await user.type(container.querySelector('input[name="name"]'), 'Image Queue Product');
    await user.clear(container.querySelector('input[name="weight_g"]'));
    await user.type(container.querySelector('input[name="weight_g"]'), '10');
    await user.clear(container.querySelector('input[name="print_time_minutes"]'));
    await user.type(container.querySelector('input[name="print_time_minutes"]'), '60');

    const firstFile = new File(['first'], 'first.png', { type: 'image/png' });
    const secondFile = new File(['second'], 'second.png', { type: 'image/png' });
    await user.upload(container.querySelector('#multi-image-input'), [firstFile, secondFile]);

    const pendingRemoveButtons = Array.from(container.querySelectorAll('button')).filter((button) =>
      button.querySelector('svg') && button.className.includes('absolute inset-0')
    );
    await user.click(pendingRemoveButtons[0]);

    await user.click(screen.getByRole('button', { name: /ایجاد محصول/i }));

    await waitFor(() => expect(testState.api.uploadProductImages).toHaveBeenCalledTimes(1));
    expect(testState.api.uploadProductImages).toHaveBeenCalledWith(101, [secondFile]);
  });

  it('preserves tags and collection_ids when creating a product from the products page', async () => {
    const user = userEvent.setup();
    const { container } = renderProducts();

    await waitFor(() => expect(screen.getAllByText('Test Product').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /محصول جدید/i }));

    await user.type(document.querySelector('input[name="name"]'), 'Tagged Product');
    await user.clear(document.querySelector('input[name="weight_g"]'));
    await user.type(document.querySelector('input[name="weight_g"]'), '25');
    await user.clear(document.querySelector('input[name="print_time_minutes"]'));
    await user.type(document.querySelector('input[name="print_time_minutes"]'), '90');
    await user.type(screen.getByPlaceholderText('مثلاً: keychain, gift, pet'), 'gift, vip');
    await user.click(screen.getByRole('button', { name: /VIP Collection/i }));

    await user.click(screen.getByRole('button', { name: /ایجاد محصول/i }));

    await waitFor(() => expect(testState.api.createProduct).toHaveBeenCalledTimes(1));
    expect(testState.api.createProduct).toHaveBeenCalledWith(expect.objectContaining({
      tags: 'gift, vip',
      collection_ids: [11],
    }));
  });

  it('sends clear_collections instead of parsing clear as a collection id in bulk updates', async () => {
    const user = userEvent.setup();
    renderProducts();

    await waitFor(() => expect(screen.getAllByText('Test Product').length).toBeGreaterThan(0));
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(screen.getByRole('button', { name: /عملیات گروهی/i }));

    const collectionSelect = screen.getAllByRole('combobox').find((select) =>
      Array.from(select.options).some((option) => option.value === 'clear')
    );
    fireEvent.change(collectionSelect, { target: { value: 'clear' } });
    await user.click(screen.getByRole('button', { name: /اعمال روی 1 محصول/i }));

    await waitFor(() => expect(testState.api.bulkProductAction).toHaveBeenCalledTimes(1));
    const payload = testState.api.bulkProductAction.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ ids: [7], clear_collections: true }));
    expect(payload).not.toHaveProperty('set_collection_id');
  });

  it('hides admin-only import export and permanent delete actions from employees while keeping edit controls', async () => {
    renderProducts();

    await waitFor(() => expect(screen.getAllByText('Test Product').length).toBeGreaterThan(0));

    expect(screen.queryByTitle('خروجی اکسل')).toBeNull();
    expect(screen.queryByTitle('ورودی اکسل/csv')).toBeNull();
    expect(screen.queryByTitle('حذف دائمی')).toBeNull();
    expect(screen.getByRole('button', { name: /محصول جدید/i })).toBeDefined();
    expect(screen.getByTitle('مخفی از کاتالوگ')).toBeDefined();
  });
});
