import { useState, useEffect } from 'react'
import { Calculator as CalcIcon, Save, RotateCcw } from 'lucide-react'
import { getMaterials, getMachines, calculate } from '../lib/api'
import CostBreakdown from '../components/CostBreakdown'
import { formatPrice, ERROR_STYLE, getInputStyle, DEBOUNCE_DELAY_CALC } from '../lib/constants'
import { validateField } from '../lib/validation'

function validateCalcField(name, value) {
  return validateField('calculate', name, value)
}

export default function Calculator() {
  const [materials, setMaterials] = useState([])
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitError, setSubmitError] = useState(null)

  const [form, setForm] = useState({
    material_id: '',
    machine_id: '',
    weight_g: '',
    support_g: '0',
    flushed_g: '0',
    print_time_minutes: '',
    post_pro_hours: '0',
    extras_cost: '0',
  })

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getMaterials({ signal: controller.signal }), getMachines({ signal: controller.signal })])
      .then(([mRes, mcRes]) => {
        setMaterials(mRes.data)
        setMachines(mcRes.data)
        if (mRes.data.length > 0) setForm(f => ({...f, material_id: mRes.data[0].id}))
        if (mcRes.data.length > 0) setForm(f => ({...f, machine_id: mcRes.data[0].id}))
        setError(null)
      })
      .catch((err) => {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.error('Failed to load calculator data:', err)
          setError('خطا در بارگذاری اطلاعات ماشین حساب')
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!form.material_id || !form.machine_id || !form.print_time_minutes) {
      setResult(null)
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await calculate({
          material_id: parseInt(form.material_id),
          machine_id: parseInt(form.machine_id),
          weight_g: parseFloat(form.weight_g) || 0,
          support_g: parseFloat(form.support_g) || 0,
          flushed_g: parseFloat(form.flushed_g) || 0,
          print_time_hours: (parseFloat(form.print_time_minutes) || 0) / 60,
          post_pro_hours: parseFloat(form.post_pro_hours) || 0,
          extras_cost: parseFloat(form.extras_cost) || 0,
        })
        setResult(res.data)
      } catch (e) { console.error(e) }
    }, DEBOUNCE_DELAY_CALC)
    return () => clearTimeout(timeout)
  }, [form])

  function handleChange(name, value) {
    setForm(f => ({ ...f, [name]: value }))
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateCalcField(name, value) }))
    }
  }

  function handleBlur(name, value) {
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validateCalcField(name, value) }))
  }

  function handleReset() {
    setForm({
      material_id: materials[0]?.id || '',
      machine_id: machines[0]?.id || '',
      weight_g: '',
      support_g: '0',
      flushed_g: '0',
      print_time_minutes: '',
      post_pro_hours: '0',
      extras_cost: '0',
    })
    setResult(null)
    setErrors({})
    setTouched({})
    setSubmitError(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)

    const requiredFields = ['material_id', 'machine_id', 'weight_g', 'print_time_minutes']
    const formErrors = {}
    const allTouched = {}
    for (const field of requiredFields) {
      allTouched[field] = true
      const err = validateCalcField(field, form[field])
      if (err) formErrors[field] = err
    }
    setTouched(allTouched)
    setErrors(formErrors)

    if (Object.keys(formErrors).length > 0) {
      setSubmitError('لطفاً فیلدهای الزامی را پر کنید')
      return
    }

    // The real-time calculation already runs, so just confirm
  }

  const inputStyle = (fieldName) => getInputStyle(fieldName, touched, errors)

  if (loading) return <div className="p-8 text-center" style={{color:'var(--text-secondary)'}}>در حال بارگذاری...</div>
  if (error) return <div className="p-8 text-center" style={{color:'#ef4444'}}>{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalcIcon size={28} style={{color:'var(--accent)'}} />
          <h1 className="text-2xl font-bold" style={{color:'var(--text-primary)'}}>ماشین حساب قیمت</h1>
        </div>
        <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-secondary)'}}>
          <RotateCcw size={16} /> شروع مجدد
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="rounded-xl p-6 space-y-5" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
          <h2 className="font-semibold text-lg" style={{color:'var(--text-primary)'}}>اطلاعات محصول</h2>

          {submitError && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>ماده اولیه *</label>
              <select value={form.material_id} onChange={e => handleChange('material_id', e.target.value)}
                onBlur={() => handleBlur('material_id', form.material_id)}
                className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('material_id')}>
                <option value="">انتخاب کنید</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} - {m.color}</option>)}
              </select>
              {touched.material_id && errors.material_id && <span style={ERROR_STYLE}>{errors.material_id}</span>}
            </div>
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>ماشین *</label>
              <select value={form.machine_id} onChange={e => handleChange('machine_id', e.target.value)}
                onBlur={() => handleBlur('machine_id', form.machine_id)}
                className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('machine_id')}>
                <option value="">انتخاب کنید</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {touched.machine_id && errors.machine_id && <span style={ERROR_STYLE}>{errors.machine_id}</span>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>وزن (گرم) *</label>
              <input type="number" value={form.weight_g} onChange={e => handleChange('weight_g', e.target.value)}
                onBlur={() => handleBlur('weight_g', form.weight_g)}
                placeholder="0" className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('weight_g')} />
              {touched.weight_g && errors.weight_g && <span style={ERROR_STYLE}>{errors.weight_g}</span>}
            </div>
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>سازه (گرم)</label>
              <input type="number" value={form.support_g} onChange={e => handleChange('support_g', e.target.value)}
                placeholder="0" className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('support_g')} />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>فلش (گرم)</label>
              <input type="number" value={form.flushed_g} onChange={e => handleChange('flushed_g', e.target.value)}
                placeholder="0" className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('flushed_g')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>زمان چاپ (دقیقه) *</label>
              <input type="number" value={form.print_time_minutes} onChange={e => handleChange('print_time_minutes', e.target.value)}
                onBlur={() => handleBlur('print_time_minutes', form.print_time_minutes)}
                placeholder="0" className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('print_time_minutes')} />
              {touched.print_time_minutes && errors.print_time_minutes && <span style={ERROR_STYLE}>{errors.print_time_minutes}</span>}
            </div>
            <div>
              <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>پس‌پردازش (ساعت)</label>
              <input type="number" value={form.post_pro_hours} onChange={e => handleChange('post_pro_hours', e.target.value)}
                placeholder="0" className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('post_pro_hours')} />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{color:'var(--text-secondary)'}}>هزینه اضافی (تومان)</label>
            <input type="number" value={form.extras_cost} onChange={e => handleChange('extras_cost', e.target.value)}
              placeholder="0" className="w-full px-3 py-2 rounded-lg border outline-none" style={inputStyle('extras_cost')} />
          </div>

          <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium" style={{background:'var(--accent)'}}>
            <Save size={16} /> محاسبه قیمت
          </button>
        </form>

        {/* Result */}
        <div>
          {result ? (
            <div className="rounded-xl p-6" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
              <h2 className="font-semibold text-lg mb-4" style={{color:'var(--text-primary)'}}>نتیجه محاسبه</h2>
              <CostBreakdown result={result} />

              <div className="mt-6 p-4 rounded-xl text-center" style={{background:'var(--accent)', opacity:0.9}}>
                <p className="text-sm mb-1" style={{color:'rgba(255,255,255,0.8)'}}>قیمت پیشنهادی</p>
                <p className="text-3xl font-bold text-white">{formatPrice(result.suggested_price)} <span className="text-lg font-normal">تومان</span></p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-12 text-center" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
              <CalcIcon size={64} className="mx-auto mb-4" style={{color:'var(--border)'}} />
              <p style={{color:'var(--text-secondary)'}}>اطلاعات را وارد کنید تا قیمت محاسبه شود</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
