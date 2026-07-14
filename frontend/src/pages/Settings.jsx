import { useState, useEffect } from 'react'
import { Save, Check, Upload } from 'lucide-react'
import { getSettings, updateSettings, uploadBranding } from '../lib/api'
import { SAVED_FEEDBACK_DELAY } from '../lib/constants'

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState({})

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

  function handleChange(key, value, isString = false) {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [isString ? 'string_value' : 'value']: isString ? value : (parseFloat(value) || 0) }
    }))
  }

  async function handleFileUpload(key, file) {
    if (!file) return
    setUploading(prev => ({ ...prev, [key]: true }))
    try {
      const res = await uploadBranding(key, file)
      const url = res.data.url
      setSettings(prev => ({
        ...prev,
        [key]: { ...prev[key], string_value: url }
      }))
      if (key === 'favicon_url') {
        let link = document.querySelector("link[rel*='icon']")
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = url + '?t=' + Date.now()
      } else if (key === 'logo_url') {
        window.__APP_LOGO_URL = url
      }
    } catch (err) {
      console.error('Upload failed:', err)
      setError('خطا در آپلود فایل: ' + (err.response?.data?.detail || err.message))
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }))
    }
  }

  async function handleSave() {
    setSaving(true)
    const updates = { settings: [] }
    for (const [key, val] of Object.entries(settings)) {
      updates.settings.push({
        key,
        value: val.value ?? 0,
        string_value: val.string_value ?? '',
      })
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
    { key: 'favicon_url', label: 'فاوآیکون (favicon)', icon: '🌐', type: 'url', stringField: true, accept: '.png,.jpg,.jpeg,.svg,.ico,.webp', hint: 'تصویر کوچک نمایش داده‌شده در تب مرورگر' },
    { key: 'logo_url', label: 'لوگو', icon: '🖼️', type: 'url', stringField: true, accept: '.png,.jpg,.jpeg,.svg,.webp', hint: 'لوگوی اصلی برند' },
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
              <div className="flex-1">
                <label className="font-semibold" style={{color:'var(--text-primary)'}}>{f.label}</label>
                {f.hint && <p className="text-sm mt-0.5" style={{color:'var(--text-secondary)'}}>{f.hint}</p>}
              </div>
            </div>

            {f.stringField ? (
              <>
                <div className="flex gap-2 items-center">
                  <input
                    type={f.type || 'text'}
                    value={settings[f.key]?.string_value ?? ''}
                    onChange={e => handleChange(f.key, e.target.value, true)}
                    placeholder="https://..."
                    className="flex-1 px-4 py-3 rounded-lg border text-base outline-none transition-colors"
                    style={{background:'var(--bg-secondary)', borderColor:'var(--border)', color:'var(--text-primary)'}}
                  />
                  <label className="flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors hover:opacity-80 flex-shrink-0"
                    style={{background:'var(--accent)', color:'white'}}>
                    <Upload size={18} />
                    <span>{uploading[f.key] ? '...' : 'آپلود'}</span>
                    <input
                      type="file"
                      accept={f.accept}
                      className="hidden"
                      onChange={e => handleFileUpload(f.key, e.target.files?.[0])}
                      disabled={uploading[f.key]}
                    />
                  </label>
                </div>
                {settings[f.key]?.string_value && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={settings[f.key].string_value} alt={f.key}
                      className={f.key === 'favicon_url' ? 'w-8 h-8 object-contain border rounded p-1' : 'h-12 object-contain border rounded px-2 py-1'}
                      style={{borderColor: 'var(--border)', maxWidth: 200}}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <span className="text-xs" style={{color:'var(--text-secondary)'}}>
                      {f.key === 'favicon_url' ? '✓ فاوآیکون فعلی' : '✓ لوگوی فعلی'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <input
                type="number"
                step="any"
                value={settings[f.key]?.value ?? ''}
                onChange={e => handleChange(f.key, e.target.value, false)}
                className="w-full px-4 py-3 rounded-lg border text-lg font-medium outline-none transition-colors"
                style={{background:'var(--bg-secondary)', borderColor:'var(--border)', color:'var(--text-primary)'}}
              />
            )}

            {settings[f.key]?.description && (
              <p className="text-xs mt-2" style={{color:'var(--text-secondary)'}}>{settings[f.key].description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
