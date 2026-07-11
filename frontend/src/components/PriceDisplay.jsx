import { formatPrice } from '../lib/utils';

export default function PriceDisplay({ basePrice, suggestedPrice, finalPrice, size = 'normal' }) {
  const isSmall = size === 'small';

  if (isSmall) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-bold text-base" style={{ color: 'var(--accent)' }}>
          {formatPrice(finalPrice || suggestedPrice || basePrice || 0)}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>تومان</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {basePrice != null && basePrice > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>قیمت پایه</span>
          <span className="line-through text-sm" style={{ color: 'var(--text-muted)' }}>
            {formatPrice(basePrice)}
          </span>
        </div>
      )}

      {suggestedPrice != null && suggestedPrice > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>قیمت پیشنهادی</span>
          <span className="font-bold text-xl" style={{ color: 'var(--accent)' }}>
            {formatPrice(suggestedPrice)} <span className="text-sm font-normal">تومان</span>
          </span>
        </div>
      )}

      {finalPrice != null && finalPrice > 0 && (
        <div
          className="flex items-center justify-between pt-2 mt-1"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>قیمت نهایی</span>
          <span className="font-bold text-2xl" style={{ color: 'var(--success)' }}>
            {formatPrice(finalPrice)} <span className="text-base font-normal">تومان</span>
          </span>
        </div>
      )}
    </div>
  );
}