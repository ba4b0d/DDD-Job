import { Filter } from 'lucide-react';

export default function FilterBar({
  categories = [],
  materials = [],
  machines = [],
  selectedCategory,
  selectedMaterial,
  selectedMachine,
  onCategoryChange,
  onMaterialChange,
  onMachineChange,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Filter size={18} style={{ color: 'var(--text-muted)' }} />

      <select
        value={selectedCategory || ''}
        onChange={(e) => onCategoryChange(e.target.value || null)}
        className="select-field w-auto"
        style={{ minWidth: '140px' }}
      >
        <option value="">همه دسته‌ها</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat === 'uncategorized' ? 'بدون دسته‌بندی' : cat}</option>
        ))}
      </select>

      <select
        value={selectedMaterial || ''}
        onChange={(e) => onMaterialChange(e.target.value || null)}
        className="select-field w-auto"
        style={{ minWidth: '140px' }}
      >
        <option value="">همه مواد</option>
        {materials.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <select
        value={selectedMachine || ''}
        onChange={(e) => onMachineChange(e.target.value || null)}
        className="select-field w-auto"
        style={{ minWidth: '140px' }}
      >
        <option value="">همه ماشین‌ها</option>
        {machines.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );
}
