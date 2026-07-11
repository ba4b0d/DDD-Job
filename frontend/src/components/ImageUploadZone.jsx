import { useRef } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';

export default function ImageUploadZone({
  imagePreview,
  dragOver,
  fileInputRef,
  onFileInput,
  onDrop,
  onDragOver,
  onDragLeave,
  onRemove,
  onTrigger,
}) {
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFileInput}
        className="hidden"
        id="product-image-input"
      />
      {imagePreview ? (
        <div className="relative rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <img
            src={imagePreview}
            alt="Product preview"
            className="w-full h-48 object-contain"
            style={{ background: 'var(--bg-secondary)' }}
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
            title="حذف تصویر"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={onTrigger}
            className="absolute top-2 left-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            title="تغییر تصویر"
          >
            <Camera size={14} />
          </button>
        </div>
      ) : (
        <label
          htmlFor="product-image-input"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className="flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer transition-colors"
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            background: dragOver ? 'var(--bg-secondary)' : 'transparent',
            padding: '2rem',
            color: 'var(--text-muted)',
          }}
        >
          <Upload size={28} style={{ color: dragOver ? 'var(--accent)' : 'var(--text-muted)' }} />
          <span className="text-sm">تصویر را بکشید یا کلیک کنید</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            JPEG, PNG, WebP, GIF
          </span>
        </label>
      )}
    </div>
  );
}
