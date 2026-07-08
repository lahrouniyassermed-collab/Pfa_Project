import { useEffect, useState } from 'react'
import { getAvisAdmin, validerAvisClient, rejeterAvisClient } from '../services/api'

const SENTIMENT_CONFIG = {
  positif: { label: 'Positif', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  neutre:  { label: 'Neutre',  bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400'  },
  negatif: { label: 'Négatif', bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500'   },
}

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700' },
  valide:     { label: 'Validé',     bg: 'bg-green-100', text: 'text-green-700' },
  rejete:     { label: 'Rejeté',     bg: 'bg-red-100',   text: 'text-red-700'   },
}

function Etoiles({ note }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <svg key={n} className={`w-4 h-4 ${n <= note ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export default function GerantAvis() {
  const [avis, setAvis] = useState([])
  const [filtre, setFiltre] = useState('en_attente')
  const [loading, setLoading] = useState(true)

  async function charger() {
    try {
      const r = await getAvisAdmin()
      setAvis(r.data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { charger() }, [])

  async function valider(id) {
    await validerAvisClient(id)
    charger()
  }

  async function rejeter(id) {
    await rejeterAvisClient(id)
    charger()
  }

  const filtrés = avis.filter(a => filtre === 'tous' || a.statut === filtre)

  const counts = {
    tous: avis.length,
    en_attente: avis.filter(a => a.statut === 'en_attente').length,
    valide: avis.filter(a => a.statut === 'valide').length,
    rejete: avis.filter(a => a.statut === 'rejete').length,
  }

  // Statistiques sentiment sur les avis validés
  const validés = avis.filter(a => a.statut === 'valide')
  const stats = {
    positif: validés.filter(a => a.sentiment === 'positif').length,
    neutre:  validés.filter(a => a.sentiment === 'neutre').length,
    negatif: validés.filter(a => a.sentiment === 'negatif').length,
  }
  const noteMoyenne = validés.length
    ? (validés.reduce((s, a) => s + a.note, 0) / validés.length).toFixed(1)
    : '—'

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Avis clients</h1>
        <p className="text-gray-500 text-sm mt-1">Modérez les avis — l'IA analyse automatiquement le sentiment.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{noteMoyenne}</p>
          <p className="text-xs text-gray-500 mt-0.5">Note moyenne</p>
        </div>
        {Object.entries(SENTIMENT_CONFIG).map(([key, cfg]) => (
          <div key={key} className={`${cfg.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${cfg.text}`}>{stats[key]}</p>
            <p className={`text-xs mt-0.5 ${cfg.text}`}>Avis {cfg.label.toLowerCase()}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'en_attente', label: 'En attente' },
          { key: 'valide',     label: 'Validés'    },
          { key: 'rejete',     label: 'Rejetés'    },
          { key: 'tous',       label: 'Tous'        },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltre(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtre === key
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              filtre === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : filtrés.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          Aucun avis dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-3">
          {filtrés.map(a => {
            const sent = a.sentiment ? SENTIMENT_CONFIG[a.sentiment] : null
            const stat = STATUT_CONFIG[a.statut]
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">

                  {/* Gauche */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{a.nom}</span>
                      <Etoiles note={a.note} />
                      <span className="text-xs text-gray-400">
                        {new Date(a.date_depot).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>

                    {a.commentaire && (
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        "{a.commentaire}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Statut */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stat.bg} ${stat.text}`}>
                        {stat.label}
                      </span>

                      {/* Sentiment IA */}
                      {sent ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sent.bg} ${sent.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sent.dot}`} />
                          IA : {sent.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                          IA : non analysé
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {a.statut === 'en_attente' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => valider(a.id)}
                        className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => rejeter(a.id)}
                        className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
