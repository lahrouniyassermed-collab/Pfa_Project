import { useEffect, useState } from 'react'
import GerantLayout from '../components/shared/GerantLayout'
import { getTables, creerTable, changerStatutTable } from '../services/api'
import api from '../services/api'

const STATUT_COLORS = {
  libre: 'bg-green-100 text-green-700 border-green-200',
  occupee: 'bg-red-100 text-red-700 border-red-200',
  reservee: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function GerantTables() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ numero: '', capacite: '', emplacement: 'interieur' })
  const [qrModal, setQrModal] = useState(null)

  async function load() {
    setLoading(true)
    const res = await getTables()
    setTables(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    await creerTable({ numero: parseInt(form.numero), capacite: parseInt(form.capacite), emplacement: form.emplacement })
    setShowForm(false)
    setForm({ numero: '', capacite: '', emplacement: 'interieur' })
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette table ?')) return
    await api.delete(`/api/tables/${id}`)
    load()
  }

  async function handleStatut(id, statut) {
    await changerStatutTable(id, statut)
    load()
  }

  return (
    <GerantLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <button onClick={() => setShowForm(true)} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700">
            + Nouvelle table
          </button>
        </div>

        {/* Légende */}
        <div className="flex gap-3 mb-6">
          {Object.entries(STATUT_COLORS).map(([s, cls]) => (
            <span key={s} className={`text-xs px-3 py-1 rounded-full border font-medium capitalize ${cls}`}>{s}</span>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Chargement…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {tables.map((t) => (
              <div key={t.id} className={`bg-white border-2 rounded-xl p-4 ${STATUT_COLORS[t.statut] ?? 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-gray-900 text-lg">T{t.numero}</p>
                  <span className="text-xs text-gray-500">{t.capacite} pers.</span>
                </div>
                <p className="text-xs text-gray-400 capitalize mb-3">{t.emplacement}</p>

                {/* Changer statut */}
                <select
                  value={t.statut}
                  onChange={(e) => handleStatut(t.id, e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-2 bg-white focus:outline-none"
                >
                  <option value="libre">Libre</option>
                  <option value="occupee">Occupée</option>
                  <option value="reservee">Réservée</option>
                </select>

                <div className="flex gap-1">
                  {t.qr_code_url && (
                    <button
                      onClick={() => setQrModal(t)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg py-1 hover:bg-gray-50"
                    >
                      QR
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="flex-1 text-xs border border-red-100 text-red-500 rounded-lg py-1 hover:bg-red-50"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            ))}
            {tables.length === 0 && (
              <p className="col-span-5 text-sm text-gray-400">Aucune table. Créez-en une !</p>
            )}
          </div>
        )}
      </div>

      {/* Modal créer table */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Nouvelle table</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Numéro</label>
              <input required type="number" value={form.numero} onChange={(e) => setForm(f => ({ ...f, numero: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Capacité</label>
              <input required type="number" value={form.capacite} onChange={(e) => setForm(f => ({ ...f, capacite: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Emplacement</label>
              <select value={form.emplacement} onChange={(e) => setForm(f => ({ ...f, emplacement: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="interieur">Intérieur</option>
                <option value="terrasse">Terrasse</option>
                <option value="mezzanine">Mezzanine</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button type="submit" className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm hover:bg-gray-700">Créer</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal QR code */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-gray-900 mb-4">QR Code — Table {qrModal.numero}</p>
            <img src={qrModal.qr_code_url} alt="QR Code" className="w-48 h-48 mx-auto" />
            <button onClick={() => setQrModal(null)} className="mt-4 text-sm text-gray-500 hover:text-gray-700">Fermer</button>
          </div>
        </div>
      )}
    </GerantLayout>
  )
}
