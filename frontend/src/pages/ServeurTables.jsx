import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getTables, toutesCommandes } from '../services/api'

const STATUT_CONFIG = {
  libre: { label: 'Libre', bg: 'bg-green-50 border-green-300', text: 'text-green-700', dot: 'bg-green-400' },
  occupee: { label: 'Occupée', bg: 'bg-red-50 border-red-300', text: 'text-red-700', dot: 'bg-red-400' },
  reservee: { label: 'Réservée', bg: 'bg-blue-50 border-blue-300', text: 'text-blue-700', dot: 'bg-blue-400' },
}

export default function ServeurTables() {
  const [tables, setTables] = useState([])
  const [commandesActives, setCommandesActives] = useState({})
  const [loading, setLoading] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function load() {
    const [t, c] = await Promise.all([getTables(), toutesCommandes()])
    setTables(t.data)
    // Map table_id → commande active
    const map = {}
    c.data.forEach((cmd) => {
      if (cmd.statut !== 'cloturee') map[cmd.table_id] = cmd
    })
    setCommandesActives(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleTableClick(table) {
    if (table.statut === 'libre') {
      navigate(`/serveur/commande?table_id=${table.id}&table_num=${table.numero}`)
    } else if (commandesActives[table.id]) {
      navigate(`/serveur/commande?table_id=${table.id}&table_num=${table.numero}&commande_id=${commandesActives[table.id].id}`)
    }
  }

  const emplacements = [...new Set(tables.map((t) => t.emplacement))]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-gray-900">MangerManger</p>
          <p className="text-xs text-gray-400">Espace serveur</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.prenom} {user?.nom}</span>
          <button onClick={() => { logout(); navigate('/login') }} className="text-xs text-red-500 hover:text-red-700">
            Déconnexion
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Plan des tables</h1>
          <button onClick={load} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-500">
            Actualiser
          </button>
        </div>

        {/* Légende */}
        <div className="flex gap-3 mb-6">
          {Object.entries(STATUT_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-gray-500">{cfg.label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Chargement…</p>
        ) : (
          emplacements.map((emp) => (
            <div key={emp} className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 capitalize">{emp}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tables.filter((t) => t.emplacement === emp).map((table) => {
                  const cfg = STATUT_CONFIG[table.statut] ?? STATUT_CONFIG.libre
                  const cmdActive = commandesActives[table.id]
                  const clickable = table.statut === 'libre' || !!cmdActive
                  return (
                    <div
                      key={table.id}
                      onClick={() => clickable && handleTableClick(table)}
                      className={`border-2 rounded-xl p-4 transition-all ${cfg.bg} ${clickable ? 'cursor-pointer hover:shadow-md' : 'opacity-60 cursor-default'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-xl font-bold ${cfg.text}`}>T{table.numero}</p>
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      </div>
                      <p className="text-xs text-gray-500">{table.capacite} pers.</p>
                      {cmdActive && (
                        <p className="text-xs font-medium text-gray-700 mt-1.5 truncate">
                          {cmdActive.code ?? `CMD #${cmdActive.id}`}
                        </p>
                      )}
                      {table.statut === 'libre' && (
                        <p className="text-xs text-green-600 mt-1.5">Appuyer pour commander</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
