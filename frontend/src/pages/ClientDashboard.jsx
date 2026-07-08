import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClientDashboard, getClientSpins, claimGoogleBonus } from '../services/api'
import { useAuth } from '../hooks/useAuth'

const INK   = '#1A1410'
const CREAM = '#F5F0E8'
const PAPER = '#FAF7F0'
const MUTED = '#8A7E76'
const RED   = '#C8312A'
const GOLD  = '#B8963E'
const serif = "'DM Serif Display', serif"
const mono  = "'Space Mono', monospace"
const bebas = "'Bebas Neue', sans-serif"

const MAX_PTS = 2000

function Barcode({ width = 90, height = 22 }) {
  const bars = []
  for (let i = 0; i < 36; i++) {
    const w = [1, 2, 3][i % 3]
    bars.push({ x: bars.reduce((s, b) => s + b.w + 1, 0), w })
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height}
          fill={INK} opacity={i % 7 === 0 ? 0.25 : 0.85} />
      ))}
    </svg>
  )
}

function PerfoRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '0 -20px', overflow: 'hidden' }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
      <div style={{ flex: 1, borderTop: `2px dashed rgba(26,20,16,0.18)` }} />
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
    </div>
  )
}

function ActionCard({ label, sub, emoji, onClick, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      background: CREAM, border: `1px solid rgba(26,20,16,0.12)`,
      borderRadius: 4, padding: '14px 8px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      transition: 'transform 120ms', flex: 1,
      boxShadow: '0 2px 6px rgba(26,20,16,0.06)',
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span style={{ fontFamily: mono, fontSize: 9, color: INK, letterSpacing: '0.05em', textAlign: 'center', lineHeight: 1.4 }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.04em' }}>{sub}</span>
    </button>
  )
}

const STEPS = [
  { n: '01', title: 'Ouvrir Google Maps', desc: 'Sur votre téléphone ou navigateur, ouvrez Google Maps.' },
  { n: '02', title: 'Rechercher "SKY07"', desc: 'Tapez exactement "SKY07" dans la barre de recherche et sélectionnez le restaurant.' },
  { n: '03', title: 'Cliquer sur "Donner un avis"', desc: 'Faites défiler vers le bas et cliquez sur "Donner un avis" ou l\'icône étoile.' },
  { n: '04', title: '5 étoiles + commentaire', desc: 'Sélectionnez 5 étoiles et rédigez un commentaire positif sur votre expérience.' },
  { n: '05', title: 'Votre nom doit apparaître', desc: 'Votre prénom et nom Google doivent correspondre à votre compte ici. Sinon l\'IA rejettera la capture.' },
  { n: '06', title: 'Prendre la capture d\'écran', desc: 'Faites une capture qui montre clairement : le nom SKY07, vos étoiles, votre commentaire et votre nom.' },
  { n: '07', title: 'Soumettre ci-dessous', desc: 'Choisissez votre fichier et cliquez "Envoyer". L\'IA valide automatiquement en quelques secondes.' },
]

function GoogleAvisSection({ prenom, nom, avisStatut, avisDate, onSuccess }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef()

  function handleFile(f) {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError('')
  }

  async function handleSubmit() {
    if (!file) { setError('Choisissez une capture d\'écran.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await claimGoogleBonus(file)
      setResult(res.data)
      if (res.data?.points_gagnes > 0 && onSuccess) onSuccess(res.data.points_gagnes)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Erreur lors de l\'analyse. Réessayez.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Title */}
      <div>
        <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Gagner des points</div>
        <div style={{ fontFamily: serif, fontSize: 20, color: INK }}>Avis Google Maps</div>
        <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 4, lineHeight: 1.6 }}>
          Laissez un avis 5★ sur SKY07 et gagnez des points fidélité validés par IA.
        </div>
      </div>

      {/* Statut avis existant */}
      {avisStatut && (
        <div style={{
          padding: '14px 16px', borderRadius: 4,
          background: avisStatut === 'valide' ? '#F0FDF4' : avisStatut === 'rejete' ? '#FEF2F2' : '#FEF9EC',
          border: `1px solid ${avisStatut === 'valide' ? '#BBF7D0' : avisStatut === 'rejete' ? '#FECACA' : '#FDE68A'}`,
        }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.1em', marginBottom: 4 }}>
            VOTRE AVIS DU MOIS
          </div>
          <div style={{ fontFamily: serif, fontSize: 15, color: INK, marginBottom: 2 }}>
            {avisStatut === 'valide' && '✓ Avis validé — points crédités'}
            {avisStatut === 'en_attente' && '⏳ En cours de vérification'}
            {avisStatut === 'rejete' && '✗ Avis rejeté'}
          </div>
          {avisDate && (
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED }}>
              Soumis le {new Date(avisDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </div>
          )}
          {avisStatut !== 'rejete' && (
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 6 }}>
              Un seul avis par mois est accepté.
            </div>
          )}
        </div>
      )}

      {/* Formulaire — toujours visible */}
      {true && <>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map((step, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '10px 12px', background: CREAM, borderRadius: 4,
            borderLeft: `2px solid ${i === STEPS.length - 1 ? GOLD : 'rgba(26,20,16,0.12)'}`,
          }}>
            <div style={{
              fontFamily: bebas, fontSize: 18, color: i === STEPS.length - 1 ? GOLD : MUTED,
              lineHeight: 1, flexShrink: 0, minWidth: 24,
            }}>{step.n}</div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, color: INK, fontWeight: 'bold', marginBottom: 2 }}>{step.title}</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${preview ? GOLD : 'rgba(26,20,16,0.2)'}`,
          borderRadius: 4, padding: preview ? 0 : '24px 16px',
          cursor: 'pointer', textAlign: 'center', overflow: 'hidden',
          background: preview ? 'transparent' : CREAM,
          transition: 'border-color 200ms',
        }}
      >
        {preview ? (
          <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>CHOISIR UNE CAPTURE D'ÉCRAN</div>
            <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, marginTop: 4, opacity: 0.7 }}>JPG, PNG — max 10 Mo</div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])} />
      </div>

      {preview && (
        <button onClick={() => inputRef.current?.click()} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: mono, fontSize: 9, color: MUTED, textAlign: 'center', letterSpacing: '0.06em',
        }}>Changer l'image</button>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '10px 14px', fontFamily: mono, fontSize: 9, color: RED }}>{error}</div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          background: result.points_gagnes > 0 ? '#F0FDF4' : '#FEF9EC',
          border: `1px solid ${result.points_gagnes > 0 ? '#BBF7D0' : '#FDE68A'}`,
          borderRadius: 4, padding: '14px 16px',
        }}>
          {result.points_gagnes > 0 ? (
            <>
              <div style={{ fontFamily: serif, fontSize: 16, color: '#166534', marginBottom: 4 }}>Avis accepté !</div>
              <div style={{ fontFamily: bebas, fontSize: 28, color: GOLD }}>+{result.points_gagnes} PTS</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: '#166534', marginTop: 4 }}>En attente de validation gérant</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: serif, fontSize: 15, color: '#92400E', marginBottom: 4 }}>Capture non acceptée</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: '#92400E', lineHeight: 1.6 }}>
                {result.motif_rejet || 'L\'IA n\'a pas pu valider votre avis. Relisez les étapes et réessayez.'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Submit */}
      {!result && (
        <button onClick={handleSubmit} disabled={!file || loading} style={{
          background: file && !loading ? INK : 'rgba(26,20,16,0.2)',
          color: CREAM, border: 'none', borderRadius: 4,
          padding: '13px 20px', cursor: file && !loading ? 'pointer' : 'default',
          fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          transition: 'background 200ms',
        }}>
          {loading ? 'ANALYSE EN COURS...' : 'ENVOYER POUR VALIDATION IA'}
        </button>
      )}
      </> }
    </div>
  )
}

export default function ClientDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [data, setData] = useState(null)
  const [spins, setSpins] = useState([])
  const [loading, setLoading] = useState(true)
  const [bonusPoints, setBonusPoints] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, spinsRes] = await Promise.all([getClientDashboard(), getClientSpins()])
        setData(dashRes.data)
        setSpins(spinsRes.data || [])
      } catch (err) {
        if (err.response?.status === 401) navigate('/client/login')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  function handleAvisSuccess(pts) {
    setBonusPoints(pts)
  }

  function handleLogout() { logout(); navigate('/client/login') }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: MUTED, letterSpacing: '0.12em' }}>CHARGEMENT...</div>
      </div>
    )
  }

  const pts     = data?.points ?? data?.points_solde ?? 0
  const prenom  = data?.prenom ?? ''
  const progress = Math.min(pts / MAX_PTS, 1)

  return (
    <div style={{ minHeight: '100vh', background: PAPER, padding: '20px 16px 60px', fontFamily: mono }}>
      <div style={{ maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Bonjour</div>
            <div style={{ fontFamily: serif, fontSize: 24, color: INK }}>{prenom}</div>
          </div>
          <button onClick={handleLogout} style={{
            background: 'none', border: `1px solid rgba(26,20,16,0.2)`,
            borderRadius: 3, padding: '7px 14px', cursor: 'pointer',
            fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>Sortir</button>
        </div>

        {/* ── Loyalty ticket ── */}
        <div style={{ background: CREAM, borderRadius: 4, boxShadow: '0 4px 20px rgba(26,20,16,0.12)', overflow: 'visible', position: 'relative' }}>
          {/* Top holes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: -8 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />
            ))}
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Solde fidélité</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: bebas, fontSize: 56, color: INK, lineHeight: 1 }}>{pts.toLocaleString('fr-FR')}</span>
                  <span style={{ fontFamily: mono, fontSize: 12, color: GOLD }}>pts</span>
                </div>
                <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 4 }}>Objectif : {MAX_PTS} pts</div>
              </div>
              {/* Progress ring */}
              <svg width={80} height={80} viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(26,20,16,0.08)" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke={GOLD} strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - progress)}
                  transform="rotate(-90 40 40)" />
                <text x="40" y="44" textAnchor="middle" fontFamily={mono} fontSize="9" fill={MUTED}>SKY07</text>
              </svg>
            </div>
            {/* Progress bar */}
            <div style={{ height: 4, background: 'rgba(26,20,16,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress * 100}%`, background: GOLD, borderRadius: 2, transition: 'width 800ms ease' }} />
            </div>
          </div>
          {/* Bottom holes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginBottom: -8 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />
            ))}
          </div>
        </div>

        {/* ── Action cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ActionCard label="Roue Fortune" sub="100 pts / tour" emoji="🎡" onClick={() => navigate('/client/roue')} />
          <ActionCard label="Parrainage" sub="+100 pts/ami" emoji="🎁" onClick={() => navigate('/client/parrainage')} />
          <ActionCard label="Vérif. Tél." sub="Débloquer +50" emoji="📱"
            onClick={() => navigate('/client/verification')} disabled={data?.telephone_valide} />
          <ActionCard label="Avis Google" sub={data?.avis_statut === 'valide' ? '✓ Validé' : data?.avis_statut === 'en_attente' ? '⏳ En attente' : '+50 pts'} emoji="⭐"
            onClick={() => navigate('/client/avis-google')} />
        </div>

        {/* ── Phone banner if not verified ── */}
        {!data?.telephone_valide && (
          <button onClick={() => navigate('/client/verification')} style={{
            background: CREAM, border: `1px solid rgba(26,20,16,0.12)`,
            borderLeft: `3px solid ${GOLD}`,
            borderRadius: 4, padding: '12px 16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            textAlign: 'left',
          }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: 13, color: INK }}>Vérifiez votre téléphone</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 2, letterSpacing: '0.04em' }}>
                Confirmez votre numéro pour débloquer des avantages
              </div>
            </div>
            <div style={{ fontFamily: bebas, fontSize: 16, color: GOLD, letterSpacing: '0.08em', flexShrink: 0 }}>+50 PTS</div>
          </button>
        )}

        {/* ── Historique ── */}
        <div style={{ background: CREAM, borderRadius: 4, padding: '16px 20px', boxShadow: '0 2px 10px rgba(26,20,16,0.06)' }}>
          <PerfoRow />
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: serif, fontSize: 16, color: INK, marginBottom: 12 }}>Historique des gains</div>
            {spins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>AUCUN HISTORIQUE</div>
                <button onClick={() => navigate('/client/roue')} style={{
                  marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: mono, fontSize: 10, color: GOLD, letterSpacing: '0.06em',
                }}>Essayer la roue →</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {spins.slice(0, 8).map((spin, i) => {
                  const ptsDiff = (spin.points_apres ?? 0) - (spin.points_avant ?? 0)
                  const isGain = ptsDiff > 0
                  return (
                    <div key={spin.id ?? i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: PAPER, borderRadius: 3,
                      borderLeft: `2px solid ${isGain ? GOLD : 'rgba(26,20,16,0.12)'}`,
                    }}>
                      <div>
                        <div style={{ fontFamily: mono, fontSize: 11, color: INK }}>{spin.nom_prix ?? 'Gain'}</div>
                        <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 2 }}>
                          {spin.date ? new Date(spin.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                      <div style={{ fontFamily: bebas, fontSize: 18, color: isGain ? GOLD : MUTED, letterSpacing: '0.05em' }}>
                        {isGain ? `+${ptsDiff}` : ptsDiff === 0 ? '—' : ptsDiff}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <PerfoRow />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontFamily: bebas, fontSize: 20, color: INK, letterSpacing: '0.1em' }}>SKY07</div>
              <Barcode />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
