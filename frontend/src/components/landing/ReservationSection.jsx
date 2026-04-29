import { useState, useRef, useEffect } from 'react'
import { useScrollFade } from './useScrollFade'
import FloorPlan from './FloorPlan'

const ACCENT = '#e8824a'
const heures = ['12h00', '13h00', '19h00', '20h00', '21h00']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAY_NAMES = ['D','L','M','M','J','V','S']
const ZONE_LABELS = { interieur: 'Intérieur', terrasse: 'Terrasse', mezzanine: 'Mezzanine' }

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function formatDisplay(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][dt.getDay()]} ${d} ${MONTHS[m-1]} ${y}`
}
function formatShort(s) {
  if (!s) return '—'
  const [y, m, d] = s.split('-').map(Number)
  return `${d} ${['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'][m-1]} ${y}`
}

/* ── DatePicker ── */
function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const today = new Date(); today.setHours(0,0,0,0)
  const todayStr = toDateStr(today)
  const [view, setView] = useState(() => {
    if (value) { const [y,m] = value.split('-'); return new Date(+y, +m-1, 1) }
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const y = view.getFullYear(), m = view.getMonth()
  const daysInMonth = new Date(y, m+1, 0).getDate()
  const firstDay = new Date(y, m, 1).getDay()
  const cells = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i+1)]

  return (
    <div className="relative" ref={ref} style={{ minWidth: 190 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2"
        style={{
          background: 'transparent',
          borderBottom: `1px solid ${open ? ACCENT : 'rgba(232,130,74,0.25)'}`,
          color: value ? '#f5f0e8' : 'rgba(245,240,232,0.3)',
          fontFamily: "'Inter',sans-serif",
          fontSize: 13,
          padding: '6px 0',
          transition: 'border-color 0.2s',
        }}
      >
        <span>{value ? formatDisplay(value) : 'Choisir une date'}</span>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={ACCENT} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-64 p-4"
          style={{ background: '#0f1a0c', border: `1px solid rgba(232,130,74,0.2)`, boxShadow: '0 20px 60px rgba(0,0,0,0.75)', borderRadius: 8 }}>
          <div className="flex items-center justify-between mb-3">
            {[[-1,'M15 19l-7-7 7-7'],[1,'M9 5l7 7-7 7']].map(([dir, path]) => (
              <button key={dir} type="button" onClick={() => setView(new Date(y, m+dir, 1))}
                className="w-7 h-7 flex items-center justify-center"
                style={{ color: 'rgba(232,130,74,0.5)' }}
                onMouseEnter={e => e.currentTarget.style.color=ACCENT}
                onMouseLeave={e => e.currentTarget.style.color='rgba(232,130,74,0.5)'}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
                </svg>
              </button>
            ))}
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:11, fontFamily:"'Inter',sans-serif", letterSpacing:1 }}>
              {MONTHS[m]} {y}
            </span>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d,i) => (
              <div key={i} className="text-center py-1" style={{ color:'rgba(232,130,74,0.4)', fontSize:10, fontFamily:"'Inter',sans-serif" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const ds = toDateStr(new Date(y, m, day))
              const isPast = ds < todayStr
              const isSel = ds === value
              const isToday = ds === todayStr
              return (
                <button key={i} type="button" disabled={isPast}
                  onClick={() => { if (!isPast) { onChange(toDateStr(new Date(y,m,day))); setOpen(false) } }}
                  className="w-8 h-8 mx-auto flex items-center justify-center text-xs rounded-full transition-all duration-150"
                  style={{
                    background: isSel ? ACCENT : isToday ? 'rgba(232,130,74,0.15)' : 'transparent',
                    color: isSel ? '#0a1408' : isPast ? 'rgba(255,255,255,0.12)' : 'rgba(245,240,232,0.75)',
                    cursor: isPast ? 'default' : 'pointer',
                    fontFamily: "'Inter',sans-serif",
                  }}
                  onMouseEnter={e => { if (!isPast && !isSel) e.currentTarget.style.background='rgba(232,130,74,0.15)' }}
                  onMouseLeave={e => { if (!isPast && !isSel) e.currentTarget.style.background='transparent' }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Info Card (droite du plan) ── */
function TableInfoCard({ table, date, heure, personnes }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setShowForm(false)
    setSubmitted(false)
    setLoading(false)
    setForm({ nom: '', prenom: '', telephone: '' })
  }, [table?.id])

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setSubmitted(true) }, 1000)
  }

  const inputStyle = {
    width: '100%', background: 'transparent', color: '#f5f0e8',
    padding: '10px 0', fontSize: 13, outline: 'none',
    fontFamily: "'Inter',sans-serif",
    borderBottom: '1px solid rgba(232,130,74,0.22)',
    transition: 'border-color 0.2s',
  }

  const cardBase = {
    background: 'rgba(10,15,10,0.92)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(232,130,74,0.4)',
    borderRadius: 16,
    padding: '28px 24px',
    minHeight: 300,
  }

  /* ── État vide ── */
  if (!table) return (
    <div className="flex flex-col items-center justify-center text-center"
      style={{ ...cardBase, minHeight: 320 }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 opacity-20">
        <path d="M3 10h18M3 14h18M10 3v18M14 3v18" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      <p style={{ color: 'rgba(232,130,74,0.5)', fontSize: 11, letterSpacing: '0.3em', fontFamily: "'Inter',sans-serif", textTransform: 'uppercase', marginBottom: 8 }}>
        Plan interactif
      </p>
      <p style={{ color: 'rgba(245,240,232,0.25)', fontSize: 12, fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>
        Cliquez sur une table<br />disponible pour la réserver
      </p>
    </div>
  )

  /* ── Succès ── */
  if (submitted) return (
    <div style={cardBase} className="flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 flex items-center justify-center mx-auto mb-5"
        style={{ background: 'rgba(232,130,74,0.08)', border: `1px solid rgba(232,130,74,0.3)`, borderRadius: 12, animation: 'scaleIn 0.4s ease both' }}>
        <svg width="28" height="28" fill="none" stroke={ACCENT} strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.35rem', color: '#f5f0e8', fontWeight: 300, marginBottom: 10 }}>
        Demande envoyée !
      </p>
      <p style={{ color: 'rgba(245,240,232,0.42)', fontSize: 12, fontFamily: "'Inter',sans-serif", lineHeight: 1.7, marginBottom: 20 }}>
        Table <span style={{ color: ACCENT }}>T{table.numero}</span> · {ZONE_LABELS[table.emplacement]}<br />
        {formatShort(date)} à {heure} · {personnes} pers.
      </p>
      <button
        onClick={() => { setSubmitted(false); setShowForm(false) }}
        style={{ border: '1px solid rgba(232,130,74,0.25)', color: 'rgba(245,240,232,0.45)', background: 'transparent', padding: '8px 24px', fontSize: 10, letterSpacing: '0.25em', fontFamily: "'Inter',sans-serif", textTransform: 'uppercase', borderRadius: 6, cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor=ACCENT; e.currentTarget.style.color=ACCENT }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(232,130,74,0.25)'; e.currentTarget.style.color='rgba(245,240,232,0.45)' }}
      >
        Nouvelle réservation
      </button>
      <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(0.6)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )

  /* ── Fiche table + formulaire inline ── */
  return (
    <div style={{ ...cardBase, animation: 'cardIn 0.28s ease both' }}>
      {/* Numéro de table */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p style={{ color: 'rgba(232,130,74,0.55)', fontSize: 10, letterSpacing: '0.32em', fontFamily: "'Inter',sans-serif", textTransform: 'uppercase', marginBottom: 2 }}>
            Table sélectionnée
          </p>
          <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '3rem', lineHeight: 1, color: ACCENT, fontWeight: 300 }}>
            T{table.numero}
          </span>
        </div>
        {/* Badge disponible */}
        <span style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: 10, padding: '4px 10px', borderRadius: 20, fontFamily: "'Inter',sans-serif", letterSpacing: '0.1em', marginTop: 4 }}>
          ● Disponible
        </span>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-4"
        style={{ borderBottom: '1px solid rgba(232,130,74,0.1)' }}>
        {[
          ['Zone',     ZONE_LABELS[table.emplacement]],
          ['Capacité', `${table.capacite} personnes`],
          ['Date',     formatShort(date)],
          ['Heure',    heure || '—'],
        ].map(([lbl, val]) => (
          <div key={lbl}>
            <p style={{ color: 'rgba(245,240,232,0.32)', fontSize: 10, fontFamily: "'Inter',sans-serif", marginBottom: 2 }}>{lbl}</p>
            <p style={{ color: '#f5f0e8', fontSize: 13, fontFamily: "'Inter',sans-serif" }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Formulaire inline ou bouton */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3.5 text-xs tracking-widest uppercase font-semibold transition-all duration-300"
          style={{ background: ACCENT, color: '#0a1408', borderRadius: 8, fontFamily: "'Inter',sans-serif", cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.transform='scale(1.02)'; e.currentTarget.style.boxShadow=`0 0 28px rgba(232,130,74,0.4)` }}
          onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none' }}
        >
          Réserver cette table
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ animation: 'formIn 0.22s ease both' }}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[['prenom','Prénom'],['nom','Nom']].map(([field, label]) => (
              <div key={field}>
                <label style={{ display:'block', color:'rgba(232,130,74,0.55)', fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', fontFamily:"'Inter',sans-serif", marginBottom:4 }}>{label}</label>
                <input required type="text" value={form[field]}
                  onChange={e => setForm({...form,[field]:e.target.value})}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor=ACCENT}
                  onBlur={e => e.target.style.borderColor='rgba(232,130,74,0.22)'}
                />
              </div>
            ))}
          </div>
          <div className="mb-5">
            <label style={{ display:'block', color:'rgba(232,130,74,0.55)', fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', fontFamily:"'Inter',sans-serif", marginBottom:4 }}>Téléphone</label>
            <input required type="tel" value={form.telephone}
              onChange={e => setForm({...form,telephone:e.target.value})}
              placeholder="+212 6 00 00 00 00"
              style={{ ...inputStyle, color: form.telephone ? '#f5f0e8' : 'rgba(245,240,232,0.3)' }}
              onFocus={e => { e.target.style.borderColor=ACCENT; e.target.style.color='#f5f0e8' }}
              onBlur={e => e.target.style.borderColor='rgba(232,130,74,0.22)'}
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 text-xs tracking-widest uppercase font-semibold transition-all duration-300"
            style={{ background: ACCENT, color: '#0a1408', borderRadius: 8, fontFamily: "'Inter',sans-serif", cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.8 : 1 }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow=`0 0 28px rgba(232,130,74,0.4)` }}
            onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Envoi en cours…
              </span>
            ) : 'Confirmer la réservation'}
          </button>
        </form>
      )}

      <style>{`
        @keyframes cardIn  { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes formIn  { from{opacity:0;transform:translateY(6px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.6)}       to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  )
}

