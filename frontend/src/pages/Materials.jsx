import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { getMaterialsAll, createMaterial, updateMaterial, deleteMaterial } from '../lib/api'
import Modal from '../components/Modal'
import { formatPrice, ERROR_STYLE, getInputStyle } from '../lib/constants'
import { validateField } from '../lib/validation'

function validateMaterialField(name, value) {
  return validateField('material', name, value)
}
const colorMap = {
  black: '#1a1a1a', Black: '#1a1a1a', white: '#ffffff', White: '#ffffff',
  red: '#ef4444', Red: '#ef4444', orange: '#f97316', gray: '#9ca3af',
  'olive green': '#6b8e23', 'pine green': '#01796f', 'gold black': '#b8860b',
  'gold blue coper': '#d4a574', 'gold silver red': '#c0a080', walnut: '#5c4033',
  'dark mahaguni': '#4a0e0e', blue: '#3b82f6', 'lavander purple': '#b39ddb',
  transparent: '#e0e0e0', 'TRANSPARENT': '#e0e0e0',
}

export default function Materials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', price_per_kg: '', waste_pct: '0.05', color: '', notes: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitError, setSubmitError] = useState(null)

  const loadMaterials = useCallback(async (signal) => {
    try {
      const res = await getMaterialsAll(signal ? { signal } : undefined)
      setMaterials(res.data)
      setError(null)
    } catch (e) {
      if (e?.name !== 'CanceledError' && e?.code !== 'ERR_CANCELED') {
        console.error('Failed to load materials:', e)
        setError('خطا در بارگذاری مواد اولیه')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadMaterials(controller.signal)
    return () => controller.abort()
  }, [loadMaterials])

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', price_per_kg: '', waste_pct: '0.05', color: '', notes: '' })
    setErrors({})
    setTouched({})
    setSubmitError(null)
    setShowModal(true)
  }

  function openEdit(m) {
    setEditItem(m)
    setForm({
      name: m.name,
      price_per_kg: m.price_per_kg,
      waste_pct: m.waste_pct,
      color: m.color,
      notes: m.notes || '',
    })
    setErrors({})
    setTouched({})
    setSubmitError(null)
    setShowModal(true)
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateMaterialField(name, value) }))
    }
  }

  function handleFieldBlur(name, value) {
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validateMaterialField(name, value) }))
  }

  async function handleSave() {
    const requiredFields = ['name', 'price_per_kg']
    const formErrors = {}
    const allTouched = {}
    for (const field of requiredFields) {
      allTouched[field] = true
      const err = validateMaterialField(field, form[field])
      if (err) formErrors[field] = err
    }
    setTouched(allTouched)
    setErrors(formErrors)
    setSubmitError(null)

    if (Object.keys(formErrors).length > 0) {
      setSubmitError('لطفاً فیلدهای الزامی را پر کنید')
      return
    }

    const data = {
      name: form.name,
      price_per_kg: parseFloat(form.price_per_kg),
      waste_pct: parseFloat(form.waste_pct),
      color: form.color,
      notes: form.notes,
    }
    try {
      if (editItem) {
        await updateMaterial(editItem.id, data)
      } else {
        await createMaterial(data)
      }
      setShowModal(false)
      loadMaterials()
    } catch (e) {
      console.error('Failed to save material:', e)
      const msg = e?.response?.data?.detail || e?.message || 'خطا در ذخیره‌سازی'
      setSubmitError(msg)
    }
  }

  async function handleDelete(m) {
    if (!confirm(`"${m.name} ${m.color}" حذف شود؟`)) return
    try {
      await deleteMaterial(m.id)
      loadMaterials()
    } catch (e) { console.error('Failed to delete material:', e) }
  }

  async function toggleActive(m) {
    try {
      await updateMaterial(m.id, { is_active: !m.is_active })
      loadMaterials()
    } catch (e) { console.error('Failed to toggle active:', e) }
  }

  const inputStyle = (fieldName) => getInputStyle(fieldName, touched, errors)

  if (loading) return <div className="p-8 text-center" style={{color:'var(--text-secondary)'}}>در حال بارگذاری...</div>
  if (error) return <div className="p-8 text-center" style={{color:'#ef4444'}}>{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{color:'var(--text-primary)'}}>مواد اولیه</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium" style={{background:'var(--accent)'}}>
          <Plus size={18} /> افزودن ماده
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
        {/* Desktop table */}
        <div className="hidden sm:block">
          <table className="w-full text-right">
            <thead>
              <tr style={{background:'var(--bg-secondary)'}}>
                <th className="px-4 py-3 text-sm font-semibold" style={{color:'var(--text-secondary)'}}>نام</th>
                <th className="px-4 py-3 text-sm font-semibold" style={{color:'var(--text-secondary)'}}>رنگ</th>
                <th className="px-4 py-3 text-sm font-semibold" style={{color:'var(--text-secondary)'}}>قیمت/کیلو</th>
                <th className="px-4 py-3 text-sm font-semibold" style={{color:'var(--text-secondary)'}}>ضریب ضایعات</th>
                <th className="px-4 py-3 text-sm font-semibold" style={{color:'var(--text-secondary)'}}>وضعیت</th>
                <th className="px-4 py-3 text-sm font-semibold" style={{color:'var(--text-secondary)'}}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(m => (
                <tr key={m.id} className="border-t" style={{borderColor:'var(--border)'}}>
                  <td className="px-4 py-3 font-medium" style={{color:'var(--text-primary)'}}>{m.name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border inline-block" style={{
                        background: colorMap[m.color?.toLowerCase()] || m.color || '#ccc',
                        borderColor: 'var(--border)'
                      }} />
                      <span style={{color:'var(--text-primary)'}}>{m.color}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{color:'var(--text-primary)'}}>{formatPrice(m.price_per_kg)}</td>
                  <td className="px-4 py-3" style={{color:'var(--text-primary)'}}>%{(m.waste_pct * 100).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(m)} className={`px-2 py-1 rounded text-xs font-medium ${m.is_active ? 'text-green-400' : 'text-red-400'}`} style={{background: m.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}}>
                      {m.is_active ? 'فعال' : 'غیرفعال'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-white/10" style={{color:'var(--accent)'}}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(m)} className="p-1.5 rounded-lg hover:bg-red-500/20" style={{color:'var(--danger)'}}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y" style={{borderColor:'var(--border)'}}>
          {materials.map(m => (
            <div key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border shrink-0" style={{
                    background: colorMap[m.color?.toLowerCase()] || m.color || '#ccc',
                    borderColor: 'var(--border)'
                  }} />
                  <span className="font-medium text-sm" style={{color:'var(--text-primary)'}}>{m.name}</span>
                </div>
                <button onClick={() => toggleActive(m)} className={`px-2 py-0.5 rounded text-[10px] font-medium ${m.is_active ? 'text-green-400' : 'text-red-400'}`} style={{background: m.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}}>
                  {m.is_active ? 'فعال' : 'غیرفعال'}
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs mb-2" style={{color:'var(--text-secondary)'}}>
                <span>{m.color}</span>
                <span>{formatPrice(m.price_per_kg)}/کیلو</span>
                <span>%{(m.waste_pct * 100).toFixed(0)} ضایعات</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(m)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{background:'var(--bg-secondary)', color:'var(--accent)'}}>
                  <Pencil size={12} /> ویرایش
                </button>
                <button onClick={() => handleDelete(m)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{background:'rgba(239,68,68,0.15)', color:'var(--danger)'}}>
                  <Trash2 size={12} /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'ویرایش ماده' : 'افزودن ماده جدید'}>
        <div className="space-y-4">
          {submitError && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>نام ماده *</label>
            <input value={form.name} onChange={e => handleFieldChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name', form.name)}
              className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('name')} />
            {touched.name && errors.name && <span style={ERROR_STYLE}>{errors.name}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>قیمت هر کیلو (تومان) *</label>
              <input type="number" value={form.price_per_kg} onChange={e => handleFieldChange('price_per_kg', e.target.value)}
                onBlur={() => handleFieldBlur('price_per_kg', form.price_per_kg)}
                className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('price_per_kg')} />
              {touched.price_per_kg && errors.price_per_kg && <span style={ERROR_STYLE}>{errors.price_per_kg}</span>}
            </div>
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>ضریب ضایعات</label>
              <input type="number" step="0.01" value={form.waste_pct} onChange={e => handleFieldChange('waste_pct', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('waste_pct')} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>رنگ</label>
            <input value={form.color} onChange={e => handleFieldChange('color', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('color')} />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>توضیحات</label>
            <input value={form.notes} onChange={e => handleFieldChange('notes', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('notes')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg" style={{color:'var(--text-secondary)'}}>لغو</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium" style={{background:'var(--accent)'}}>
              <Check size={16} /> ذخیره
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
