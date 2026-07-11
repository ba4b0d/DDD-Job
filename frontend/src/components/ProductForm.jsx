import { useState, useEffect } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { getMaterialsAll, getMachinesAll, getCategoriesList, uploadProductImages, deleteProductImage, setPrimaryImage } from '../lib/api';
import CostBreakdown from './CostBreakdown';
import FormField from './FormField';
import MultiImageUpload from './MultiImageUpload';
import useProductCalculation from '../hooks/useProductCalculation';
import { useNavigate } from 'react-router-dom';

function validateField(name, value) {
  switch (name) {
    case 'name':
      if (!value || value.trim().length < 2) return 'نام محصول باید حداقل ۲ کاراکتر باشد';
      return '';
    case 'material_id':
      if (!value) return 'لطفاً ماده را انتخاب کنید';
      return '';
    case 'machine_id':
      if (!value) return 'لطفاً ماشین را انتخاب کنید';
      return '';
    case 'weight_g':
      if (!value || parseFloat(value) <= 0) return 'وزن باید بزرگتر از صفر باشد';
      return '';
    case 'print_time_minutes':
      if (!value || parseFloat(value) <= 0) return 'زمان چاپ باید بزرگتر از صفر باشد';
      return '';
    default:
      return '';
  }
}

function validateAll(form) {
  const errors = {};
  const requiredFields = ['name', 'material_id', 'machine_id', 'weight_g', 'print_time_minutes'];
  for (const field of requiredFields) {
    const err = validateField(field, form[field]);
    if (err) errors[field] = err;
  }
  return errors;
}

