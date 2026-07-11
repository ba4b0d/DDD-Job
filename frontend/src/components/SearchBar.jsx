import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'جستجو...' }) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--text-muted)' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field pr-10"
        placeholder={placeholder}
      />
    </div>
  );
}
