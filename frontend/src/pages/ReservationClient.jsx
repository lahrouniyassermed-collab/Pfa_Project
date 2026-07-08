// src/pages/ReservationClient.jsx
// Design: ticket de restaurant — DM Serif Display + Space Mono + Bebas Neue
// Ink/cream palette · 5 écrans · Stripe pour salle privée

import { useState } from 'react'
import { creerReservation, creerPaiementReservation, confirmerPaiementReservation } from '../services/api'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

// ── Design tokens ─────────────────────────────────────────────────────────────
const INK    = '#1A1410'
const CREAM  = '#F5F0E8'
const PAPER  = '#FAF7F0'
const MUTED  = '#8A7E76'
const RED    = '#C8312A'
const GOLD   = '#B8963E'
const GREEN  = '#2D7D5A'

const serif  = "'DM Serif Display', serif"
const mono   = "'Space Mono', monospace"
const bebas  = "'Bebas Neue', sans-serif"

// ── Zone definitions ──────────────────────────────────────────────────────────
const ZONES = [
  {
    id: 'salle',
    name: 'Salle Principale',
    icon: '🍽',
    color: GOLD,
    bg: 'rgba(184,150,62,0.1)',
    photos: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
      'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&q=80',
    ],
    cap: "jusqu'à 8 personnes",
    acompte: null,
    premium: false,
  },
  {
    id: 't1',
    name: 'Terrasse',
    icon: '☀',
    color: GREEN,
    bg: 'rgba(45,125,90,0.1)',
    photos: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
      'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=600&q=80',
      'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=600&q=80',
    ],
    cap: "jusqu'à 6 personnes",
    acompte: null,
    premium: false,
  },
  {
    id: 't2',
    name: 'Terrasse Jardin',
    icon: '🌿',
    color: '#4A7C59',
    bg: 'rgba(74,124,89,0.1)',
    photos: [
      'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&q=80',
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80',
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80',
    ],
    cap: "jusqu'à 6 personnes",
    acompte: null,
    premium: false,
  },
  {
    id: 'priv',
    name: 'Salle Privée',
    icon: '♦',
    color: RED,
    bg: 'rgba(200,49,42,0.08)',
    photos: [
      'https://images.unsplash.com/photo-1550966871-3ed3cde8aa86?w=600&q=80',
      'https://images.unsplash.com/photo-1519671845926-40ea7cfe5a68?w=600&q=80',
      'https://images.unsplash.com/photo-1485686531765-ba63b07845a7?w=600&q=80',
    ],
    cap: "jusqu'à 20 personnes · exclusif",
    acompte: 500,
    premium: true,
  },
]

const TIME_SLOTS = ['12:00','12:30','13:00','13:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00']

function genResaNum() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const l1 = chars[Math.floor(Math.random() * chars.length)]
  const l2 = chars[Math.floor(Math.random() * chars.length)]
  const n  = Math.floor(Math.random() * 9000) + 1000
  return `${l1}${l2}-${n}`
}

