import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getParrainage } from '../services/api'

const INK   = '#1A1410'
const CREAM = '#F5F0E8'
const PAPER = '#FAF7F0'
const MUTED = '#8A7E76'
const GOLD  = '#B8963E'
const serif = "'DM Serif Display', serif"
const mono  = "'Space Mono', monospace"
const bebas = "'Bebas Neue', sans-serif"

function PerfoRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '0 -20px', overflow: 'hidden' }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
      <div style={{ flex: 1, borderTop: `2px dashed rgba(26,20,16,0.18)` }} />
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
    </div>
  )
}

export default function ParrainagePage() {
  const navigate = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    getParrainage()
      .then(r => setData(r.data))
      .catch(err => {
        if (err.response?.status === 401) navigate('/client/login')
        else setError('Impossible de charger les données.')
      })
      .finally(() => setLoading(false))
  }, [])

  function handleCopy() {
    if (!data?.code) return
    navigator.clipboard.writeText(data.code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleWhatsApp() {
    if (!data?.lien) return
    const msg = encodeURIComponent(`Rejoins le programme fidélité SKY07 et gagne des points !\nUtilise mon code : *${data.code}*\n${data.lien}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: MUTED, letterSpacing: '0.12em' }}>CHARGEMENT...</div>
      </div>
    )
  }

  const nb           = data?.nb_parrainages ?? 0
  const max          = data?.max_parrainages ?? 3
  const ptsByReferral = data?.points_par_filleul ?? 100
  const totalEarned  = nb * ptsByReferral
  const filleuls     = data?.filleuls ?? []

  return (
    <div style={{ minHeight: '100vh', background: PAPER, padding: '20px 16px 60px', fontFamily: mono }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Nav */}
        <button onClick={() => navigate('/client/dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.08em', textAlign: 'left',
        }}>← RETOUR</button>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 3, fontFamily: mono, fontSize: 10, background: 'rgba(200,49,42,0.1)', border: '1px solid rgba(200,49,42,0.3)', color: '#C8312A' }}>{error}</div>
        )}

        {/* Main ticket */}
        <div style={{ background: CREAM, borderRadius: 4, boxShadow: '0 4px 20px rgba(26,20,16,0.12)', overflow: 'visible', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: -8 }}>
            {[...Array(7)].map((_, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />)}
          </div>

          <div style={{ padding: '20px 20px 24px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: bebas, fontSize: 36, color: INK, letterSpacing: '0.1em', lineHeight: 1 }}>SKY07</div>
              <div style={{ fontFamily: serif, fontSize: 18, color: INK, marginTop: 4 }}>Programme Parrainage</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 4, letterSpacing: '0.1em' }}>
                INVITEZ VOS AMIS — GAGNEZ DES POINTS
              </div>
            </div>

            <PerfoRow />

            {/* Referral code */}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                Votre code de parrainage
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '14px 10px',
                  background: PAPER, border: `1px dashed rgba(26,20,16,0.25)`, borderRadius: 3,
                }}>
                  <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: INK, letterSpacing: '0.1em' }}>
                    {data?.code ?? '———'}
                  </div>
                </div>
                <button onClick={handleCopy} style={{
                  padding: '0 16px', borderRadius: 3, cursor: 'pointer',
                  background: copied ? 'rgba(184,150,62,0.12)' : 'rgba(26,20,16,0.06)',
                  border: `1px solid ${copied ? 'rgba(184,150,62,0.4)' : 'rgba(26,20,16,0.12)'}`,
                  fontFamily: mono, fontSize: 9, color: copied ? GOLD : MUTED,
                  letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                }}>
                  <span style={{ fontSize: 16 }}>{copied ? '✓' : '⎘'}</span>
                  <span>{copied ? 'COPIÉ' : 'COPIER'}</span>
                </button>
              </div>
              {totalEarned > 0 && (
                <div style={{ marginTop: 8, fontFamily: mono, fontSize: 10, color: GOLD }}>
                  Total gagné via parrainage : <strong>{totalEarned} pts</strong>
                </div>
              )}
            </div>

            <PerfoRow />

            {/* Friends progress */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Amis invités</div>
                <div style={{ fontFamily: bebas, fontSize: 16, color: INK, letterSpacing: '0.06em' }}>{nb}/{max}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {Array.from({ length: max }, (_, i) => {
                  const filleul = filleuls[i]
                  const done = i < nb
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? GOLD : 'transparent',
                        border: done ? 'none' : `2px dashed rgba(26,20,16,0.2)`,
                        fontFamily: mono, fontSize: done ? 14 : 18, fontWeight: 700,
                        color: done ? CREAM : MUTED,
                      }}>
                        {done ? (filleul?.prenom?.[0]?.toUpperCase() ?? '✓') : '+'}
                      </div>
                      <span style={{ fontFamily: mono, fontSize: 7, color: MUTED, textAlign: 'center', letterSpacing: '0.04em' }}>
                        {done ? (filleul?.prenom ?? 'Ami') : 'en attente'}
                      </span>
                    </div>
                  )
                })}
                <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: bebas, fontSize: 28, color: GOLD, lineHeight: 1 }}>+{ptsByReferral}</div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: MUTED }}>pts / ami</div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: INK, marginTop: 2 }}>+{data?.points_filleul ?? 30} filleul</div>
                </div>
              </div>
            </div>

            <PerfoRow />

            {/* How it works */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Comment ça marche</div>
              {[
                { n: '01', title: 'Partagez votre code', desc: 'Envoyez votre code unique à vos amis via WhatsApp ou SMS.' },
                { n: '02', title: 'Votre ami s\'inscrit', desc: 'Il crée son compte fidélité SKY07 avec votre code de parrainage.' },
                { n: '03', title: 'Vous gagnez tous les deux', desc: `Vous recevez +${ptsByReferral} pts, votre filleul +${data?.points_filleul ?? 30} pts.` },
              ].map(({ n, title, desc }) => (
                <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: bebas, fontSize: 20, color: GOLD, lineHeight: 1, flexShrink: 0, width: 24 }}>{n}</div>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: INK, fontWeight: 700, marginBottom: 2 }}>{title}</div>
                    <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginBottom: -8 }}>
            {[...Array(7)].map((_, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />)}
          </div>
        </div>

        {/* WhatsApp share */}
        <button onClick={handleWhatsApp} disabled={!data?.lien} style={{
          padding: '14px 20px', background: '#25D366', color: '#fff',
          border: 'none', borderRadius: 4, cursor: data?.lien ? 'pointer' : 'not-allowed',
          fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 16px rgba(37,211,102,0.3)', opacity: data?.lien ? 1 : 0.5,
        }}>
          <span>💬</span> Partager via WhatsApp
        </button>

      </div>
    </div>
  )
}
