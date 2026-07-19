export default function StatCard({ icon: Icon, title, value, color = 'var(--accent)' }) {
  return (
    <div
      className="card p-4 flex items-center gap-4"
      style={{
        background: 'color-mix(in srgb, var(--bg-secondary) 94%, transparent)',
      }}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
        style={{
          backgroundColor: 'var(--accent-light)',
          color,
          border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
          boxShadow: '0 0 16px rgba(129, 140, 248, 0.12)',
        }}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {title}
        </p>
        <p className="text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}
