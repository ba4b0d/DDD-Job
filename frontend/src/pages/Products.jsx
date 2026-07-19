import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Weight, ArrowUpLeft, Download, Upload, Eye, EyeOff, Trash2 } from 'lucide-react';
import { getProductsAll, getMaterialsAll, getMachinesAll, getCategoriesList, createProduct, exportProducts, importProducts, updateProduct, deleteProduct, permanentDeleteProduct } from '../lib/api';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import PriceDisplay from '../components/PriceDisplay';
import Modal from '../components/Modal';
import ProductForm from '../components/ProductForm';
import { formatMinutes } from '../lib/utils';

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [machines, setMachines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterMaterial, setFilterMaterial] = useState(null);
  const [filterMachine, setFilterMachine] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef(null);

  const loadProducts = async () => {
    try {
      const pRes = await getProductsAll();
      const pList = Array.isArray(pRes.data)
        ? pRes.data
        : pRes.data?.items || pRes.data?.products || [];
      setProducts(pList);
    } catch (err) {
      console.error('Products load error:', err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [pRes, mRes, machRes, cRes] = await Promise.all([
          getProductsAll({ signal: controller.signal }),
          getMaterialsAll({ signal: controller.signal }),
          getMachinesAll({ signal: controller.signal }),
          getCategoriesList({ signal: controller.signal }),
        ]);
        const pList = Array.isArray(pRes.data)
          ? pRes.data
          : pRes.data?.items || pRes.data?.products || [];
        // /categories returns [{id, name, description, product_count, sort_order}]
        const catsData = cRes.data || [];
        const catsList = Array.isArray(catsData)
          ? catsData.map((c) => c.name)
          : typeof catsData === 'object' && catsData !== null
            ? Object.keys(catsData)
            : [];
        setProducts(pList);
        setMaterials(mRes.data || []);
        setMachines(machRes.data || []);
        setCategories(catsList);
        setError(null);
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.error('Products load error:', err);
          setError('خطا در بارگذاری اطلاعات');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.product_id?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }
    if (filterCategory) {
      if (filterCategory === 'uncategorized') {
        list = list.filter((p) => !p.category || p.category === '');
      } else {
        list = list.filter((p) => p.category === filterCategory);
      }
    }
    if (filterMaterial) list = list.filter((p) => String(p.material_id) === String(filterMaterial));
    if (filterMachine) list = list.filter((p) => String(p.machine_id) === String(filterMachine));

    switch (sortBy) {
      case 'name': list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fa')); break;
      case 'price_asc': list.sort((a, b) => (a.suggested_price || 0) - (b.suggested_price || 0)); break;
      case 'price_desc': list.sort((a, b) => (b.suggested_price || 0) - (a.suggested_price || 0)); break;
      case 'weight': list.sort((a, b) => (a.weight_g || 0) - (b.weight_g || 0)); break;
      default: list.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
    return list;
  }, [products, search, filterCategory, filterMaterial, filterMachine, sortBy]);

  const handleAddProduct = async (data) => {
    const payload = {
      name: data.name,
      product_id: data.product_id || '',
      category: data.category || '',
      material_id: parseInt(data.material_id),
      machine_id: parseInt(data.machine_id),
      weight_g: data.weight_g || 0,
      support_g: data.support_g || 0,
      flushed_g: data.flushed_g || 0,
      print_time_hours: data.print_time_hours || 0,
      post_pro_hours: data.post_pro_hours || 0,
      extras_cost: data.extras_cost || 0,
      final_price: data.final_price || null,
      notes: data.notes || '',
    };
    const res = await createProduct(payload);
    // DON'T close modal here — ProductForm handles image upload after this returns
    // Modal closes in ProductForm.handleSubmit after full flow completes
    await loadProducts();
    return res.data;
  };

  const handleToggleCatalog = async (e, product) => {
    e.stopPropagation();
    try {
      await updateProduct(product.id, { is_active: !product.is_active });
      await loadProducts();
    } catch (err) {
      console.error('Toggle catalog error:', err);
    }
  };

  const handlePermanentDelete = async (e, product) => {
    e.stopPropagation();
    if (!confirm(`"${product.name}" برای همیشه حذف شود؟ این عملیات غیرقابل بازگشت است!`)) return;
    if (!confirm('مطمئن هستید؟')) return;
    try {
      await permanentDeleteProduct(product.id);
      await loadProducts();
    } catch (err) {
      console.error('Permanent delete error:', err);
      alert('خطا: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportProducts();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products_export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('خطا در خروجی گرفتن');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importProducts(file);
      const { created, updated, errors } = res.data;
      let msg = `ایجاد شده: ${created}\nبه‌روزرسانی شده: ${updated}`;
      if (errors.length > 0) {
        msg += `\n\nخطاها (${errors.length}):\n`;
        errors.forEach((e) => {
          msg += `  ردیف ${e.row}: ${e.error}\n`;
        });
      }
      alert(msg);
      if (created > 0 || updated > 0) {
        await loadProducts();
      }
    } catch (err) {
      console.error('Import error:', err);
      const detail = err.response?.data?.detail || 'خطا در وارد کردن فایل';
      alert(detail);
    } finally {
      // Reset file input so same file can be selected again
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#ef4444' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            محصولات
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} از {products.length} محصول
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleExport} className="btn-secondary" title="خروجی اکسل">
            <Download size={16} />
            <span className="hidden sm:inline">خروجی</span>
          </button>
          <button type="button" onClick={handleImportClick} className="btn-secondary" title="ورودی اکسل/csv">
            <Upload size={16} />
            <span className="hidden sm:inline">ورودی</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={16} />
            محصول جدید
          </button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder="جستجو در نام، کد یا دسته‌بندی..." />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select-field w-full sm:w-auto"
            style={{ minWidth: '150px' }}
          >
            <option value="created_at">جدیدترین</option>
            <option value="name">نام</option>
            <option value="price_asc">قیمت ↑</option>
            <option value="price_desc">قیمت ↓</option>
            <option value="weight">وزن</option>
          </select>
        </div>
        <FilterBar
          categories={categories}
          materials={materials}
          machines={machines}
          selectedCategory={filterCategory}
          selectedMaterial={filterMaterial}
          selectedMachine={filterMachine}
          onCategoryChange={setFilterCategory}
          onMaterialChange={setFilterMaterial}
          onMachineChange={setFilterMachine}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          محصولی یافت نشد
        </div>
      ) : (
        <>
          {/* Desktop table — matches dashboard language */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>کد</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>نام</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>ماده</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>وزن / زمان</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>قیمت</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>وضعیت</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {product.product_id || `P${product.id}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{product.name}</div>
                      {product.category && (
                        <span className="badge badge-accent text-[10px] mt-1 inline-block">{product.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {product.material_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="inline-flex items-center gap-1 ml-2">
                        <Weight size={12} />{product.weight_g != null ? `${product.weight_g}g` : '—'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {product.print_time_hours != null
                          ? formatMinutes(product.print_time_hours * 60)
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <PriceDisplay
                        suggestedPrice={product.suggested_price}
                        finalPrice={product.final_price}
                        size="small"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{
                          backgroundColor: product.is_active
                            ? 'rgba(34, 197, 94, 0.18)'
                            : 'rgba(245, 158, 11, 0.18)',
                          color: product.is_active ? '#4ade80' : '#fbbf24',
                        }}
                      >
                        {product.is_active ? 'فعال' : 'مخفی'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleCatalog(e, product)}
                          className="p-2 rounded-lg transition-colors"
                          style={{
                            backgroundColor: product.is_active
                              ? 'rgba(34,197,94,0.15)'
                              : 'rgba(239,68,68,0.15)',
                            color: product.is_active ? '#22c55e' : '#ef4444',
                          }}
                          title={product.is_active ? 'مخفی از کاتالوگ' : 'نمایش در کاتالوگ'}
                        >
                          {product.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handlePermanentDelete(e, product)}
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: '#f87171' }}
                          title="حذف دائمی"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="p-2 rounded-lg"
                          style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
                          title="جزئیات"
                        >
                          <ArrowUpLeft size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filtered.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/products/${product.id}`)}
                className="card p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {product.product_id || `P${product.id}`}
                    </div>
                    <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {product.name}
                    </h3>
                  </div>
                  <span
                    className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      backgroundColor: product.is_active
                        ? 'rgba(34, 197, 94, 0.18)'
                        : 'rgba(245, 158, 11, 0.18)',
                      color: product.is_active ? '#4ade80' : '#fbbf24',
                    }}
                  >
                    {product.is_active ? 'فعال' : 'مخفی'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>{product.material_name || '—'}</span>
                  {product.weight_g != null && <span>{product.weight_g}g</span>}
                </div>
                <PriceDisplay
                  suggestedPrice={product.suggested_price}
                  finalPrice={product.final_price}
                  size="small"
                />
              </div>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="محصول جدید" size="xl">
        <ProductForm
          initialData={{}}
          onSubmit={handleAddProduct}
          onCancel={() => setShowAddModal(false)}
          submitLabel="ایجاد محصول"
        />
      </Modal>
    </div>
  );
}
