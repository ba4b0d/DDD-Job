import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Check, Zap } from 'lucide-react'
import { getMachinesAll, getSettings, createMachine, updateMachine, deleteMachine } from '../lib/api'
import Modal from '../components/Modal'
import { formatPrice, ERROR_STYLE, getInputStyle } from '../lib/constants'
import { validateField } from '../lib/validation'

function validateMachineField(name, value) {
  return validateField('machine', name, value)
}

export default function Machines() {
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', power_watts: '', purchase_price: '', life_hours: '', maintenance_pct: '0.05' })
  const [settings, setSettings] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitError, setSubmitError] = useState(null)

  const load = useCallback(async (signal) => {
    try {
      const [mRes, sRes] = await Promise.all([
        getMachinesAll({ signal }),
        getSettings({ signal }),
      ])
      setMachines(mRes.data)
      setSettings(sRes.data)
      setError(null)
    } catch (e) {
      if (e?.name !== 'CanceledError' && e?.code !== 'ERR_CANCELED') {
        console.error('Failed to load machines:', e)
        setError('خطا در بارگذاری اطلاعات')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', power_watts: '120', purchase_price: '', life_hours: '5000', maintenance_pct: '0.05' })
    setErrors({})
    setTouched({})
    setSubmitError(null)
    setShowModal(true)
  }

  function openEdit(m) {
    setEditItem(m)
    setForm({
      name: m.name,
      power_watts: m.power_watts,
      purchase_price: m.purchase_price,
      life_hours: m.life_hours,
      maintenance_pct: m.maintenance_pct,
    })
    setErrors({})
    setTouched({})
    setSubmitError(null)
    setShowModal(true)
  }

  function handleFieldChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateMachineField(name, value) }))
    }
  }

  function handleFieldBlur(name, value) {
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validateMachineField(name, value) }))
  }

  async function handleSave() {
    const requiredFields = ['name', 'power_watts', 'purchase_price']
    const formErrors = {}
    const allTouched = {}
    for (const field of requiredFields) {
      allTouched[field] = true
      const err = validateMachineField(field, form[field])
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
      power_watts: parseFloat(form.power_watts),
      purchase_price: parseFloat(form.purchase_price),
      life_hours: parseFloat(form.life_hours),
      maintenance_pct: parseFloat(form.maintenance_pct),
    }
    try {
      if (editItem) {
        await updateMachine(editItem.id, data)
      } else {
        await createMachine(data)
      }
      setShowModal(false)
      load()
    } catch (e) {
      console.error('Failed to save machine:', e)
      const msg = e?.response?.data?.detail || e?.message || 'خطا در ذخیره‌سازی'
      setSubmitError(msg)
    }
  }

  async function handleDelete(m) {
    if (!confirm(`"${m.name}" حذف شود؟`)) return
    try {
      await deleteMachine(m.id)
      load()
    } catch (e) { console.error('Failed to delete machine:', e) }
  }

  async function toggleActive(m) {
    try {
      await updateMachine(m.id, { is_active: !m.is_active })
      load()
    } catch (e) { console.error('Failed to toggle active:', e) }
  }

  function calcHourlyCost(m) {
    const powerCost = (m.power_watts / 1000) * (settings.electricity_rate_per_kwh?.value || 812)
    const downtimeCost = m.purchase_price / m.life_hours
    const maintCost = downtimeCost * m.maintenance_pct
    return powerCost + downtimeCost + maintCost
  }

  const inputStyle = (fieldName) => getInputStyle(fieldName, touched, errors)

  if (loading) return <div className="p-8 text-center" style={{color:'var(--text-secondary)'}}>در حال بارگذاری...</div>
  if (error) return <div className="p-8 text-center" style={{color:'#ef4444'}}>{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{color:'var(--text-primary)'}}>ماشین‌های چاپ</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium" style={{background:'var(--accent)'}}>
          <Plus size={18} /> افزودن ماشین
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {machines.map(m => (
          <div key={m.id} className="rounded-xl p-5" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg" style={{color:'var(--text-primary)'}}>{m.name}</h3>
                <div className="flex items-center gap-1 mt-1" style={{color:'var(--text-secondary)'}}>
                  <Zap size={14} /> {m.power_watts} وات
                </div>
              </div>
              <button onClick={() => toggleActive(m)} className={`px-2 py-1 rounded text-xs font-medium ${m.is_active ? 'text-green-400' : 'text-red-400'}`} style={{background: m.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}}>
                {m.is_active ? 'فعال' : 'غیرفعال'}
              </button>
            </div>
            <div className="space-y-2 text-sm" style={{color:'var(--text-secondary)'}}>
              <div className="flex justify-between">
                <span>قیمت خرید:</span>
                <span style={{color:'var(--text-primary)'}}>{formatPrice(m.purchase_price)}</span>
              </div>
              <div className="flex justify-between">
                <span>عمر مفید:</span>
                <span style={{color:'var(--text-primary)'}}>{formatPrice(m.life_hours)} ساعت</span>
              </div>
              <div className="flex justify-between">
                <span>تعمیرات:</span>
                <span style={{color:'var(--text-primary)'}}>%{(m.maintenance_pct * 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t" style={{borderColor:'var(--border)'}}>
                <span className="font-semibold" style={{color:'var(--text-primary)'}}>هزینه ساعتی:</span>
                <span className="font-bold" style={{color:'var(--accent)'}}>{formatPrice(Math.round(calcHourlyCost(m)))}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => openEdit(m)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm" style={{background:'var(--bg-secondary)', color:'var(--accent)'}}>
                <Pencil size={14} /> ویرایش
              </button>
              <button onClick={() => handleDelete(m)} className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-sm" style={{background:'rgba(239,68,68,0.15)', color:'var(--danger)'}}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'ویرایش ماشین' : 'افزودن ماشین جدید'}>
        <div className="space-y-4">
          {submitError && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>نام ماشین *</label>
            <input value={form.name} onChange={e => handleFieldChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name', form.name)}
              className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('name')} />
            {touched.name && errors.name && <span style={ERROR_STYLE}>{errors.name}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>توان (وات) *</label>
              <input type="number" value={form.power_watts} onChange={e => handleFieldChange('power_watts', e.target.value)}
                onBlur={() => handleFieldBlur('power_watts', form.power_watts)}
                className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('power_watts')} />
              {touched.power_watts && errors.power_watts && <span style={ERROR_STYLE}>{errors.power_watts}</span>}
            </div>
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>قیمت خرید (تومان) *</label>
              <input type="number" value={form.purchase_price} onChange={e => handleFieldChange('purchase_price', e.target.value)}
                onBlur={() => handleFieldBlur('purchase_price', form.purchase_price)}
                className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('purchase_price')} />
              {touched.purchase_price && errors.purchase_price && <span style={ERROR_STYLE}>{errors.purchase_price}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>عمر مفید (ساعت)</label>
              <input type="number" value={form.life_hours} onChange={e => handleFieldChange('life_hours', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('life_hours')} />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>درصد تعمیرات</label>
              <input type="number" step="0.01" value={form.maintenance_pct} onChange={e => handleFieldChange('maintenance_pct', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('maintenance_pct')} />
            </div>
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