/* ── Section principale ── */
export default function ReservationSection() {
  const ref = useScrollFade()
  const today = new Date(); today.setHours(0,0,0,0)
  const [date, setDate]           = useState(toDateStr(today))
  const [heure, setHeure]         = useState('20h00')
  const [personnes, setPersonnes] = useState(2)
  const [selectedTable, setSelectedTable] = useState(null)

  const labelStyle = {
    color: 'rgba(232,130,74,0.55)',
    fontFamily: "'Inter',sans-serif",
    fontSize: '0.62rem',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 8,
  }
  const divider = { width: 1, alignSelf: 'stretch', background: 'rgba(232,130,74,0.1)', margin: '0 4px', flexShrink: 0 }

  return (
    <section id="reservation" className="py-28 px-6 relative overflow-hidden"
      style={{ background: '#0f1f0c' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(232,130,74,0.04) 0%, transparent 70%)' }} />

      <div ref={ref} className="max-w-6xl mx-auto relative opacity-0 translate-y-8 transition-all duration-700" style={{ zIndex: 1 }}>

        {/* Header */}
        <div className="text-center mb-12">
          <p style={{ color: ACCENT, fontFamily: "'Inter',sans-serif", fontSize: '0.65rem', letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: 18 }}>
            Réservation en ligne
          </p>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(2.2rem,5vw,3.4rem)', fontWeight: 400, color: '#fff', marginBottom: 16 }}>
            Choisissez votre table
          </h2>
          <div className="flex items-center justify-center gap-3 mx-auto mb-4" style={{ maxWidth: 160 }}>
            <div className="h-px flex-1" style={{ background: `linear-gradient(to right,transparent,${ACCENT})` }} />
            <div className="w-1 h-1 rotate-45" style={{ background: ACCENT, opacity: 0.5 }} />
            <div className="h-px flex-1" style={{ background: `linear-gradient(to left,transparent,${ACCENT})` }} />
          </div>
          <p style={{ color: 'rgba(245,240,232,0.3)', fontSize: 12, fontFamily: "'Inter',sans-serif" }}>
            Filtrez · cliquez sur une table disponible · réservez en quelques secondes
          </p>
        </div>

        {/* ── Barre de filtres horizontale ── */}
        <div className="flex flex-wrap items-end gap-5 mb-8 px-6 py-5"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(232,130,74,0.12)',
            backdropFilter: 'blur(20px)',
            borderRadius: 12,
          }}>

          {/* Date */}
          <div style={{ flex: '1 1 190px', minWidth: 190 }}>
            <span style={labelStyle}>Date</span>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div style={divider} />

          {/* Heure */}
          <div style={{ flex: '1 1 240px' }}>
            <span style={labelStyle}>Heure</span>
            <div className="flex flex-wrap gap-2">
              {heures.map((h) => (
                <button key={h} type="button" onClick={() => setHeure(h)}
                  className="py-1.5 px-3 text-xs tracking-wider transition-all duration-200"
                  style={{
                    border: `1px solid ${heure===h ? ACCENT : 'rgba(232,130,74,0.18)'}`,
                    background: heure===h ? 'rgba(232,130,74,0.14)' : 'transparent',
                    color: heure===h ? ACCENT : 'rgba(245,240,232,0.38)',
                    borderRadius: 6,
                    fontFamily: "'Inter',sans-serif",
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if(heure!==h){ e.currentTarget.style.borderColor=ACCENT; e.currentTarget.style.color=ACCENT }}}
                  onMouseLeave={e => { if(heure!==h){ e.currentTarget.style.borderColor='rgba(232,130,74,0.18)'; e.currentTarget.style.color='rgba(245,240,232,0.38)' }}}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div style={divider} />

          {/* Personnes */}
          <div style={{ flex: '0 0 auto' }}>
            <span style={labelStyle}>Personnes</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setPersonnes(p => Math.max(1,p-1))}
                className="w-8 h-8 flex items-center justify-center text-lg font-light transition-all duration-200"
                style={{ border:`1px solid rgba(232,130,74,0.3)`, borderRadius:'50%', color:ACCENT, background:'transparent', cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(232,130,74,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                −
              </button>
              <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'1.6rem', color:'#f5f0e8', fontWeight:300, minWidth:24, textAlign:'center' }}>
                {personnes}
              </span>
              <button type="button" onClick={() => setPersonnes(p => Math.min(12,p+1))}
                className="w-8 h-8 flex items-center justify-center text-lg font-light transition-all duration-200"
                style={{ border:`1px solid rgba(232,130,74,0.3)`, borderRadius:'50%', color:ACCENT, background:'transparent', cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(232,130,74,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                +
              </button>
              <span style={{ color:'rgba(245,240,232,0.3)', fontSize:11, fontFamily:"'Inter',sans-serif" }}>pers.</span>
            </div>
          </div>

          {/* Indicateur disponibilité */}
          <div className="flex items-center gap-2 ml-auto px-3 py-2"
            style={{
              border: `1px solid ${date && heure ? 'rgba(74,222,128,0.22)' : 'rgba(255,255,255,0.05)'}`,
              background: date && heure ? 'rgba(74,222,128,0.05)' : 'transparent',
              borderRadius: 8,
              flexShrink: 0,
            }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: date && heure ? '#4ade80' : '#333', boxShadow: date && heure ? '0 0 8px rgba(74,222,128,0.6)' : 'none' }} />
            <p style={{ color: date && heure ? 'rgba(134,239,172,0.85)' : 'rgba(245,240,232,0.22)', fontSize: 11, fontFamily: "'Inter',sans-serif", whiteSpace:'nowrap' }}>
              {date && heure ? `Disponible · ${personnes} pers.` : 'Sélectionnez'}
            </p>
          </div>
        </div>

        {/* ── Plan + Card ── */}
        <div className="grid lg:grid-cols-[1fr_296px] gap-6 items-start">
          <FloorPlan
            onTableClick={setSelectedTable}
            selectedTableId={selectedTable?.id}
          />
          <TableInfoCard
            table={selectedTable}
            date={date}
            heure={heure}
            personnes={personnes}
          />
        </div>
      </div>
    </section>
  )
}
