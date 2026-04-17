import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import GerantLayout from '../components/shared/GerantLayout'
import { getDashboard } from '../services/api'

const SENTIMENT_COLORS = {
  positif: '#22c55e',
  neutre: '#f59e0b',
  negatif: '#ef4444',
}

export default function GerantDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const sentimentData = data
    ? Object.entries(data.sentiments).map(([name, value]) => ({ name, value }))
    : []

  return (
    <GerantLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Tableau de bord</h1>
        <p className="text-sm text-gray-400 mb-8">Vue d'ensemble du restaurant aujourd'hui</p>

        {loading ? (
          <div className="text-gray-400 text-sm">Chargement…</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <KpiCard
                label="CA aujourd'hui"
                value={`${data?.ca_aujourd_hui?.toFixed(2)} €`}
                color="text-green-600"
              />
              <KpiCard
                label="Avis en attente"
                value={data?.avis_en_attente ?? 0}
                color="text-amber-500"
                onClick={() => navigate('/gerant/tombola')}
                clickable
              />
              <KpiCard
                label="Propositions cuisinier"
                value={data?.propositions_cuisinier_en_attente ?? 0}
                color="text-blue-500"
                onClick={() => navigate('/gerant/menu')}
                clickable
              />
              <KpiCard
                label="Sentiments positifs"
                value={`${data?.sentiments?.positif ?? 0} avis`}
                color="text-emerald-500"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top plats */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-5">Top 5 plats commandés</h2>
                {data?.top_plats?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.top_plats} layout="vertical" margin={{ left: 10 }}>
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="nom" type="category" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="total_commandes" fill="#111827" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 mt-4">Aucune commande aujourd'hui.</p>
                )}
              </div>

              {/* Sentiments */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-5">Répartition des sentiments</h2>
                {sentimentData.some((s) => s.value > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {sentimentData.map((entry) => (
                          <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] ?? '#ccc'} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 mt-4">Aucun avis pour l'instant.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </GerantLayout>
  )
}

function KpiCard({ label, value, color, onClick, clickable }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 ${clickable ? 'cursor-pointer hover:border-gray-400 transition-colors' : ''}`}
      onClick={onClick}
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
