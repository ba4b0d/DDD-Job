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
  // Build parent map to compute nesting depth for subcategory indentation
  const catById = new Map(categories.map((c) => [c.id, c]));
  const depthOf = (cat) => {
    let depth = 0;
    let cur = cat;
    const seen = new Set();
    while (cur && cur.parent_id != null && catById.has(cur.parent_id) && !seen.has(cur.id)) {
      seen.add(cur.id);
      depth += 1;
      cur = catById.get(cur.parent_id);
    }
    return depth;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Filter size={18} style={{ color: 'var(--text-muted)' }} />

      <select
        value={selectedCategory || ''}
        onChange={(e) => {
          const v = e.target.value;
          onCategoryChange(v === '' ? null : (v === 'uncategorized' ? 'uncategorized' : Number(v)));
        }}
        className="select-field w-auto"
        style={{ minWidth: '140px' }}
      >
        <option value="">همه دسته‌ها</option>
        <option value="uncategorized">بدون دسته‌بندی</option>
        {categories.map((cat) => {
          const depth = depthOf(cat);
          const label = depth > 0 ? `${'\u00A0'.repeat(depth * 3)}└ ${cat.name}` : cat.name;
          return (
            <option key={cat.id} value={cat.id}>{label}</option>
          );
        })}
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