function getNow() {
  const now = new Date()
  const days   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
  const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  return {
    day:   days[now.getDay()],
    short: `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`,
    time:  `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
    iso:   now.toISOString().slice(0,10),
  }
}

// ── Barcode SVG ───────────────────────────────────────────────────────────────
function Barcode({ width = 220, height = 32, opacity = 1 }) {
  const bars = []
  let x = 0
  const ws = [2,1,3,1,2,2,1,3,2,1,2,1,3,1,2,3,1,2,1,2,3,1,2,2,1,3,2,1,2,1,3,2,1,2,3,1,2,1,2,3,1,2,2,1,3]
  for (let i = 0; i < ws.length; i++) {
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={ws[i] * (width / 80)} height={height} fill={INK} />)
    x += ws[i] * (width / 80)
  }
  return <svg width={width} height={height} style={{ opacity, display: 'block' }}>{bars}</svg>
}

// ── Perforations ──────────────────────────────────────────────────────────────
function Perfo({ bg = INK, dotBg = PAPER, count = 7 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', height: 14, gap: 0 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: '50%', background: dotBg,
          flexShrink: 0, margin: i > 0 ? '0 0 0 auto' : 0,
          ...(i === 0 ? {} : {}),
        }} />
      ))}
      <div style={{ flex: 1, height: 1, borderTop: `1.5px dashed rgba(0,0,0,0.2)`, margin: '0 3px' }} />
    </div>
  )
}

function PerfoRow({ bg = 'rgba(0,0,0,0.15)', dotBg = PAPER }) {
  const dots = 7
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', height: 12, background: bg }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotBg, flexShrink: 0 }} />
      <div style={{ flex: 1, height: 1, borderTop: '1px dashed rgba(255,255,255,0.18)', margin: '0 3px' }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotBg, flexShrink: 0 }} />
      <div style={{ flex: 1, height: 1, borderTop: '1px dashed rgba(255,255,255,0.18)', margin: '0 3px' }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotBg, flexShrink: 0 }} />
    </div>
  )
}

// ── Zone card with photos ─────────────────────────────────────────────────────
function ZoneCard({ zone, selected, onSelect }) {
  const [photoIdx, setPhotoIdx] = useState(0)
  return (
    <div
      onClick={onSelect}
      style={{
        border: `1.5px solid ${selected ? zone.color : 'rgba(26,20,16,0.15)'}`,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        background: selected ? zone.bg : 'white',
        transition: 'border-color 0.18s, transform 0.18s',
        transform: selected ? 'translateY(-2px)' : 'none',
        position: 'relative',
        boxShadow: selected ? `0 4px 16px ${zone.color}22` : 'none',
      }}
    >
      {/* Photos */}
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
        {zone.photos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: i === photoIdx ? 1 : 0,
              transition: 'opacity 0.4s',
            }}
          />
        ))}
        {/* Photo dots */}
        {zone.photos.length > 1 && (
          <div style={{ position: 'absolute', bottom: 5, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 3 }}>
            {zone.photos.map((_, i) => (
              <div
                key={i}
                onClick={e => { e.stopPropagation(); setPhotoIdx(i) }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: i === photoIdx ? 'white' : 'rgba(255,255,255,0.45)', cursor: 'pointer' }}
              />
            ))}
          </div>
        )}
        {/* Premium badge */}
        {zone.premium && (
          <div style={{ position: 'absolute', top: 6, right: 6, background: RED, color: 'white', fontSize: 7, letterSpacing: '0.1em', padding: '2px 5px', borderRadius: 2, fontFamily: mono, fontWeight: 700 }}>
            PREMIUM
          </div>
        )}
        {/* Selected checkmark */}
        {selected && (
          <div style={{
            position: 'absolute', top: 6, left: 6, width: 18, height: 18,
            background: zone.color, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 8, height: 5, borderLeft: '2px solid white', borderBottom: '2px solid white', transform: 'rotate(-45deg) translate(1px,-1px)' }} />
          </div>
        )}
        {/* Bottom bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: selected ? zone.color : 'transparent', transition: 'background 0.18s' }} />
      </div>
      {/* Info */}
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <span style={{ fontSize: 14 }}>{zone.icon}</span>
          <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: selected ? zone.color : INK }}>
            {zone.name}
          </span>
        </div>
        <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.06em', lineHeight: 1.4 }}>{zone.cap}</div>
        {zone.acompte && (
          <div style={{ fontFamily: bebas, fontSize: 14, color: zone.color, marginTop: 4, letterSpacing: '0.05em' }}>
            Acompte {zone.acompte} DH
          </div>
        )}
      </div>
    </div>
  )
}

// ── Custom date picker ────────────────────────────────────────────────────────
function DatePicker({ value, onChange }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const currentYear = today.getFullYear()

  const initDate = value ? new Date(value + 'T00:00:00') : today
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())

  const MONTHS    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const DAY_HEADS = ['L','M','M','J','V','S','D']

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const rawFirst    = new Date(viewYear, viewMonth, 1).getDay()
  const offset      = (rawFirst + 6) % 7   // Monday-first

  const canGoPrev = !(viewYear === currentYear && viewMonth <= today.getMonth())
  const canGoNext = !(viewYear === currentYear && viewMonth >= 11)

  function prevMonth() {
    if (!canGoPrev) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) }
    else setViewMonth(m => m-1)
  }
  function nextMonth() {
    if (!canGoNext) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) }
    else setViewMonth(m => m+1)
  }
  function select(day) {
    const d = new Date(viewYear, viewMonth, day); d.setHours(0,0,0,0)
    if (d < today) return
    onChange(`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
  }
  function isPast(day) {
    const d = new Date(viewYear, viewMonth, day); d.setHours(0,0,0,0); return d < today
  }
  function isToday(day) {
    return viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
  }
  function isSelected(day) {
    if (!value) return false
    return value === `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
    const d = i - offset + 1
    return (d >= 1 && d <= daysInMonth) ? d : null
  })

  return (
    <div style={{ background: 'white', border: `1.5px solid rgba(26,20,16,0.18)`, borderRadius: 4, padding: '12px 10px' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button type="button" onClick={prevMonth} disabled={!canGoPrev} style={{
          background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'not-allowed',
          fontFamily: mono, fontSize: 16, color: canGoPrev ? INK : 'rgba(26,20,16,0.18)', lineHeight: 1,
          padding: '4px 8px', borderRadius: 2,
        }}>‹</button>
        <div style={{ fontFamily: serif, fontSize: 14, color: INK }}>{MONTHS[viewMonth]} {viewYear}</div>
        <button type="button" onClick={nextMonth} disabled={!canGoNext} style={{
          background: 'none', border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed',
          fontFamily: mono, fontSize: 16, color: canGoNext ? INK : 'rgba(26,20,16,0.18)', lineHeight: 1,
          padding: '4px 8px', borderRadius: 2,
        }}>›</button>
      </div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {DAY_HEADS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.06em', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const past = isPast(day)
          const sel  = isSelected(day)
          const tod  = isToday(day)
          return (
            <button key={i} type="button" onClick={() => !past && select(day)} style={{
              width: '100%', aspectRatio: '1/1', minHeight: 30,
              background: sel ? INK : tod ? 'rgba(184,150,62,0.14)' : 'transparent',
              color: sel ? CREAM : past ? 'rgba(26,20,16,0.22)' : INK,
              border: `1px solid ${sel ? INK : tod ? GOLD : 'transparent'}`,
              borderRadius: 3, cursor: past ? 'not-allowed' : 'pointer',
              fontFamily: mono, fontSize: 10, fontWeight: sel ? 700 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', transition: 'background 80ms',
            }}
              onMouseEnter={e => { if (!past && !sel) e.currentTarget.style.background = 'rgba(26,20,16,0.07)' }}
              onMouseLeave={e => { if (!past && !sel) e.currentTarget.style.background = tod ? 'rgba(184,150,62,0.14)' : 'transparent' }}
            >
              {day}
              {tod && !sel && <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: '50%', background: GOLD }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Stripe form ───────────────────────────────────────────────────────────────
function StripeForm({ clientSecret, resaId, onSuccess, onError }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    })
    if (error) { onError(error.message); setLoading(false); return }
    if (paymentIntent.status === 'succeeded') {
      try {
        const r = await confirmerPaiementReservation(resaId, { payment_intent_id: paymentIntent.id })
        onSuccess(r.data.code_acces)
      } catch (e2) { onError(e2.response?.data?.detail || 'Erreur confirmation') }
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.15)', borderRadius: 4, padding: '14px 16px' }}>
        <CardElement options={{
          style: {
            base: { fontSize: '14px', color: CREAM, fontFamily: mono, '::placeholder': { color: 'rgba(245,240,232,0.35)' } },
            invalid: { color: '#f87171' },
          },
        }} />
      </div>
      <button
        type="submit" disabled={!stripe || loading}
        style={{
          background: loading ? 'rgba(200,49,42,0.5)' : RED,
          color: 'white', border: 'none', borderRadius: 3,
          padding: 0, cursor: loading ? 'not-allowed' : 'pointer',
          overflow: 'hidden', boxShadow: '0 4px 20px rgba(200,49,42,0.4)',
          opacity: loading ? 0.7 : 1,
        }}
      >
        <PerfoRow />
        <span style={{ display: 'block', fontFamily: bebas, fontSize: 20, letterSpacing: '0.2em', padding: '10px 0 12px', textAlign: 'center' }}>
          {loading ? 'TRAITEMENT…' : '✓ CONFIRMER LE PAIEMENT'}
        </span>
      </button>
      <p style={{ fontFamily: mono, fontSize: 8, color: MUTED, textAlign: 'center', letterSpacing: '0.1em' }}>
        TEST : 4242 4242 4242 4242 · 12/26 · 123
      </p>
    </form>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function ReservationClient() {
  const dt = getNow()
  const [resaNum, setResaNum] = useState('')

  // Navigation
  const [screen, setScreen] = useState(0)

  // Form state
  const [couverts,   setCouverts]   = useState(2)
  const [zone,       setZone]       = useState(null)
  const [date,       setDate]       = useState('')
  const [heure,      setHeure]      = useState('19:30')
  const [nom,        setNom]        = useState('')
  const [telephone,  setTel]        = useState('')
  const [message,    setMessage]    = useState('')
  const [modePaiement, setMode]     = useState('carte')

  // Payment
  const [resaId,       setResaId]       = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [stripePromise, setStripe]      = useState(null)

  // Result
  const [codeAcces, setCode]   = useState(null)
  const [loading,   setLoading] = useState(false)
  const [error,     setError]   = useState('')

  const zoneInfo = ZONES.find(z => z.id === zone)
  const isPrivee = zone === 'priv'

  function goTo(n) { setError(''); setScreen(n) }

  async function handleSubmit() {
    if (!nom.trim() || !telephone.trim() || !date) {
      setError('Nom, téléphone et date sont obligatoires.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const r = await creerReservation({
        nom_complet:    nom,
        telephone:      telephone,
        date:           date,
        heure:          heure,
        nb_personnes:   couverts,
        zone:           zone || 'salle',
        message:        message || null,
        mode_paiement:  isPrivee ? modePaiement : null,
        montant_acompte: isPrivee ? 500 : null,
      })
      setResaId(r.data.id)
      setCode(r.data.code_acces)
      setResaNum(`SKY-${String(r.data.id).padStart(5, '0')}`)

      if (isPrivee && modePaiement === 'carte') {
        const r2 = await creerPaiementReservation(r.data.id)
        setClientSecret(r2.data.client_secret)
        if (r2.data.stripe_publishable_key) {
          setStripe(loadStripe(r2.data.stripe_publishable_key))
        }
        goTo(3)
      } else {
        goTo(4)
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  function handleStripeSuccess(code) {
    setCode(code)
    goTo(4)
  }

  function reset() {
    setScreen(0); setCouverts(2); setZone(null)
    setDate(''); setHeure('19:30'); setNom(''); setTel(''); setMessage('')
    setMode('carte'); setResaId(null); setClientSecret(null); setStripe(null)
    setCode(null); setError('')
  }

  function downloadTicketPDF() {
    const dateFormatted = date ? date.split('-').reverse().join('/') : '—'
    // Build inline barcode SVG
    const ws = [2,1,3,1,2,2,1,3,2,1,2,1,3,1,2,3,1,2,1,2,3,1,2,2,1,3,2,1,2,1,3,2,1]
    let barRects = ''; let bx = 0; const sc = 240/60
    for (let i = 0; i < ws.length; i++) {
      if (i%2===0) barRects += `<rect x="${bx.toFixed(1)}" y="0" width="${(ws[i]*sc).toFixed(1)}" height="32" fill="#1A1410"/>`
      bx += ws[i] * sc
    }
    const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><title>SKY07 - Réservation ${resaNum}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#FAF7F0;display:flex;flex-direction:column;align-items:center;padding:40px 20px;font-family:'Space Mono',monospace}
.tkt{width:380px;background:#F5F0E8;border-radius:4px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.15)}
.hd{background:#1A1410;padding:18px 22px;display:flex;justify-content:space-between;align-items:flex-start}
.nm{font-family:'Bebas Neue',sans-serif;font-size:30px;color:#B8963E;letter-spacing:0.1em}
.sb{font-size:7px;color:rgba(245,240,232,0.4);letter-spacing:0.2em;text-transform:uppercase;margin-top:2px}
.st{width:54px;height:54px;border:2px solid #C8312A;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-12deg);opacity:0.85;flex-shrink:0}
.st-t{font-family:'Bebas Neue',sans-serif;font-size:8px;color:#C8312A;letter-spacing:0.08em;text-align:center;line-height:1.1}
.st-n{font-size:7px;color:#C8312A;margin-top:1px;font-family:'Space Mono',monospace}
.pf{height:6px;background:repeating-linear-gradient(to right,transparent 0,transparent 8px,#FAF7F0 8px,#FAF7F0 12px)}
.fd{padding:14px 22px;display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}
.fl{font-size:7px;color:#8A7E76;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:3px}
.fv{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#1A1410;letter-spacing:0.05em}
.fvm{font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:#1A1410}
.full{grid-column:1/-1}
.da{border-top:1.5px dashed rgba(26,20,16,0.2);margin:0 22px}
.cb{margin:0 22px 14px;padding:10px 14px;background:rgba(200,49,42,0.08);border:1px solid rgba(200,49,42,0.3);border-radius:3px}
.cl{font-size:7px;color:#8A7E76;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px}
.cv{font-family:'Bebas Neue',sans-serif;font-size:26px;color:#C8312A;letter-spacing:0.12em}
.ba{padding:12px 22px 16px;text-align:center}
.bn{font-size:7px;color:#8A7E76;letter-spacing:0.1em;margin-top:6px}
.btn{margin:20px auto;display:block;padding:10px 28px;background:#1A1410;color:#F5F0E8;border:none;border-radius:3px;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.12em;cursor:pointer;text-transform:uppercase}
@media print{.btn{display:none}body{background:white;padding:6mm}.tkt{box-shadow:none}@page{size:A5;margin:8mm}}
</style></head><body>
<div class="tkt">
  <div class="hd">
    <div><div class="nm">SKY07</div><div class="sb">Ticket de réservation · Casablanca</div></div>
    <div class="st"><div class="st-t">EN<br>ATTENTE</div><div class="st-n">#${resaNum.split('-')[1]}</div></div>
  </div>
  <div class="pf"></div>
  <div class="fd">
    <div><div class="fl">N° Réservation</div><div class="fvm">${resaNum}</div></div>
    <div><div class="fl">Date</div><div class="fv">${dateFormatted}</div></div>
    <div><div class="fl">Heure</div><div class="fv">${heure}</div></div>
    <div><div class="fl">Couverts</div><div class="fv" style="font-size:34px">${couverts}</div></div>
    <div class="full"><div class="fl">Zone / Emplacement</div><div class="fv">${zoneLabel}</div></div>
    <div class="full"><div class="fl">Client</div><div class="fvm">${nom}</div><div style="font-size:10px;color:#8A7E76;margin-top:2px;font-family:'Space Mono',monospace">${telephone}</div></div>
    ${isPrivee ? `<div class="full"><div class="fl">Acompte salle privée</div><div class="fv" style="color:#C8312A;font-size:26px">500 DH</div></div>` : ''}
  </div>
  ${codeAcces ? `<div class="cb"><div class="cl">Code d'accès salle privée</div><div class="cv">${codeAcces}</div></div>` : ''}
  <div class="da"></div>
  <div class="ba">
    <svg width="240" height="32" viewBox="0 0 240 32">${barRects}</svg>
    <div class="bn">SÉRIE · ${resaNum} · ${(date||'').replace(/-/g,'')} · SKY07-CBL</div>
  </div>
</div>
<button class="btn" onclick="window.print()">⬇ Imprimer / Enregistrer PDF</button>
<script>window.onload=function(){setTimeout(function(){window.print()},900)}</script>
</body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const win  = window.open(url, '_blank')
    if (win) setTimeout(() => URL.revokeObjectURL(url), 8000)
  }

  // ── Label zone ───────────────────────────────────────────────────────────
  const zoneLabel = zoneInfo ? zoneInfo.name.toUpperCase() : 'ATTRIBUTION AUTO'
  const zoneColor = zoneInfo ? zoneInfo.color : MUTED

  return (
    <div style={{
      fontFamily: mono, background: INK, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      backgroundImage: `
        radial-gradient(ellipse at 20% 80%, rgba(200,49,42,0.1) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(184,150,62,0.07) 0%, transparent 50%)
      `,
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ticketIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .resa-slide { animation: slideUp 0.4s cubic-bezier(0.34,1.1,0.64,1) both; }
        .resa-ticket { animation: ticketIn 0.45s cubic-bezier(0.34,1.1,0.64,1) both; }
        .resa-fade   { animation: fadeIn 0.35s ease both; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
        select option { background: #1A1410; color: #F5F0E8; }
        .zone-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 400px) { .zone-grid { grid-template-columns: 1fr; } }
        @media (min-width: 640px) { .zone-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════════
          ÉCRAN 0 — ACCUEIL
      ══════════════════════════════════════════════════════════════════════ */}
      {screen === 0 && (
        <div className="resa-fade" style={{ width: '100%', maxWidth: 480, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '48px 28px 40px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: 11, color: GOLD, letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 4 }}>
              SKY07
            </div>
            <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>
              CASABLANCA · {dt.short} · SERVICE
            </div>
          </div>

          {/* Center */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.35em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                Système de réservation
              </span>
              <span style={{ fontFamily: serif, fontSize: 42, color: CREAM, lineHeight: 1.0, display: 'block' }}>
                Prêt pour<br />le service
              </span>
            </div>

            {/* Ticket CTA */}
            <div
              onClick={() => goTo(1)}
              style={{
                width: '100%', maxWidth: 300, cursor: 'pointer',
                borderRadius: 3, overflow: 'hidden',
                background: RED,
                boxShadow: '0 8px 32px rgba(200,49,42,0.45), 0 2px 0 rgba(255,255,255,0.1) inset',
                position: 'relative',
                transition: 'transform 0.15s, box-shadow 0.15s',
                userSelect: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(200,49,42,0.55)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(200,49,42,0.45)' }}
            >
              {/* Diagonal hatching */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,0.04) 8px, rgba(0,0,0,0.04) 10px)', pointerEvents: 'none' }} />
              {/* Top perfo */}
              <PerfoRow bg="rgba(0,0,0,0.12)" dotBg={INK} />
              {/* Body */}
              <div style={{ padding: '16px 28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2em', alignSelf: 'flex-end' }}>
                  OP-{dt.short.replace(/\//g, '')}
                </div>
                <div style={{ fontFamily: bebas, fontSize: 28, color: 'white', letterSpacing: '0.12em', textAlign: 'center', lineHeight: 1 }}>
                  Effectuer une<br />réservation
                </div>
                <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Appuyer pour commencer
                </div>
              </div>
              {/* Bottom perfo */}
              <PerfoRow bg="rgba(0,0,0,0.12)" dotBg={INK} />
            </div>
          </div>

          {/* Barcode */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Barcode width={200} height={26} opacity={0.18} />
            <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.2em', textAlign: 'center' }}>
              {dt.day.toUpperCase()} · {dt.short} · {dt.time}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ÉCRAN 1 — CONFIGURATION
      ══════════════════════════════════════════════════════════════════════ */}
      {screen === 1 && (
        <div className="resa-slide" style={{ width: '100%', maxWidth: 480, minHeight: '100vh', background: PAPER, display: 'flex', flexDirection: 'column', padding: '24px 24px 32px' }}>

          {/* Header */}
          <div style={{ borderBottom: `1.5px dashed rgba(26,20,16,0.2)`, paddingBottom: 14, marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: RED, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 4 }}>
              Étape 1/2 · Configuration
            </div>
            <div style={{ fontFamily: serif, fontSize: 26, color: INK, lineHeight: 1.1 }}>
              Nouvelle<br />réservation
            </div>
          </div>

          {/* Nombre de couverts */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              Nombre de couverts
              <div style={{ flex: 1, height: 1, background: 'rgba(26,20,16,0.1)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <button onClick={() => setCouverts(c => Math.max(1, c - 1))} style={{ width: 52, height: 52, borderRadius: 2, border: `1.5px solid ${INK}`, background: 'transparent', cursor: 'pointer', fontFamily: bebas, fontSize: 28, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                <div style={{ fontFamily: bebas, fontSize: 68, color: INK, lineHeight: 0.9, letterSpacing: -2 }}>{couverts}</div>
                <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{couverts === 1 ? 'couvert' : 'couverts'}</div>
              </div>
              <button onClick={() => setCouverts(c => Math.min(20, c + 1))} style={{ width: 52, height: 52, borderRadius: 2, border: `1.5px solid ${INK}`, background: 'transparent', cursor: 'pointer', fontFamily: bebas, fontSize: 28, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              {[2,3,4,6,8,10].map(n => (
                <button key={n} onClick={() => setCouverts(n)}
                  style={{ padding: '4px 10px', border: `1px solid ${couverts === n ? INK : 'rgba(26,20,16,0.2)'}`, borderRadius: 2, background: couverts === n ? INK : 'transparent', fontFamily: mono, fontSize: 9, color: couverts === n ? CREAM : MUTED, cursor: 'pointer', letterSpacing: '0.1em' }}>
                  ×{n}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Heure */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              Date & heure
              <div style={{ flex: 1, height: 1, background: 'rgba(26,20,16,0.1)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Date * {date && <span style={{ color: GOLD, marginLeft: 8 }}>→ {date.split('-').reverse().join('/')}</span>}
                </label>
                <DatePicker value={date} onChange={setDate} />
              </div>
              <div>
                <label style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Heure</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {TIME_SLOTS.map(t => (
                    <button key={t} type="button" onClick={() => setHeure(t)} style={{
                      padding: '8px 4px', background: heure === t ? INK : 'white',
                      border: `1.5px solid ${heure === t ? INK : 'rgba(26,20,16,0.15)'}`,
                      borderRadius: 3, fontFamily: mono, fontSize: 10,
                      color: heure === t ? CREAM : INK, cursor: 'pointer',
                      transition: 'all 100ms', letterSpacing: '0.04em',
                    }}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Zone */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              Emplacement <span style={{ fontSize: 7, color: RED, letterSpacing: '0.1em' }}>optionnel</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(26,20,16,0.1)' }} />
            </div>
            <div className="zone-grid">
              {ZONES.map(z => (
                <ZoneCard key={z.id} zone={z} selected={zone === z.id} onSelect={() => setZone(zone === z.id ? null : z.id)} />
              ))}
            </div>
            {!zone && (
              <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, textAlign: 'center', letterSpacing: '0.1em', lineHeight: 1.6, padding: '10px 0 2px' }}>
                ∅ Aucune préférence — attribution automatique
              </div>
            )}
          </div>

          {/* Contact */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              Vos coordonnées
              <div style={{ flex: 1, height: 1, background: 'rgba(26,20,16,0.1)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nom complet *</label>
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Mohammed Alami"
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid rgba(26,20,16,0.2)`, borderRadius: 2, fontFamily: mono, fontSize: 11, color: INK, background: 'white', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Téléphone *</label>
                <input value={telephone} onChange={e => setTel(e.target.value)} placeholder="+212 6 00 00 00 00" type="tel"
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid rgba(26,20,16,0.2)`, borderRadius: 2, fontFamily: mono, fontSize: 11, color: INK, background: 'white', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Message (optionnel)</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Occasion spéciale, allergies…"
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid rgba(26,20,16,0.2)`, borderRadius: 2, fontFamily: mono, fontSize: 11, color: INK, background: 'white', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
          </div>

          {error && <div style={{ background: 'rgba(200,49,42,0.08)', border: `1px solid rgba(200,49,42,0.25)`, borderRadius: 3, padding: '10px 14px', fontFamily: mono, fontSize: 9, color: RED, letterSpacing: '0.08em', marginBottom: 12 }}>{error}</div>}

          {/* Bouton suivant */}
          <button onClick={() => goTo(2)} style={{ width: '100%', background: INK, color: CREAM, border: 'none', borderRadius: 3, padding: 0, cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 16px rgba(26,20,16,0.25)', marginTop: 'auto' }}>
            <PerfoRow bg="rgba(255,255,255,0.06)" dotBg={PAPER} />
            <span style={{ display: 'block', fontFamily: bebas, fontSize: 22, letterSpacing: '0.2em', textAlign: 'center', padding: '10px 0 12px' }}>Suivant →</span>
          </button>

          <button onClick={() => goTo(0)} style={{ marginTop: 12, background: 'none', border: 'none', fontFamily: mono, fontSize: 9, color: MUTED, cursor: 'pointer', letterSpacing: '0.12em', textDecoration: 'underline' }}>← Retour</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ÉCRAN 2 — TICKET DE SYNTHÈSE
      ══════════════════════════════════════════════════════════════════════ */}
      {screen === 2 && (
        <div className="resa-fade" style={{ width: '100%', maxWidth: 480, minHeight: '100vh', background: '#2A2420', display: 'flex', flexDirection: 'column', padding: '16px 20px 32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={() => goTo(1)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: 2, padding: '6px 12px', fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              ← Retour
            </button>
            <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em' }}>Étape 2/2</div>
          </div>

          {/* Ticket physique */}
          <div className="resa-ticket" style={{ background: CREAM, borderRadius: 3, position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', margin: '0 14px' }}>
            {/* Perforations gauche */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: -7, width: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0' }}>
              {Array.from({ length: 9 }).map((_, i) => <div key={i} style={{ width: 14, height: 14, background: '#2A2420', borderRadius: '50%', flexShrink: 0 }} />)}
            </div>
            {/* Perforations droite */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: -7, width: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0' }}>
              {Array.from({ length: 9 }).map((_, i) => <div key={i} style={{ width: 14, height: 14, background: '#2A2420', borderRadius: '50%', flexShrink: 0 }} />)}
            </div>

            {/* Header ticket */}
            <div style={{ padding: '16px 20px 12px', borderBottom: `1.5px dashed rgba(26,20,16,0.2)`, position: 'relative' }}>
              <div style={{ fontFamily: serif, fontSize: 18, color: INK }}>SKY07</div>
              <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Ticket de réservation · Service en salle</div>
              {/* Tampon */}
              <div style={{ position: 'absolute', right: 16, top: 12, width: 54, height: 54, border: `2px solid ${RED}`, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-12deg)', opacity: 0.85 }}>
                <div style={{ fontFamily: bebas, fontSize: 9, color: RED, letterSpacing: '0.1em', textAlign: 'center', lineHeight: 1.1 }}>EN<br />ATTENTE</div>
                <div style={{ fontFamily: mono, fontSize: 7, color: RED, fontWeight: 700 }}>#{resaNum.split('-')[1]}</div>
              </div>
            </div>

            {/* Champs */}
            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: 7.5, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase' }}>N° réservation</div>
                <div style={{ fontFamily: mono, fontSize: 13, color: INK, fontWeight: 700, letterSpacing: '0.08em', marginTop: 3 }}>{resaNum}</div>
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 7.5, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Date</div>
                <div style={{ fontFamily: mono, fontSize: 13, color: INK, fontWeight: 700, marginTop: 3 }}>{date ? date.split('-').reverse().join('/') : dt.short}</div>
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 7.5, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Heure</div>
                <div style={{ fontFamily: mono, fontSize: 14, color: INK, marginTop: 3 }}>{heure}</div>
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 7.5, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Couverts</div>
                <div style={{ fontFamily: bebas, fontSize: 36, color: INK, lineHeight: 1, letterSpacing: '-1px', marginTop: 3 }}>{couverts}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontFamily: mono, fontSize: 7.5, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Zone / Emplacement</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: zoneColor, flexShrink: 0 }} />
                  <span style={{ fontFamily: bebas, fontSize: 18, color: INK, letterSpacing: '0.05em' }}>{zoneLabel}</span>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontFamily: mono, fontSize: 7.5, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Client</div>
                <div style={{ fontFamily: mono, fontSize: 12, color: INK, fontWeight: 700, marginTop: 3, letterSpacing: '0.04em' }}>{nom || '—'}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, marginTop: 2 }}>{telephone || '—'}</div>
              </div>
              {isPrivee && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontFamily: mono, fontSize: 7.5, color: MUTED, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Acompte salle privée</div>
                  <div style={{ fontFamily: bebas, fontSize: 24, color: RED, letterSpacing: '0.05em' }}>500 DH</div>
                </div>
              )}
            </div>

            {/* Ligne de découpe */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0', position: 'relative', margin: '0' }}>
              <div style={{ flex: 1, height: 0, borderTop: '1.5px dashed rgba(26,20,16,0.2)' }} />
              <span style={{ fontSize: 13, color: MUTED, padding: '0 8px', position: 'absolute', left: 14, background: CREAM }}>✂</span>
            </div>

            {/* Barcode */}
            <div style={{ padding: '12px 20px 14px', borderTop: '1.5px dashed rgba(26,20,16,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: '100%', height: 40, overflow: 'hidden' }}>
                <Barcode width={400} height={40} />
              </div>
              <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.2em' }}>SERIE · {resaNum} · {dt.short.replace(/\//g, '')} · SKY07-CBL</div>
            </div>
          </div>

          {/* Mode paiement (salle privée) */}
          {isPrivee && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12 }}>
                Mode de paiement de l'acompte
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: 'carte', label: 'Carte bancaire en ligne', sub: 'Payez maintenant via Stripe', icon: '💳' },
                  { id: 'especes', label: 'Espèces sur place', sub: 'À régler lors de votre arrivée', icon: '💵' },
                ].map(m => (
                  <label key={m.id} onClick={() => setMode(m.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: modePaiement === m.id ? 'rgba(200,49,42,0.08)' : 'rgba(245,240,232,0.02)',
                    border: `${modePaiement === m.id ? 2 : 1.5}px solid ${modePaiement === m.id ? RED : 'rgba(245,240,232,0.1)'}`,
                    borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: mono, fontSize: 10, color: CREAM, fontWeight: 700 }}>{m.label}</div>
                      <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, marginTop: 2 }}>{m.sub}</div>
                    </div>
                    {modePaiement === m.id && (
                      <div style={{ width: 16, height: 16, background: RED, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: 6, height: 4, borderLeft: '1.5px solid white', borderBottom: '1.5px solid white', transform: 'rotate(-45deg) translate(0.5px,-0.5px)' }} />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <div style={{ marginTop: 12, background: 'rgba(200,49,42,0.1)', border: '1px solid rgba(200,49,42,0.3)', borderRadius: 3, padding: '10px 14px', fontFamily: mono, fontSize: 9, color: '#ff6b6b', letterSpacing: '0.08em' }}>{error}</div>}

          {/* Confirm */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleSubmit} disabled={loading} style={{
              width: '100%', background: RED, color: 'white', border: 'none', borderRadius: 3,
              padding: 0, cursor: loading ? 'not-allowed' : 'pointer', overflow: 'hidden',
              boxShadow: '0 6px 24px rgba(200,49,42,0.4)', opacity: loading ? 0.7 : 1,
            }}>
              <PerfoRow bg="rgba(0,0,0,0.15)" dotBg="#2A2420" />
              <span style={{ display: 'block', fontFamily: bebas, fontSize: 22, letterSpacing: '0.25em', textAlign: 'center', padding: '10px 0 12px' }}>
                {loading ? 'CHARGEMENT…' : '✓ CONFIRMER LA RÉSERVATION'}
              </span>
            </button>
            <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center', letterSpacing: '0.1em' }}>
              RÉSERVATION · {resaNum} · {dt.time}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ÉCRAN 3 — PAIEMENT STRIPE
      ══════════════════════════════════════════════════════════════════════ */}
      {screen === 3 && (
        <div className="resa-slide" style={{ width: '100%', maxWidth: 480, minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
          <button onClick={() => goTo(2)} style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: 2, padding: '6px 12px', fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: '0.15em', marginBottom: 24 }}>
            ← Retour
          </button>

          <div style={{ fontFamily: mono, fontSize: 9, color: RED, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6 }}>Paiement en ligne</div>
          <div style={{ fontFamily: serif, fontSize: 28, color: CREAM, marginBottom: 4 }}>Salle Privée</div>
          <div style={{ fontFamily: bebas, fontSize: 40, color: RED, letterSpacing: '0.05em', marginBottom: 24 }}>500 DH</div>

          {/* Résumé */}
          <div style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: 3, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
              {[
                ['Client', nom],
                ['Date', date ? date.split('-').reverse().join('/') : '—'],
                ['Heure', heure],
                ['Couverts', couverts],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontFamily: mono, fontSize: 7.5, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontFamily: bebas, fontSize: 18, color: CREAM, letterSpacing: '0.05em', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ background: 'rgba(200,49,42,0.1)', border: '1px solid rgba(200,49,42,0.3)', borderRadius: 3, padding: '10px 14px', fontFamily: mono, fontSize: 9, color: '#ff6b6b', letterSpacing: '0.08em', marginBottom: 12 }}>{error}</div>}

          {stripePromise && clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripeForm
                clientSecret={clientSecret}
                resaId={resaId}
                onSuccess={handleStripeSuccess}
                onError={setError}
              />
            </Elements>
          ) : (
            <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, textAlign: 'center', padding: '20px 0' }}>
              Chargement du formulaire de paiement…
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ÉCRAN 4 — SUCCÈS
      ══════════════════════════════════════════════════════════════════════ */}
      {screen === 4 && (
        <div className="resa-fade" style={{ width: '100%', maxWidth: 480, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 28px', textAlign: 'center' }}>

          {/* Cercle succès */}
          <div style={{ width: 72, height: 72, border: `2.5px solid ${RED}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ width: 24, height: 16, borderLeft: '3px solid ' + RED, borderBottom: '3px solid ' + RED, transform: 'rotate(-45deg) translate(2px,-3px)' }} />
          </div>

          <div style={{ fontFamily: mono, fontSize: 9, color: RED, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
            Réservation confirmée
          </div>
          <div style={{ fontFamily: serif, fontSize: 36, color: CREAM, lineHeight: 1.1, marginBottom: 16 }}>
            À bientôt<br />chez SKY07
          </div>

          {codeAcces && (
            <div style={{ background: 'rgba(200,49,42,0.08)', border: `1px solid rgba(200,49,42,0.25)`, borderRadius: 3, padding: '14px 20px', marginBottom: 20 }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Code d'accès salle privée</div>
              <div style={{ fontFamily: bebas, fontSize: 26, color: RED, letterSpacing: '0.12em' }}>{codeAcces}</div>
              <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
                Présentez ce code à l'entrée pour accéder à votre salle
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: 3, padding: '14px 20px', width: '100%', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', textAlign: 'left' }}>
              {[
                ['Client', nom],
                ['Couverts', couverts],
                ['Date', date ? date.split('-').reverse().join('/') : '—'],
                ['Heure', heure],
                ['Zone', zoneLabel],
                ['Ref.', resaNum],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontFamily: mono, fontSize: 7.5, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontFamily: bebas, fontSize: 16, color: CREAM, letterSpacing: '0.04em', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, lineHeight: 1.8, letterSpacing: '0.08em', marginBottom: 24 }}>
            Nous vous contacterons pour confirmer.<br />
            Une confirmation par SMS sera envoyée.
          </div>

          {/* PDF Download button */}
          <button onClick={downloadTicketPDF} style={{
            width: '100%', background: RED, color: 'white', border: 'none', borderRadius: 3,
            padding: 0, cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 20px rgba(200,49,42,0.35)',
            marginBottom: 10,
          }}>
            <PerfoRow bg="rgba(0,0,0,0.15)" dotBg="#2A2420" />
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: bebas, fontSize: 20, letterSpacing: '0.2em', padding: '10px 0 12px' }}>
              ⬇ Télécharger mon ticket PDF
            </span>
          </button>

          <button onClick={reset} style={{ background: 'transparent', border: `1px solid rgba(245,240,232,0.15)`, color: 'rgba(245,240,232,0.5)', borderRadius: 2, padding: '10px 20px', fontFamily: mono, fontSize: 9, cursor: 'pointer', letterSpacing: '0.15em', width: '100%' }}>
            Nouvelle réservation
          </button>
        </div>
      )}
    </div>
  )
}
