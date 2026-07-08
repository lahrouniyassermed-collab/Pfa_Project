import { useEffect, useState } from 'react'
import { getRevenues } from '../services/api'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
function labelMois(key) {
  const [y, m] = key.split('-')
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${y}`
}

const MODE_COLORS = { carte: '#f59e0b', especes: '#10b981', google_pay: '#3b82f6', apple_pay: '#8b5cf6', en_ligne: '#ec4899' }
const MODE_LABELS = { carte: 'Carte', especes: 'Espèces', google_pay: 'Google Pay', apple_pay: 'Apple Pay', en_ligne: 'En ligne' }

function KPI({ label, value, sub, badge }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        {badge && <span className="text-lg">{badge}</span>}
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

const TT = {
  contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12, color: '#111827', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  itemStyle: { color: '#f59e0b' },
  labelStyle: { color: '#6b7280', marginBottom: 4, fontWeight: 600 },
}

export default function GerantRevenues() {
  const [data,    setData]    = useState(null)
  const [annee,   setAnnee]   = useState(null)
  const [loading, setLoading] = useState(true)

  async function load(a) {
    setLoading(true)
    try {
      const r = await getRevenues(a)
      setData(r.data)
      if (!annee && r.data.annees_disponibles?.length) setAnnee(r.data.annees_disponibles[0])
    } finally { setLoading(false) }
  }

  useEffect(() => { load(null) }, [])

  const mensuel = (data?.ca_mensuel || []).map(d => ({ ...d, label: labelMois(d.mois) }))
  const pieData = Object.entries(data?.ca_by_mode || {}).map(([k, v]) => ({
    name: MODE_LABELS[k] || k, value: v, color: MODE_COLORS[k] || '#9ca3af',
  }))

  return (
    <div className="p-8 min-h-screen bg-gray-50">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenus</h1>
          <p className="text-sm text-gray-400 mt-0.5">Historique complet du chiffre d'affaires</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setAnnee(null); load(null) }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${!annee ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            Tout
          </button>
          {(data?.annees_disponibles || []).map(a => (
            <button key={a} onClick={() => { setAnnee(a); load(a) }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${annee === a ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-t-gray-900 border-gray-200 animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-center py-24 text-gray-400">Aucune donnée disponible.</p>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPI label="CA total"
              value={`${data.total_ca.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Dh`}
              sub={annee ? `Année ${annee}` : 'Toute période'} badge="💰" />
            <KPI label="Commandes"
              value={data.nb_commandes.toLocaleString('fr-FR')}
              sub="paiements validés" badge="📋" />
            <KPI label="Ticket moyen"
              value={`${data.ticket_moyen.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Dh`}
              sub="par commande" badge="🎯" />
            <KPI label="Meilleur mois"
              value={data.meilleur_mois ? `${data.meilleur_mois.ca.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Dh` : '—'}
              sub={data.meilleur_mois ? labelMois(data.meilleur_mois.mois) : ''} badge="🏆" />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-5 mb-6">

            {/* Bar chart */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="font-semibold text-gray-900 mb-0.5">CA mensuel</p>
              <p className="text-xs text-gray-400 mb-5">{annee ? `Année ${annee}` : '12 derniers mois'} — en Dh</p>
              {mensuel.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Aucune donnée</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={mensuel} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} formatter={v => [`${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Dh`, 'CA']} />
                    <Bar dataKey="ca" fill="#111827" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie chart */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="font-semibold text-gray-900 mb-0.5">Modes de paiement</p>
              <p className="text-xs text-gray-400 mb-4">Répartition du CA</p>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Aucune donnée</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68}
                           dataKey="value" paddingAngle={3}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                      </Pie>
                      <Tooltip {...TT} formatter={v => [`${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Dh`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 mt-3">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-gray-500">{d.name}</span>
                        </div>
                        <span className="font-semibold text-gray-800">
                          {d.value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Dh
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Line chart tendance */}
          {mensuel.length > 1 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
              <p className="font-semibold text-gray-900 mb-0.5">Tendance</p>
              <p className="text-xs text-gray-400 mb-5">Évolution mois par mois — en Dh</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={mensuel} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} formatter={v => [`${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Dh`, 'CA']} />
                  <Line type="monotone" dataKey="ca" stroke="#111827" strokeWidth={2.5}
                        dot={{ fill: '#111827', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tableau détaillé */}
          {mensuel.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="font-semibold text-gray-900">Détail mensuel</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Mois', 'CA (Dh)', '% du total', 'Rang'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...mensuel].reverse().map((row) => {
                      const pct = data.total_ca > 0 ? (row.ca / data.total_ca * 100).toFixed(1) : 0
                      const isBest = data.meilleur_mois?.mois === row.mois
                      const rang = [...mensuel].sort((a, b) => b.ca - a.ca).findIndex(r => r.mois === row.mois) + 1
                      return (
                        <tr key={row.mois} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isBest ? 'bg-amber-50' : ''}`}>
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {row.label}
                            {isBest && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Meilleur</span>}
                          </td>
                          <td className="px-6 py-3 font-bold text-gray-900">
                            {row.ca.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-gray-100">
                                <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-gray-400">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-400">#{rang}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mensuel.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center py-16 shadow-sm">
              <p className="text-4xl mb-4">📊</p>
              <p className="font-semibold text-gray-900">Aucune donnée de paiement</p>
              <p className="text-sm text-gray-400 mt-1">Les revenus apparaîtront ici dès que des paiements seront validés.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
