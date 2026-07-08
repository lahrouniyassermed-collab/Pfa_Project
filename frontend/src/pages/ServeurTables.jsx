import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTables, toutesCommandes, changerStatutTable, envoyerCuisine } from '../services/api'

const STATUT_TABLE = {
  libre:    { label: 'Libre',    bg: 'bg-green-50 border-green-300',  text: 'text-green-700',  dot: 'bg-green-400'  },
  occupee:  { label: 'Occupée',  bg: 'bg-red-50 border-red-300',      text: 'text-red-700',    dot: 'bg-red-400'    },
  reservee: { label: 'Réservée', bg: 'bg-blue-50 border-blue-300',    text: 'text-blue-700',   dot: 'bg-blue-400'   },
}

const STATUT_CMD = {
  en_cours:       { label: 'En cours',        badge: 'bg-gray-100 text-gray-600'    },
  envoyee:        { label: 'En attente cuisine', badge: 'bg-blue-100 text-blue-700'  },
  en_preparation: { label: 'En préparation',  badge: 'bg-amber-100 text-amber-700'  },
  prete:          { label: 'Prête !',         badge: 'bg-green-100 text-green-700'  },
}

export default function ServeurTables() {
  const [tables, setTables]                 = useState([])
  const [commandesActives, setCommandesActives] = useState({})   // table_id → commande
  const [commandesList, setCommandesList]   = useState([])       // toutes commandes actives
  const [loading, setLoading]               = useState(true)
  const [selected, setSelected]             = useState(null)     // table sélectionnée pour action
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const [t, c] = await Promise.all([getTables(), toutesCommandes()])
    setTables(t.data)

    const map = {}
    const actives = []
    c.data.forEach(cmd => {
      if (cmd.statut === 'cloturee' || cmd.statut === 'annulee') return
      // Ignorer les commandes QR en_cours SAUF celles avec paiement espèces en attente
      if (cmd.statut === 'en_cours' && cmd.origine === 'qr_table' && !cmd.especes_en_attente) return
      map[cmd.table_id] = cmd
      actives.push(cmd)
    })
    setCommandesActives(map)
    setCommandesList(actives)
    setLoading(false)
  }, [])

  // Chargement initial + polling 8s
  useEffect(() => {
    load()
    const id = setInterval(load, 8000)
    return () => clearInterval(id)
  }, [load])

  function handleTableClick(table) {
    const cmdActive = commandesActives[table.id]
    // Si table libre ET aucune commande active → prendre une commande
    if (table.statut === 'libre' && !cmdActive) {
      navigate(`/serveur/commande?table_id=${table.id}&table_num=${table.numero}`)
    } else {
      // Table occupée/réservée, ou commande QR déjà active → ouvrir le panel
      setSelected(s => s?.id === table.id ? null : table)
    }
  }

  async function libererTable(tableId) {
    await changerStatutTable(tableId, 'libre')
    setSelected(null)
    load()
  }

  function goSuivi(cmd) {
    const tableNum = tables.find(t => t.id === cmd.table_id)?.numero ?? '?'
    navigate(`/serveur/commande?table_id=${cmd.table_id}&table_num=${tableNum}&commande_id=${cmd.id}`)
  }

  const emplacements = [...new Set(tables.map(t => t.emplacement))]
  const commandesEnCuisine = commandesList.filter(c => ['envoyee', 'en_preparation', 'prete'].includes(c.statut))
  const commandesEspecesEnAttente = commandesList.filter(c => c.especes_en_attente)

  function ouvrirEditionQR(cmd) {
    const tableNum = tables.find(t => t.id === cmd.table_id)?.numero ?? '?'
    navigate(`/serveur/commande?table_id=${cmd.table_id}&table_num=${tableNum}&commande_id=${cmd.id}&edit_qr=1`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Plan des tables</h1>
          <button onClick={load} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-500">
            Actualiser
          </button>
        </div>

        {/* ── SECTION : Commandes QR espèces à valider ── */}
        {commandesEspecesEnAttente.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block animate-pulse" />
              Paiement espèces — à envoyer en cuisine ({commandesEspecesEnAttente.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {commandesEspecesEnAttente.map(cmd => {
                const tableNum = tables.find(t => t.id === cmd.table_id)?.numero
                return (
                  <div key={cmd.id} className="bg-orange-50 border-2 border-orange-300 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        {cmd.code_unique ?? `CMD #${cmd.id}`}
                        {tableNum && <span className="font-normal text-gray-500">— Table {tableNum}</span>}
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">💵 Espèces</span>
                      </p>
                      <p className="text-xs text-orange-600 mt-0.5 font-medium">
                        {cmd.montant_total ? `${cmd.montant_total} Dh` : ''} — En attente de validation
                      </p>
                    </div>
                    <button
                      onClick={() => ouvrirEditionQR(cmd)}
                      className="ml-3 shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                    >
                      Modifier & envoyer →
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SECTION : Commandes en cuisine ── */}
        {commandesEnCuisine.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
              Commandes en cuisine ({commandesEnCuisine.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {commandesEnCuisine.map(cmd => {
                const cfg = STATUT_CMD[cmd.statut] ?? STATUT_CMD.envoyee
                const tableNum = tables.find(t => t.id === cmd.table_id)?.numero
                const isPrete = cmd.statut === 'prete'
                return (
                  <div
                    key={cmd.id}
                    onClick={() => goSuivi(cmd)}
                    className={`cursor-pointer bg-white rounded-xl border-2 px-4 py-3 flex items-center justify-between hover:shadow-md transition-all ${isPrete ? 'border-green-300' : 'border-gray-200'}`}
                  >
                    <div>
                      <p className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        {cmd.code_unique ?? `CMD #${cmd.id}`}
                        {tableNum && <span className="font-normal text-gray-500">— Table {tableNum}</span>}
                        {cmd.origine === 'qr_table' && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">QR</span>
                        )}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPrete && <span className="text-lg">🔔</span>}
                      <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                        Suivre →
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Légende */}
        <div className="flex gap-3 mb-4">
          {Object.entries(STATUT_TABLE).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-gray-500">{cfg.label}</span>
            </div>
          ))}
        </div>

        {/* ── Panel action table sélectionnée ── */}
        {selected && (
          <div className="mb-6 bg-white border-2 border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Table {selected.numero} — <span className="capitalize text-gray-500">{selected.statut}</span></p>
              <p className="text-xs text-gray-400 mt-0.5">{selected.capacite} pers. · {selected.emplacement}</p>
            </div>
            <div className="flex items-center gap-3">
              {selected.statut !== 'libre' && (
                <button
                  onClick={() => libererTable(selected.id)}
                  className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  ✓ Libérer la table
                </button>
              )}
              {commandesActives[selected.id] && (
                <button
                  onClick={() => goSuivi(commandesActives[selected.id])}
                  className="bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Voir commande →
                </button>
              )}
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">×</button>
            </div>
          </div>
        )}

        {/* ── SECTION : Plan des tables ── */}
        {loading ? (
          <p className="text-gray-400 text-sm">Chargement…</p>
        ) : (
          emplacements.map(emp => (
            <div key={emp} className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 capitalize">{emp}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tables.filter(t => t.emplacement === emp).map(table => {
                  const cfg = STATUT_TABLE[table.statut] ?? STATUT_TABLE.libre
                  const cmdActive = commandesActives[table.id]
                  const cmdStatut = cmdActive ? STATUT_CMD[cmdActive.statut] : null
                  const clickable = table.statut === 'libre' || !!cmdActive
                  const isPrete = cmdActive?.statut === 'prete'
                  return (
                    <div
                      key={table.id}
                      onClick={() => handleTableClick(table)}
                      className={`border-2 rounded-xl p-4 transition-all ${cfg.bg} cursor-pointer hover:shadow-md ${isPrete ? 'ring-2 ring-green-400' : ''} ${selected?.id === table.id ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-xl font-bold ${cfg.text}`}>T{table.numero}</p>
                        <div className="flex items-center gap-1">
                          {isPrete && <span className="text-sm">🔔</span>}
                          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{table.capacite} pers.</p>
                      {cmdActive && cmdStatut && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-block ${cmdStatut.badge}`}>
                            {cmdStatut.label}
                          </span>
                          {cmdActive.origine === 'qr_table' && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-medium">QR</span>
                          )}
                        </div>
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
