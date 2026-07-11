import { formatPrice } from '../lib/utils';

const COST_COLORS = {
  material_cost: '#6366f1',
  power_cost: '#f59e0b',
  downtime_cost: '#8b5cf6',
  maintenance_cost: '#ec4899',
  coloring_cost: '#14b8a6',
  overhead_cost: '#64748b',
  extras_cost: '#f97316',
};

const COST_LABELS = {
  material_cost: 'هزینه ماده',
  power_cost: 'هزینه برق',
  downtime_cost: 'استهلاک',
  maintenance_cost: 'نگهداری',
  coloring_cost: 'رنگ‌آمیزی',
  overhead_cost: 'سرپرستی',
  extras_cost: 'اضافی',
};

export default function CostBreakdown({ result, compact = false }) {
  if (!result) return null;

  const costItems = Object.keys(COST_LABELS)
    .filter((key) => result[key] != null)
    .map((key) => ({
      key,
      label: COST_LABELS[key],
      value: result[key] || 0,
      color: COST_COLORS[key],
    }));

  const maxCost = Math.max(...costItems.map((i) => i.value), 1);

  return (
    <div className="space-y-3.5">
      {/* Cost items */}
      <div className="space-y-2.5">
        {costItems.map((item) => (
          <div key={item.key} className="flex items-center gap-3">
            <span
              className="text-xs font-medium shrink-0"
              style={{ color: 'var(--text-secondary)', width: compact ? '70px' : '84px' }}
            >
              {item.label}
            </span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((item.value / maxCost) * 100, 2)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <span
              className="text-xs font-mono shrink-0 text-left tabular-nums"
              style={{ color: 'var(--text-primary)', minWidth: '78px' }}
            >
              {formatPrice(item.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="pt-3.5 mt-3.5 space-y-2.5" style={{ borderTop: '1px solid var(--border-color)' }}>
        {result.base_price != null && (
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>قیمت پایه</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatPrice(result.base_price)}
            </span>
          </div>
        )}
        {result.suggested_price != null && (
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>قیمت پیشنهادی</span>
            <span className="font-bold" style={{ color: 'var(--accent)' }}>
              {formatPrice(result.suggested_price)}
            </span>
          </div>
        )}
        {result.gross_margin != null && (
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>حاشیه سود</span>
            <span
              className="font-semibold"
              style={{ color: result.gross_margin >= 0 ? 'var(--success)' : 'var(--danger)' }}
            >
              {formatPrice(result.gross_margin)} تومان
              {result.margin_pct != null && (
                <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>
                  ({result.margin_pct.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}