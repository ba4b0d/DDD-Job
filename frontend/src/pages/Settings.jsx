import { useState, useEffect } from 'react'
import { Save, Check } from 'lucide-react'
import { getSettings, updateSettings } from '../lib/api'
import { SAVED_FEEDBACK_DELAY } from '../lib/constants'

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await getSettings()
      setSettings(res.data)
      setError(null)
    } catch (e) {
      console.error(e)
      setError('خطا در بارگذاری تنظیمات')
    }
    setLoading(false)
  }

  function handleChange(key, value) {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value: parseFloat(value) || 0 }
    }))
  }

  async function handleSave() {
    setSaving(true)
    const updates = {}
    for (const [key, val] of Object.entries(settings)) {
      updates[key] = val.value
    }
    try {
      await updateSettings(updates)
      setSaved(true)
      setTimeout(() => setSaved(false), SAVED_FEEDBACK_DELAY)
    } catch (e) {
      console.error(e)
      setError('خطا در ذخیره تنظیمات')
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center" style={{color:'var(--text-secondary)'}}>در حال بارگذاری...</div>
  if (error) return <div className="p-8 text-center" style={{color:'#ef4444'}}>{error}</div>

  const fields = [
    { key: 'electricity_rate_per_kwh', label: 'تعرفه برق (تومان/کیلووات)', icon: '⚡' },
    { key: 'default_markup_pct', label: 'ضریب قیمت‌گذاری', icon: '💰', hint: '۳ = سه برابر هزینه پایه' },
    { key: 'overhead_fixed_per_job', label: 'هزینه سربار ثابت هر سفارش', icon: '📋' },
    { key: 'coloring_cost_per_hour', label: 'هزینه رنگ‌آمیزی (تومان/ساعت)', icon: '🎨' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{color:'var(--text-primary)'}}>تنظیمات</h1>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-all"
          style={{background: saved ? '#22c55e' : 'var(--accent)'}}>
          {saved ? <><Check size={18} /> ذخیره شد!</> : <><Save size={18} /> {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</>}
        </button>
      </div>

      <div className="max-w-2xl space-y-4">
        {fields.map(f => (
          <div key={f.key} className="rounded-xl p-5" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <label className="font-semibold" style={{color:'var(--text-primary)'}}>{f.label}</label>
                {f.hint && <p className="text-sm mt-0.5" style={{color:'var(--text-secondary)'}}>{f.hint}</p>}
              </div>
            </div>
            <input
              type="number"
              step="any"
              value={settings[f.key]?.value ?? ''}
              onChange={e => handleChange(f.key, e.target.value)}
              className="w-full px-4 py-3 rounded-lg border text-lg font-medium outline-none transition-colors"
              style={{background:'var(--bg-secondary)', borderColor:'var(--border)', color:'var(--text-primary)'}}
            />
            {settings[f.key]?.description && (
              <p className="text-xs mt-2" style={{color:'var(--text-secondary)'}}>{settings[f.key].description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
