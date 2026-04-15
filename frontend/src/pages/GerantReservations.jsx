import { useEffect, useState } from 'react'
import { getReservations, confirmerReservation, annulerReservation, verifierCodeAcces } from '../services/api'

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  confirmee:  { label: 'Confirmée',  color: 'bg-green-100 text-green-700' },
  annulee:    { label: 'Annulée',    color: 'bg-gray-100 text-gray-500' },
}

function Toast({ msg, type }) {
  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {msg}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function GerantReservations() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('tous')
  const [codeInput, setCodeInput] = useState('')
  const [codeResult, setCodeResult] = useState(null)
  const [codeError, setCodeError] = useState('')
  const [detailModal, setDetailModal] = useState(null)

  const notify = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    try { const r = await getReservations(); setReservations(r.data) }
    catch { notify('Erreur chargement', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function confirmer(id) {
    try {
      const r = await confirmerReservation(id)
      notify(r.data.code_acces ? `Confirmée · Code : ${r.data.code_acces}` : 'Réservation confirmée')
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function annuler(id) {
    try {
      await annulerReservation(id)
      notify('Réservation annulée')
      load()
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function verifierCode() {
    if (!codeInput.trim()) return
    setCodeError('')
    setCodeResult(null)
    try {
      const r = await verifierCodeAcces(codeInput.trim().toUpperCase())
      setCodeResult(r.data)
    } catch (e) {
      setCodeError(e.response?.data?.detail || 'Code invalide')
    }
  }

  const filtered = filter === 'tous' ? reservations : reservations.filter(r => r.statut === filter)

  const fmt = (dt) => dt ? new Date(dt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Réservations</h2>

      {/* Vérification code local privé */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-purple-100 text-purple-600 rounded-lg p-2 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Accès au local privé</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Quand un client réserve le <strong>local privé</strong> et paie en ligne, il reçoit un code unique (ex: LOCAL-2026-A3F7).
              Entrez ce code ici pour vérifier son identité avant de lui ouvrir la salle.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            value={codeInput}
            onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeResult(null); setCodeError('') }}
            placeholder="LOCAL-2026-XXXX"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button onClick={verifierCode} className="bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            Vérifier le code
          </button>
        </div>
        {codeError && (
          <p className="text-red-500 text-sm mt-2 bg-red-50 px-3 py-2 rounded-lg">
            ✗ {codeError}
          </p>
        )}
        {codeResult && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold text-sm">✓ Code valide — accès autorisé</p>
            <p className="text-green-700 text-sm mt-1">Client : <strong>{codeResult.client}</strong></p>
            <p className="text-green-600 text-sm">{codeResult.nb_personnes} personnes · {fmt(codeResult.date)}</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[['tous', 'Toutes'], ['en_attente', 'En attente'], ['confirmee', 'Confirmées'], ['annulee', 'Annulées']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
            {v === 'en_attente' && reservations.filter(r => r.statut === 'en_attente').length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {reservations.filter(r => r.statut === 'en_attente').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Client', 'Date & heure', 'Pers.', 'Type', 'Statut', 'Code accès', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const sc = STATUT_CONFIG[r.statut] || STATUT_CONFIG.en_attente
              return (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{r.nom_client}</p>
                    <p className="text-xs text-gray-400">{r.telephone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{fmt(r.date_heure)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">{r.nb_personnes}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.type === 'local_prive' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.type === 'local_prive' ? 'Local privé' : 'Standard'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{r.code_acces || '—'}</td>
                  <td className="px-4 py-3">
                    {r.statut === 'en_attente' && (
                      <div className="flex gap-2">
                        <button onClick={() => confirmer(r.id)} className="text-xs font-medium text-green-600 hover:text-green-800">Confirmer</button>
                        <button onClick={() => annuler(r.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Annuler</button>
                      </div>
                    )}
                    {r.statut === 'confirmee' && (
                      <button onClick={() => annuler(r.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Annuler</button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-12 text-sm">Aucune réservation</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <Toast {...toast} />}
    </div>
  )
}
