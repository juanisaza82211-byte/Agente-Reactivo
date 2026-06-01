import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000/api/agente'
})

const initialReading = {
  temperatura: 24,
  humedadSuelo: 58,
  luz: 62,
  humedadAmbiente: 70,
  hayMovimiento: false
}

const actions = [
  'Activar riego',
  'Encender ventilacion',
  'Encender calefaccion',
  'Encender luces',
  'Activar alarma',
  'Abrir sombreado'
]

function App() {
  const [reading, setReading] = useState(initialReading)
  const [decision, setDecision] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const statusTone = useMemo(() => {
    if (!decision) return 'border-slate-200 bg-white'
    if (decision.prioridad === 'Alta') return 'border-red-200 bg-red-50'
    if (decision.prioridad === 'Media') return 'border-amber-200 bg-amber-50'
    return 'border-emerald-200 bg-emerald-50'
  }, [decision])

  const loadData = async () => {
    const [historyResponse, statsResponse] = await Promise.all([
      api.get('/historial'),
      api.get('/estadisticas')
    ])
    setHistory(historyResponse.data)
    setStats(statsResponse.data)
  }

  useEffect(() => {
    loadData().catch(() => setError('No se pudo conectar con el backend. Inicia AgenteApi en http://localhost:5000.'))
  }, [])

  const evaluate = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/evaluar', reading)
      setDecision(response.data)
      await loadData()
    } catch {
      setError('No se pudo evaluar la lectura. Revisa que el backend este encendido.')
    } finally {
      setLoading(false)
    }
  }

  const simulate = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/simular')
      setDecision(response.data)
      setReading({
        temperatura: response.data.temperatura,
        humedadSuelo: response.data.humedadSuelo,
        luz: response.data.luz,
        humedadAmbiente: response.data.humedadAmbiente,
        hayMovimiento: response.data.hayMovimiento
      })
      await loadData()
    } catch {
      setError('No se pudo simular una lectura. Revisa que el backend este encendido.')
    } finally {
      setLoading(false)
    }
  }

  const updateNumber = (key, value) => {
    setReading((current) => ({ ...current, [key]: Number(value) }))
  }

  return (
    <main className="min-h-screen bg-skyglass text-slate-900">
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-lg border border-white/70 bg-white/85 p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-leaf">Agente reactivo simple</p>
          <h1 className="mt-2 text-3xl font-bold">Invernadero inteligente</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            El agente percibe temperatura, humedad, luz y movimiento. Reacciona con reglas directas y guarda cada decision con Entity Framework Core.
          </p>

          <div className="mt-6 space-y-4">
            <SensorSlider label="Temperatura" value={reading.temperatura} min="10" max="40" suffix="C" onChange={(value) => updateNumber('temperatura', value)} />
            <SensorSlider label="Humedad suelo" value={reading.humedadSuelo} min="0" max="100" suffix="%" onChange={(value) => updateNumber('humedadSuelo', value)} />
            <SensorSlider label="Luz" value={reading.luz} min="0" max="100" suffix="%" onChange={(value) => updateNumber('luz', value)} />
            <SensorSlider label="Humedad ambiente" value={reading.humedadAmbiente} min="0" max="100" suffix="%" onChange={(value) => updateNumber('humedadAmbiente', value)} />
          </div>

          <label className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium">
            Movimiento detectado
            <input
              type="checkbox"
              checked={reading.hayMovimiento}
              onChange={(event) => setReading((current) => ({ ...current, hayMovimiento: event.target.checked }))}
              className="h-5 w-5 accent-leaf"
            />
          </label>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={evaluate} disabled={loading} className="rounded-lg bg-leaf px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-60">
              Evaluar
            </button>
            <button onClick={simulate} disabled={loading} className="rounded-lg border border-leaf bg-white px-4 py-3 text-sm font-semibold text-leaf transition hover:bg-green-50 disabled:opacity-60">
              Simular
            </button>
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </aside>

        <section className="space-y-6">
          <div className={`rounded-lg border p-5 shadow-sm ${statusTone}`}>
            <p className="text-sm font-semibold text-slate-500">Decision actual</p>
            <h2 className="mt-2 text-2xl font-bold">{decision?.accion ?? 'Sin decision aun'}</h2>
            <p className="mt-2 text-slate-700">{decision?.motivo ?? 'Ajusta los sensores o ejecuta una simulacion para activar el agente.'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Prioridad" value={decision?.prioridad ?? '-'} />
              <Metric label="Decisiones" value={stats?.totalDecisiones ?? 0} />
              <Metric label="Ultima accion" value={stats?.ultimaDecision?.accion ?? '-'} />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <div className="rounded-lg border border-white/70 bg-white/90 p-5 shadow-sm">
              <h2 className="text-xl font-bold">Historial</h2>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-3">Accion</th>
                      <th className="px-3 py-3">Prioridad</th>
                      <th className="px-3 py-3">Sensores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {history.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-3 py-3 font-semibold">{item.accion}</td>
                        <td className="px-3 py-3">{item.prioridad}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {item.temperatura}C | suelo {item.humedadSuelo}% | luz {item.luz}%
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-slate-500" colSpan="3">Todavia no hay decisiones guardadas.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-white/70 bg-white/90 p-5 shadow-sm">
              <h2 className="text-xl font-bold">Acciones posibles</h2>
              <div className="mt-4 space-y-2">
                {actions.map((action) => (
                  <div key={action} className="rounded-lg border border-slate-200 px-3 py-3 text-sm font-medium">
                    {action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

function SensorSlider({ label, value, min, max, suffix, onChange }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm font-medium">
        {label}
        <span className="text-leaf">{value}{suffix}</span>
      </span>
      <input className="mt-2 w-full accent-leaf" type="range" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-white/80 bg-white/70 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}

export default App