export default function ProductForm({ initialData, onSubmit, onCancel, submitLabel = 'ذخیره' }) {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [machines, setMachines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState(initialData?.images || []);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingRemovals, setPendingRemovals] = useState([]);
  const [pendingPrimary, setPendingPrimary] = useState(null);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const [form, setForm] = useState({
    name: '', product_id: '', category: '', material_id: '', machine_id: '',
    weight_g: '', support_g: '', flushed_g: '', post_pro_hours: '',
    extras_cost: '', final_price: '', notes: '',
    ...initialData,
    print_time_minutes: initialData?.print_time_hours
      ? String(Math.round(initialData.print_time_hours * 60))
      : initialData?.print_time_minutes || '',
  });

  const { calcResult, calculating } = useProductCalculation(form);

  useEffect(() => {
    Promise.all([getMaterialsAll(), getMachinesAll(), getCategoriesList()])
      .then(([matRes, machRes, catRes]) => {
        setMaterials(matRes.data || []);
        setMachines(machRes.data || []);
        const catsList = Array.isArray(catRes.data) ? catRes.data.map(c => c.name) : [];
        setCategories(catsList);
      })
      .catch((err) => console.error('Failed to load form data:', err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleImageAction = async (action) => {
    const productId = initialData?.id;
    if (!productId) return;

    if (action.remove) {
      try {
        await deleteProductImage(productId, action.remove);
        setImages(prev => prev.filter(img => img.id !== action.remove));
      } catch (err) {
        console.error('Image delete error:', err);
      }
    }
    if (action.setPrimary) {
      try {
        const res = await setPrimaryImage(productId, action.setPrimary);
        if (res.data?.images) setImages(res.data.images);
      } catch (err) {
        console.error('Set primary error:', err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    const formErrors = validateAll(form);
    const allTouched = {};
    for (const key of Object.keys(form)) allTouched[key] = true;
    setTouched(allTouched);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setLoading(true);
    try {
      const result = await onSubmit({
        ...form,
        weight_g: parseFloat(form.weight_g) || 0,
        support_g: parseFloat(form.support_g) || 0,
        flushed_g: parseFloat(form.flushed_g) || 0,
        print_time_hours: parseFloat(form.print_time_minutes) / 60 || 0,
        post_pro_hours: parseFloat(form.post_pro_hours) || 0,
        extras_cost: parseFloat(form.extras_cost) || 0,
        final_price: parseFloat(form.final_price) || 0,
      });
      const productId = result?.id || initialData?.id;

      // Upload pending files
      if (pendingFiles.length > 0 && productId) {
        await uploadProductImages(productId, pendingFiles);
      }

      if (onCancel) onCancel();
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err?.response?.data?.detail || err?.message || 'خطا در ذخیرهسازی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField label="نام محصول" name="name" value={form.name} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} required placeholder="مثال: جعبه موبایل" />
        <FormField label="شناسه محصول" name="product_id" value={form.product_id} onChange={handleChange} placeholder="مثال: PROD-001" />
        <FormField label="دسته‌بندی" name="category" value={form.category} onChange={handleChange} touched={touched} errors={errors}>
          <select name="category" value={form.category} onChange={handleChange} className="select-field">
            <option value="">انتخاب کنید</option>
            {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
        </FormField>
        <FormField label="ماده" name="material_id" value={form.material_id} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} required>
          <select name="material_id" value={form.material_id} onChange={handleChange} onBlur={handleBlur} className="select-field" style={{ borderColor: touched.material_id ? (errors.material_id ? '#ef4444' : 'var(--border)') : 'var(--border)' }}>
            <option value="">انتخاب ماده</option>
            {materials.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.color})</option>))}
          </select>
        </FormField>
        <FormField label="ماشین" name="machine_id" value={form.machine_id} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} required>
          <select name="machine_id" value={form.machine_id} onChange={handleChange} onBlur={handleBlur} className="select-field" style={{ borderColor: touched.machine_id ? (errors.machine_id ? '#ef4444' : 'var(--border)') : 'var(--border)' }}>
            <option value="">انتخاب ماشین</option>
            {machines.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </FormField>
        <FormField label="وزن خالص (گرم)" name="weight_g" type="number" value={form.weight_g} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} required placeholder="0" min="0" step="0.1" />
        <FormField label="وزن ساپورت (گرم)" name="support_g" type="number" value={form.support_g} onChange={handleChange} placeholder="0" min="0" step="0.1" />
        <FormField label="وزن شستشو (گرم)" name="flushed_g" type="number" value={form.flushed_g} onChange={handleChange} placeholder="0" min="0" step="0.1" />
        <FormField label="زمان چاپ (دقیقه)" name="print_time_minutes" type="number" value={form.print_time_minutes} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} required placeholder="0" min="0" step="1" />
        <FormField label="زمان پس‌پردازش (ساعت)" name="post_pro_hours" type="number" value={form.post_pro_hours} onChange={handleChange} placeholder="0" min="0" step="0.25" />
        <FormField label="هزینه اضافی (تومان)" name="extras_cost" type="number" value={form.extras_cost} onChange={handleChange} placeholder="0" min="0" />
        <FormField label="قیمت نهایی (تومان)" name="final_price" type="number" value={form.final_price} onChange={handleChange} placeholder="خالی = قیمت پیشنهادی" min="0" />
      </div>

      <FormField label="یادداشت" name="notes" value={form.notes} onChange={handleChange}>
        <textarea name="notes" value={form.notes} onChange={handleChange} className="input-field" rows={3} placeholder="توضیحات اضافی..." />
      </FormField>

      <FormField label="تصاویر محصول" name="images">
        <MultiImageUpload
          images={images}
          onChange={handleImageAction}
        />
      </FormField>

      {calculating && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={16} className="animate-spin" />
          <span>در حال محاسبه...</span>
        </div>
      )}

      {calcResult && !calculating && (
        <div className="card p-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>پیش‌نمایش هزینه</h4>
          <CostBreakdown result={calcResult} compact />
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {submitLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel || (() => navigate(-1))}>
          <X size={16} />
          انصراف
        </button>
      </div>
    </form>
  );
}
