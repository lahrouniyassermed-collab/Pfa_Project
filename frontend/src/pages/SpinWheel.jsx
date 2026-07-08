import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { spinWheel, getClientDashboard, getClientSpins } from '../services/api'

const INK   = '#1A1410'
const CREAM = '#F5F0E8'
const PAPER = '#FAF7F0'
const MUTED = '#8A7E76'
const RED   = '#C8312A'
const GOLD  = '#B8963E'
const serif = "'DM Serif Display', serif"
const mono  = "'Space Mono', monospace"
const bebas = "'Bebas Neue', sans-serif"

const SEGMENTS = [
  { label: '20% OFF',          color: '#C8A882' },
  { label: 'Repas gratuit',    color: '#A07850' },
  { label: 'Double Points',    color: '#B8963E' },
  { label: "Chef's Table VIP", color: '#8B6440' },
  { label: 'Boisson offerte',  color: '#D4B896' },
  { label: 'Dessert offert',   color: '#C8A882' },
  { label: '10% OFF',          color: '#B89470' },
  { label: 'Rejouer',          color: '#6B5040' },
]

const WHEEL_SIZE = 280
const CX = WHEEL_SIZE / 2
const CY = WHEEL_SIZE / 2
const RADIUS = 122
const SEG_COUNT = SEGMENTS.length

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function segmentPath(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, startAngle)
  const e = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y} Z`
}

function textPosition(cx, cy, r, midAngle) {
  const rad = (midAngle * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function PerfoRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '0 -20px', overflow: 'hidden' }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
      <div style={{ flex: 1, borderTop: `2px dashed rgba(26,20,16,0.18)` }} />
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
    </div>
  )
}

export default function SpinWheelPage() {
  const navigate = useNavigate()
  const [dashData, setDashData] = useState(null)
  const [loadingDash, setLoadingDash] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const currentRotation = useRef(0)

  function loadData() {
    getClientDashboard()
      .then(r => setDashData(r.data))
      .catch(err => { if (err.response?.status === 401) navigate('/client/login') })
      .finally(() => setLoadingDash(false))
    getClientSpins().then(r => setHistory(r.data)).catch(() => {})
  }

  useEffect(() => { loadData() }, [])

  const pts      = dashData?.points ?? dashData?.points_solde ?? 0
  const costSpin = dashData?.config?.cout_spin ?? 100
  const canSpin  = !spinning && pts >= costSpin && !result

  async function handleSpin() {
    if (!canSpin) return
    setSpinning(true); setResult(null)
    try {
      const res = await spinWheel()
      const nomPrix = res.data.nom_prix

      // Trouver l'index du segment gagnant
      const segIndex = SEGMENTS.findIndex(s => s.label === nomPrix)
      const segAngle = 360 / SEG_COUNT

      // Calculer l'angle pour amener le segment gagnant sous la flèche (haut de la roue)
      // Segment i a son milieu à (i * segAngle + segAngle/2) - 90 degrés
      // Pour l'amener au top (270°), la rotation additionnelle est :
      let targetAngle = 0
      if (segIndex >= 0) {
        const midOfWinner = segIndex * segAngle + segAngle / 2 - 90
        targetAngle = ((270 - midOfWinner) % 360 + 360) % 360
      } else {
        targetAngle = Math.random() * 360
      }

      // Rotation additionnelle pour partir de la position actuelle
      const currentMod = currentRotation.current % 360
      const additionalR = ((targetAngle - currentMod) % 360 + 360) % 360
      const newRotation = currentRotation.current + 5 * 360 + additionalR

      currentRotation.current = newRotation
      setRotation(newRotation)

      setTimeout(() => {
        setResult(res.data); setSpinning(false)
        loadData()
      }, 4200)
    } catch (err) {
      const fallback = currentRotation.current + 5 * 360 + Math.floor(Math.random() * 360)
      currentRotation.current = fallback
      setRotation(fallback)
      setTimeout(() => {
        setSpinning(false)
        setResult({ nom_prix: 'Erreur', pts: 0, error: err.response?.data?.detail || 'Une erreur est survenue.' })
      }, 4200)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: PAPER, padding: '20px 16px 60px', fontFamily: mono }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate('/client/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.08em',
          }}>← RETOUR</button>
          <div style={{ fontFamily: bebas, fontSize: 20, color: INK, letterSpacing: '0.1em' }}>SKY07</div>
        </div>

        {/* Ticket card */}
        <div style={{ background: CREAM, borderRadius: 4, boxShadow: '0 4px 20px rgba(26,20,16,0.12)', overflow: 'visible', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: -8 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />
            ))}
          </div>

          <div style={{ padding: '20px 20px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: serif, fontSize: 22, color: INK, marginBottom: 4 }}>Roue de la Fortune</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.12em' }}>
                TENTEZ VOTRE CHANCE
              </div>
              {!loadingDash && (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10 }}>
                  <div style={{ padding: '6px 14px', background: 'rgba(184,150,62,0.12)', border: `1px solid rgba(184,150,62,0.3)`, borderRadius: 3 }}>
                    <span style={{ fontFamily: bebas, fontSize: 20, color: GOLD }}>{pts}</span>
                    <span style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginLeft: 4 }}>pts</span>
                  </div>
                  <div style={{ padding: '6px 14px', background: 'rgba(26,20,16,0.05)', border: `1px solid rgba(26,20,16,0.1)`, borderRadius: 3 }}>
                    <span style={{ fontFamily: mono, fontSize: 9, color: MUTED }}>Coût: </span>
                    <span style={{ fontFamily: bebas, fontSize: 20, color: INK }}>{costSpin}</span>
                    <span style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginLeft: 2 }}>pts</span>
                  </div>
                </div>
              )}
            </div>

            <PerfoRow />

            {/* Wheel */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 20, marginBottom: 16, position: 'relative' }}>
              {/* Pointer — pointe vers le bas dans la roue */}
              <div style={{ marginBottom: -14, zIndex: 10 }}>
                <svg width="28" height="32" viewBox="0 0 28 32">
                  <polygon points="14,32 0,6 28,6" fill={GOLD} stroke={INK} strokeWidth="1.5" />
                </svg>
              </div>

              {/* Wheel SVG */}
              <div style={{
                borderRadius: '50%', border: `3px solid ${INK}`,
                boxShadow: `0 4px 20px rgba(26,20,16,0.2), inset 0 0 0 2px rgba(184,150,62,0.3)`,
                overflow: 'hidden',
              }}>
                <svg
                  width={WHEEL_SIZE} height={WHEEL_SIZE}
                  viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning ? `transform 4s cubic-bezier(0.17,0.67,0.12,1.0)` : 'none',
                    display: 'block',
                  }}
                >
                  {SEGMENTS.map((seg, i) => {
                    const startDeg = (i * 360) / SEG_COUNT - 90
                    const endDeg   = ((i + 1) * 360) / SEG_COUNT - 90
                    const midDeg   = startDeg + (endDeg - startDeg) / 2
                    const txtR     = RADIUS * 0.65
                    const tp       = textPosition(CX, CY, txtR, midDeg)
                    const lines    = seg.label.split(' ')
                    return (
                      <g key={i}>
                        <path d={segmentPath(CX, CY, RADIUS, startDeg, endDeg)} fill={seg.color} stroke="rgba(26,20,16,0.08)" strokeWidth="1" />
                        <text x={tp.x} y={tp.y} fill={INK} fontSize="8" fontWeight="700" textAnchor="middle" dominantBaseline="central"
                          transform={`rotate(${midDeg + 90}, ${tp.x}, ${tp.y})`} fontFamily={mono}>
                          {lines.map((line, li) => (
                            <tspan key={li} x={tp.x} dy={li === 0 ? `-${(lines.length - 1) * 4.5}` : '10'}>{line}</tspan>
                          ))}
                        </text>
                      </g>
                    )
                  })}
                  {/* Center */}
                  <circle cx={CX} cy={CY} r={26} fill={INK} />
                  <circle cx={CX} cy={CY} r={22} fill={CREAM} />
                  <text x={CX} y={CY - 4} fill={INK} fontSize="8" fontWeight="700" textAnchor="middle" fontFamily={bebas} letterSpacing="2">SKY07</text>
                  <text x={CX} y={CY + 8} fill={GOLD} fontSize="7" textAnchor="middle">★★★</text>
                </svg>
              </div>

              {/* Spin button */}
              <button onClick={handleSpin} disabled={!canSpin || loadingDash} style={{
                marginTop: 20, padding: '12px 32px',
                background: canSpin && !loadingDash ? INK : 'rgba(26,20,16,0.12)',
                color: canSpin && !loadingDash ? CREAM : MUTED,
                border: `2px dashed ${canSpin && !loadingDash ? 'rgba(245,240,232,0.3)' : 'rgba(26,20,16,0.15)'}`,
                borderRadius: 3, cursor: !canSpin || loadingDash ? 'not-allowed' : 'pointer',
                fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                opacity: !canSpin && !spinning ? 0.5 : 1,
                transition: 'all 200ms',
              }}>
                {spinning ? 'EN COURS...' : pts < costSpin ? `MANQUE ${costSpin - pts} PTS` : result ? 'REJOUER' : `TOURNER — ${costSpin} PTS`}
              </button>
            </div>

            {/* Result */}
            {result && !spinning && (
              <div style={{
                padding: '16px', borderRadius: 3, textAlign: 'center', marginBottom: 16,
                background: result.error ? 'rgba(200,49,42,0.08)' : result.nom_prix === 'Rejouer' ? 'rgba(26,20,16,0.05)' : 'rgba(184,150,62,0.1)',
                border: `1px solid ${result.error ? 'rgba(200,49,42,0.25)' : result.nom_prix === 'Rejouer' ? 'rgba(26,20,16,0.1)' : 'rgba(184,150,62,0.3)'}`,
              }}>
                {result.error ? (
                  <div style={{ fontFamily: mono, fontSize: 12, color: RED }}>{result.error}</div>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{result.nom_prix === 'Rejouer' ? '😅' : '🎉'}</div>
                    <div style={{ fontFamily: serif, fontSize: 20, color: INK, marginBottom: 4 }}>{result.nom_prix ?? 'Résultat'}</div>
                    {result.nom_prix === 'Double Points' && (
                      <div style={{ fontFamily: bebas, fontSize: 22, color: GOLD, letterSpacing: '0.05em' }}>
                        SOLDE × 2 → {result.points_apres} pts
                      </div>
                    )}
                    {result.nom_prix !== 'Rejouer' && result.nom_prix !== 'Double Points' && (
                      <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, marginTop: 2 }}>
                        Présentez ce gain au restaurant
                      </div>
                    )}
                    <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 6 }}>
                      Solde : {result.points_apres ?? pts} pts
                    </div>
                  </>
                )}
                <button onClick={() => setResult(null)} style={{
                  marginTop: 12, background: 'none', border: `1px solid rgba(26,20,16,0.15)`,
                  borderRadius: 3, padding: '6px 20px', cursor: 'pointer',
                  fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.1em',
                }}>FERMER</button>
              </div>
            )}

            <PerfoRow />

            {/* Segments legend */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>Récompenses</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {SEGMENTS.map((seg, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: PAPER, borderRadius: 3 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: mono, fontSize: 9, color: INK }}>{seg.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginBottom: -8 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />
            ))}
          </div>
        </div>

      {/* Historique des gains */}
      {history.length > 0 && (
        <div style={{ background: CREAM, borderRadius: 4, boxShadow: '0 2px 12px rgba(26,20,16,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: `1px dashed rgba(26,20,16,0.12)` }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Historique de mes gains</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {history.slice(0, 10).map((h, i) => (
              <div key={h.id ?? i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 20px',
                borderBottom: i < history.slice(0, 10).length - 1 ? `1px solid rgba(26,20,16,0.06)` : 'none',
              }}>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: INK, fontWeight: 700 }}>{h.nom_prix}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 2 }}>
                    {h.date ? new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontFamily: mono, fontSize: 9, letterSpacing: '0.08em',
                    padding: '3px 8px', borderRadius: 2,
                    background: h.statut === 'utilise' ? 'rgba(26,20,16,0.06)' : 'rgba(184,150,62,0.12)',
                    color: h.statut === 'utilise' ? MUTED : GOLD,
                    border: `1px solid ${h.statut === 'utilise' ? 'rgba(26,20,16,0.1)' : 'rgba(184,150,62,0.3)'}`,
                  }}>{h.statut === 'utilise' ? 'UTILISÉ' : 'DISPONIBLE'}</span>
                  {(h.points_apres - h.points_avant) !== 0 && (
                    <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 3 }}>
                      {h.points_avant} → {h.points_apres} pts
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>
    </div>
  )
}
