export default function StatCard({ icon: Icon, title, value, color = 'var(--accent)' }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
        style={{ backgroundColor: `${color}15`, color }}
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
