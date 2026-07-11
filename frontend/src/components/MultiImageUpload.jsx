import { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Star, StarOff, GripVertical } from 'lucide-react';

const MAX_IMAGES = 5;

export default function MultiImageUpload({ images = [], onChange }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [newFiles, setNewFiles] = useState([]);

  const handleFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const available = MAX_IMAGES - images.length - newFiles.length;
    const toAdd = imageFiles.slice(0, available);
    if (toAdd.length === 0) return;

    const previews = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isNew: true,
    }));
    setNewFiles(prev => [...prev, ...previews]);
  }, [images.length, newFiles.length]);

  const handleInput = useCallback((e) => handleFiles(e.target.files), [handleFiles]);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeExisting = useCallback((imageId) => {
    onChange({ remove: imageId });
  }, [onChange]);

  const removeNew = useCallback((index) => {
    setNewFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const setPrimary = useCallback((imageId) => {
    onChange({ setPrimary: imageId });
  }, [onChange]);

  const totalCount = images.length + newFiles.length;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleInput}
        className="hidden"
        id="multi-image-input"
      />

      {/* Existing images */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative group rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <img src={img.image_url} alt="" className="w-full h-20 object-cover" />
            {img.is_primary && (
              <div className="absolute top-1 left-1 p-0.5 rounded" style={{ backgroundColor: 'var(--accent)' }}>
                <Star size={10} className="text-white" fill="white" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              {!img.is_primary && (
                <button type="button" onClick={() => setPrimary(img.id)}
                  className="p-1 rounded-full bg-white/80 hover:bg-white" title="تصویر اصلی">
                  <StarOff size={12} />
                </button>
              )}
              <button type="button" onClick={() => removeExisting(img.id)}
                className="p-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white" title="حذف">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}

        {/* New (pending upload) images */}
        {newFiles.map((nf, idx) => (
          <div key={`new-${idx}`} className="relative group rounded-lg overflow-hidden" style={{ border: '1px solid var(--accent)' }}>
            <img src={nf.preview} alt="" className="w-full h-20 object-cover" />
            <div className="absolute top-1 right-1 px-1 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: 'var(--accent)' }}>
              جدید
            </div>
            <button type="button" onClick={() => removeNew(idx)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-all">
              <span className="p-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white">
                <Trash2 size={12} />
              </span>
            </button>
          </div>
        ))}

        {/* Add button */}
        {totalCount < MAX_IMAGES && (
          <label
            htmlFor="multi-image-input"
            className="flex flex-col items-center justify-center h-20 rounded-lg cursor-pointer transition-colors hover:border-[var(--accent)]"
            style={{ border: '2px dashed var(--border)', color: 'var(--text-muted)' }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Plus size={18} />
            <span className="text-[10px] mt-0.5">افزودن</span>
          </label>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {totalCount}/{MAX_IMAGES} تصویر • تصویر اصلی با ⭐ نمایش داده می‌شود
      </p>
    </div>
  );
}
