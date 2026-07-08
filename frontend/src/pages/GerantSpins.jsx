import { useEffect, useState } from 'react'
import { getGerantSpins, marquerGainUtilise } from '../services/api'

const INK   = '#1A1410'
const CREAM = '#F5F0E8'
const PAPER = '#FAF7F0'
const MUTED = '#8A7E76'
const GOLD  = '#B8963E'
const RED   = '#C8312A'
const mono  = "'Space Mono', monospace"
const serif = "'DM Serif Display', serif"

export default function GerantSpins() {
  const [spins, setSpins]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtre, setFiltre]   = useState('tous')

  useEffect(() => {
    getGerantSpins()
      .then(r => setSpins(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtres = ['tous', 'non_utilise', 'utilise']

  const affichés = spins.filter(s => {
    const matchSearch = !search || s.client_nom?.toLowerCase().includes(search.toLowerCase()) || s.prix_nom?.toLowerCase().includes(search.toLowerCase())
    const matchFiltre = filtre === 'tous' || s.statut === filtre
    return matchSearch && matchFiltre
  })

  const stats = {
    total: spins.length,
    disponibles: spins.filter(s => s.statut === 'non_utilise').length,
    utilisés: spins.filter(s => s.statut === 'utilise').length,
  }

  if (loading) return (
    <div style={{ padding: 40, fontFamily: mono, fontSize: 11, color: MUTED, letterSpacing: '0.1em' }}>CHARGEMENT…</div>
  )

  return (
    <div style={{ padding: '32px 40px', fontFamily: mono, background: PAPER, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: serif, fontSize: 28, color: INK, marginBottom: 4 }}>Historique des spins</div>
        <div style={{ fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>VÉRIFICATION ANTI-FRAUDE — TOUS LES GAINS CLIENTS</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total spins', value: stats.total, color: INK },
          { label: 'Prix disponibles', value: stats.disponibles, color: GOLD },
          { label: 'Prix utilisés', value: stats.utilisés, color: MUTED },
        ].map(s => (
          <div key={s.label} style={{ background: CREAM, borderRadius: 4, padding: '16px 20px', border: `1px solid rgba(26,20,16,0.08)` }}>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: serif, fontSize: 32, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher client ou prix…"
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: `1px solid rgba(26,20,16,0.18)`, borderRadius: 3, fontFamily: mono, fontSize: 11, color: INK, background: CREAM, outline: 'none' }}
        />
        {filtres.map(f => (
          <button key={f} onClick={() => setFiltre(f)} style={{
            padding: '8px 14px', borderRadius: 3, cursor: 'pointer', fontFamily: mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: filtre === f ? INK : CREAM,
            color: filtre === f ? CREAM : MUTED,
            border: `1px solid ${filtre === f ? INK : 'rgba(26,20,16,0.15)'}`,
          }}>
            {f === 'tous' ? 'Tous' : f === 'non_utilise' ? 'Disponibles' : 'Utilisés'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: CREAM, borderRadius: 4, border: `1px solid rgba(26,20,16,0.1)`, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1.5fr 1fr', padding: '10px 20px', background: INK }}>
          {['Client', 'Prix gagné', 'Date', 'Statut', 'Points avant → après', 'Action'].map(h => (
            <div key={h} style={{ fontSize: 9, color: 'rgba(245,240,232,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {affichés.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: MUTED, fontSize: 11 }}>Aucun spin trouvé</div>
        ) : affichés.map((s, i) => (
          <div key={s.id} style={{
            display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1.5fr 1fr',
            padding: '12px 20px', alignItems: 'center',
            borderBottom: i < affichés.length - 1 ? `1px solid rgba(26,20,16,0.06)` : 'none',
            background: i % 2 === 0 ? CREAM : 'rgba(26,20,16,0.02)',
          }}>
            <div style={{ fontSize: 12, color: INK, fontWeight: 700 }}>{s.client_nom}</div>
            <div style={{ fontSize: 11, color: INK }}>{s.prix_nom}</div>
            <div style={{ fontSize: 10, color: MUTED }}>
              {s.date ? new Date(s.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
            <div>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 2,
                background: s.statut === 'utilise' ? 'rgba(26,20,16,0.08)' : 'rgba(184,150,62,0.15)',
                color: s.statut === 'utilise' ? MUTED : GOLD,
                border: `1px solid ${s.statut === 'utilise' ? 'rgba(26,20,16,0.12)' : 'rgba(184,150,62,0.3)'}`,
              }}>
                {s.statut === 'utilise' ? 'UTILISÉ' : 'DISPO'}
              </span>
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>
              <span style={{ color: INK }}>{s.points_avant ?? '—'}</span>
              {' → '}
              <span style={{ color: (s.points_apres ?? 0) > (s.points_avant ?? 0) ? GOLD : RED }}>
                {s.points_apres ?? '—'}
              </span>
              {' pts'}
            </div>
            <div>
              {s.statut === 'non_utilise' && (
                <button onClick={async () => {
                  try {
                    await marquerGainUtilise(s.id)
                    setSpins(prev => prev.map(x => x.id === s.id ? { ...x, statut: 'utilise' } : x))
                  } catch { /* silent */ }
                }} style={{
                  padding: '4px 10px', borderRadius: 2, cursor: 'pointer', fontFamily: mono, fontSize: 9,
                  letterSpacing: '0.06em', textTransform: 'uppercase', border: `1px solid ${INK}`,
                  background: 'none', color: INK,
                }}>✓ Encaissé</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 9, color: MUTED, textAlign: 'right', letterSpacing: '0.06em' }}>
        {affichés.length} résultat{affichés.length !== 1 ? 's' : ''} affiché{affichés.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
