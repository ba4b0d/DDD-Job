import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Edit,
  Trash2,
  Weight,
  Clock,
  Layers,
  Cog,
  Tag,
  FileText,
  Loader2,
  Camera,
  Upload,
  Star,
} from 'lucide-react';
import { getProduct, deleteProduct, calculate, uploadProductImages, deleteProductImage, setPrimaryImage, updateProduct } from '../lib/api';
import CostBreakdown from '../components/CostBreakdown';
import PriceDisplay from '../components/PriceDisplay';
import { formatPrice, formatMinutes } from '../lib/utils';
import Modal from '../components/Modal';
import ProductForm from '../components/ProductForm';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.pathname.endsWith('/edit');
  const [product, setProduct] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const fileInputRef = useRef(null);
  const productImages = product?.images || [];
  const currentImage = productImages.length > 0 ? productImages[activeImageIndex] : null;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getProduct(id);
        const p = res.data;
        setProduct(p);

        // Try to calculate cost breakdown
        if (p.material_id && p.machine_id && p.weight_g && p.print_time_hours) {
          try {
            const calcRes = await calculate({
              material_id: p.material_id,
              machine_id: p.machine_id,
              weight_g: p.weight_g,
              support_g: p.support_g || 0,
              flushed_g: p.flushed_g || 0,
              print_time_hours: p.print_time_hours,
              post_pro_hours: p.post_pro_hours || 0,
              extras_cost: p.extras_cost || 0,
            });
            setCalcResult(calcRes.data);
          } catch {
            // ignore calc errors
          }
        }
      } catch (err) {
        console.error('Product load error:', err);
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProduct(id);
      navigate('/products');
    } catch (err) {
      console.error('Delete error:', err);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !product) return;
    setImageUploading(true);
    try {
      const res = await uploadProductImages(product.id, Array.from(files));
      if (res.data?.images) {
        setProduct({ ...product, images: res.data.images, image_url: res.data.images[0]?.image_url });
      }
    } catch (err) {
      console.error('Image upload error:', err);
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageDelete = async (imageId) => {
    if (!product) return;
    setImageUploading(true);
    try {
      const res = await deleteProductImage(product.id, imageId);
      if (res.data?.images) {
        setProduct({ ...product, images: res.data.images, image_url: res.data.images[0]?.image_url || null });
        if (activeImageIndex >= res.data.images.length) {
          setActiveImageIndex(Math.max(0, res.data.images.length - 1));
        }
      }
    } catch (err) {
      console.error('Image delete error:', err);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSetPrimary = async (imageId) => {
    if (!product) return;
    try {
      const res = await setPrimaryImage(product.id, imageId);
      if (res.data?.images) {
        setProduct({ ...product, images: res.data.images, image_url: res.data.images.find(i => i.is_primary)?.image_url });
      }
    } catch (err) {
      console.error('Set primary error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>در حال بارگذاری...</div>
      </div>
    );
  }

  if (!product) return null;

  // Edit mode
  if (isEdit) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate(`/products/${id}`)} className="btn-secondary">
            <ArrowRight size={16} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>ویرایش محصول</h1>
        </div>
        <div className="card p-6">
          <ProductForm
            initialData={product}
            onSubmit={(data) => updateProduct(id, data)}
            onCancel={() => navigate(`/products/${id}`)}
            submitLabel="ذخیره تغییرات"
          />
        </div>
      </div>
    );
  }

  const infoItems = [
    { icon: Tag, label: 'دسته‌بندی', value: product.category || '—' },
    { icon: Layers, label: 'ماده', value: product.material_name || product.material?.name || '—' },
    { icon: Cog, label: 'ماشین', value: product.machine_name || product.machine?.name || '—' },
    { icon: Weight, label: 'وزن خالص', value: product.weight_g ? `${product.weight_g} گرم` : '—' },
    {
      icon: Weight,
      label: 'وزن ساپورت',
      value: product.support_g ? `${product.support_g} گرم` : '—',
    },
    {
      icon: Weight,
      label: 'وزن شستشو',
      value: product.flushed_g ? `${product.flushed_g} گرم` : '—',
    },
    {
      icon: Clock,
      label: 'زمان چاپ',
      value: product.print_time_hours
        ? formatMinutes(product.print_time_hours * 60)
        : '—',
    },
    {
      icon: Clock,
      label: 'پس‌پردازش',
      value: product.post_pro_hours ? `${product.post_pro_hours} ساعت` : '—',
    },
    {
      icon: FileText,
      label: 'هزینه اضافی',
      value: product.extras_cost ? formatPrice(product.extras_cost) : '—',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/products')} className="btn-secondary p-2">
            <ArrowRight size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {product.name}
            </h2>
            {product.product_id && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {product.product_id}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/products/${id}/edit`)} className="btn-secondary">
            <Edit size={16} />
            ویرایش
          </button>
          <button onClick={() => setDeleteConfirm(true)} className="btn-danger">
            <Trash2 size={16} />
            حذف
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Price display */}
          <div className="card p-5">
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
              قیمت‌گذاری
            </h4>
            <PriceDisplay
              basePrice={calcResult?.base_price}
              suggestedPrice={product.suggested_price || calcResult?.suggested_price}
              finalPrice={product.final_price}
            />
          </div>

          {/* Product Images */}
          <div className="card p-5">
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
              تصاویر محصول ({productImages.length}/5)
            </h4>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="detail-image-input"
            />

            {/* Main image display */}
            {currentImage ? (
              <div className="relative rounded-lg overflow-hidden mb-3">
                <img
                  src={currentImage.image_url}
                  alt={product.name}
                  className="w-full h-48 object-contain rounded-lg"
                  style={{ background: 'var(--bg-secondary)' }}
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <label
                    htmlFor="detail-image-input"
                    className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer transition-colors"
                    title="افزودن تصویر"
                  >
                    <Upload size={14} />
                  </label>
                  {!currentImage.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(currentImage.id)}
                      className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                      title="تصویر اصلی"
                    >
                      <Star size={14} />
                    </button>
                  )}
                  {currentImage.is_primary && (
                    <span className="p-1.5 rounded-full text-white" style={{ backgroundColor: 'var(--accent)' }} title="تصویر اصلی">
                      <Star size={14} fill="white" />
                    </span>
                  )}
                  <button
                    onClick={() => handleImageDelete(currentImage.id)}
                    disabled={imageUploading}
                    className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                    title="حذف تصویر"
                  >
                    {imageUploading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="detail-image-input"
                className="flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer transition-colors"
                style={{
                  border: '2px dashed var(--border)',
                  padding: '2rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Upload size={28} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm">تصاویر را بکشید یا کلیک کنید</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  حداکثر ۵ تصویر • JPEG, PNG, WebP, GIF
                </span>
              </label>
            )}

            {/* Thumbnail strip */}
            {productImages.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {productImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImageIndex(idx)}
                    className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all"
                    style={{
                      border: idx === activeImageIndex ? '2px solid var(--accent)' : '2px solid var(--border)',
                      opacity: idx === activeImageIndex ? 1 : 0.7,
                    }}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    {img.is_primary && (
                      <div className="absolute top-0.5 left-0.5 p-0.5 rounded" style={{ backgroundColor: 'var(--accent)' }}>
                        <Star size={8} className="text-white" fill="white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="card p-5">
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
              مشخصات
            </h4>
            <div className="space-y-3">
              {infoItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <item.icon size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.label}
                    </span>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {product.notes && (
            <div className="card p-5">
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                یادداشت
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {product.notes}
              </p>
            </div>
          )}
        </div>

        {/* Cost breakdown */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              تحلیل هزینه
            </h4>
            {calcResult ? (
              <CostBreakdown result={calcResult} />
            ) : (
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                اطلاعات کافی برای محاسبه هزینه وجود ندارد
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="تایید حذف"
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          آیا از حذف محصول <strong>{product.name}</strong> اطمینان دارید؟ این عمل غیرقابل بازگشت است.
        </p>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={() => setDeleteConfirm(false)} className="btn-secondary">
            انصراف
          </button>
          <button onClick={handleDelete} className="btn-danger" disabled={deleting}>
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            حذف
          </button>
        </div>
      </Modal>
    </div>
  );
}
