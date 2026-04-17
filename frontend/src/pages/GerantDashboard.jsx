import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const SENTIMENT_COLORS = { positif: '#22c55e', neutre: '#94a3b8', negatif: '#ef4444' }

function StatCard({ label, value, sub, color = 'text-gray-900', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 p-5 shadow-sm ${onClick ? 'cursor-pointer hover:border-amber-300 transition-colors' : ''}`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function GerantDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const sentimentData = data
    ? [
        { name: 'Positif', value: data.sentiments.positif },
        { name: 'Neutre',  value: data.sentiments.neutre },
        { name: 'Négatif', value: data.sentiments.negatif },
      ].filter(s => s.value > 0)
    : []

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Tableau de bord</h2>
      <p className="text-gray-500 text-sm mb-8">
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="CA aujourd'hui"
          value={`${data?.ca_aujourd_hui?.toFixed(2) ?? '0.00'} €`}
          sub="commandes clôturées"
          color="text-amber-600"
        />
        <StatCard
          label="Commandes actives"
          value={data?.commandes_actives ?? 0}
          sub="en cours / cuisine"
          color={data?.commandes_actives > 0 ? 'text-blue-600' : 'text-gray-900'}
        />
        <StatCard
          label="Tables libres"
          value={data?.tables_libres ?? 0}
          sub={`${data?.tables_occupees ?? 0} occupées · ${data?.tables_reservees ?? 0} réservées`}
          color="text-green-600"
          onClick={() => navigate('/gerant/tables')}
        />
        <StatCard
          label="Alertes stock"
          value={data?.ingredients_alerte ?? 0}
          sub="ingrédients sous seuil"
          color={data?.ingredients_alerte > 0 ? 'text-red-600' : 'text-gray-900'}
          onClick={() => navigate('/gerant/stocks')}
        />
      </div>

      {/* Notifications */}
      {(data?.propositions_cuisinier_en_attente > 0 || data?.avis_en_attente > 0) && (
        <div className="flex flex-wrap gap-3 mb-8">
          {data.propositions_cuisinier_en_attente > 0 && (
            <button
              onClick={() => navigate('/gerant/menu')}
              className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2.5 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <span className="w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {data.propositions_cuisinier_en_attente}
              </span>
              proposition{data.propositions_cuisinier_en_attente > 1 ? 's' : ''} cuisinier en attente
            </button>
          )}
          {data.avis_en_attente > 0 && (
            <button
              onClick={() => navigate('/gerant/tombola')}
              className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 text-sm px-4 py-2.5 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <span className="w-5 h-5 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {data.avis_en_attente}
              </span>
              participation{data.avis_en_attente > 1 ? 's' : ''} tombola à valider
            </button>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top plats */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top 5 plats</h3>
          {data?.top_plats?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_plats} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="nom" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} cmd`, '']} />
                <Bar dataKey="total_commandes" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Aucune commande clôturée
            </div>
          )}
        </div>

        {/* Sentiments */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Sentiments tombola</h3>
          {sentimentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {sentimentData.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name.toLowerCase()]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Aucun avis enregistré
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
