import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getTableQR } from '../services/api'
import { UtensilsCrossed, Star, Camera, MessageCircle, MapPin, Sun, Moon } from 'lucide-react'

const LANGS = {
  fr: {
    tagline: 'Restaurant & Lounge Marocain',
    bienvenue: 'Bienvenue',
    commander: 'Voir le menu & Commander',
    fidelite: 'Mon espace fidélité',
    ou: 'ou',
    whatsapp: 'Contacter sur WhatsApp',
    footer: '© 2026 SKY07 — Tous droits réservés',
    table: (n, e) => `Table ${n} · ${e}`,
    dir: 'ltr',
    emplacements: { interieur: 'Intérieur', terrasse: 'Terrasse', mezzanine: 'Mezzanine' },
  },
  en: {
    tagline: 'Moroccan Restaurant & Lounge',
    bienvenue: 'Welcome',
    commander: 'View Menu & Order',
    fidelite: 'My Loyalty Space',
    ou: 'or',
    whatsapp: 'Contact on WhatsApp',
    footer: '© 2026 SKY07 — All rights reserved',
    table: (n, e) => `Table ${n} · ${e}`,
    dir: 'ltr',
    emplacements: { interieur: 'Indoor', terrasse: 'Terrace', mezzanine: 'Mezzanine' },
  },
  ar: {
    tagline: 'مطعم وصالون مغربي',
    bienvenue: 'أهلاً وسهلاً',
    commander: 'عرض القائمة والطلب',
    fidelite: 'برنامج الولاء',
    ou: 'أو',
    whatsapp: 'تواصل عبر واتساب',
    footer: '© 2026 SKY07 — جميع الحقوق محفوظة',
    table: (n, e) => `طاولة ${n} · ${e}`,
    dir: 'rtl',
    emplacements: { interieur: 'داخلي', terrasse: 'تراس', mezzanine: 'ميزانين' },
  },
}

export default function QRLanding() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const tableId   = params.get('table_id') || params.get('table')

  const [table,   setTable]   = useState(null)
  const [visible, setVisible] = useState(false)
  const [lang,    setLang]    = useState(() => localStorage.getItem('sky07_lang') || 'fr')
  const [dark,    setDark]    = useState(true)

  useEffect(() => {
    if (!tableId) { setTimeout(() => setVisible(true), 50); return }
    getTableQR(tableId)
      .then(r => setTable(r.data.table))
      .catch(() => {})
      .finally(() => setTimeout(() => setVisible(true), 50))
  }, [tableId])

  const t = LANGS[lang]
  const empl = table?.emplacement ? (t.emplacements[table.emplacement] || table.emplacement) : ''
  const tableLabel = table ? t.table(table.numero, empl) : '…'

  // Couleurs selon mode
  const BG      = dark ? '#0a1408'           : '#faf7f2'
  const BG2     = dark ? 'rgba(232,130,74,0.10)' : 'rgba(232,130,74,0.08)'
  const ACCENT  = '#e8824a'
  const TEXT    = dark ? 'rgba(245,240,232,0.9)'  : '#1a1208'
  const MUTED   = dark ? 'rgba(245,240,232,0.35)' : 'rgba(26,18,8,0.45)'
  const MUTED2  = dark ? 'rgba(245,240,232,0.12)' : 'rgba(26,18,8,0.1)'
  const BORDER  = dark ? 'rgba(232,130,74,0.25)'  : 'rgba(232,130,74,0.35)'
  const CTRL_BG = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'

  return (
    <div
      dir={t.dir}
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative', overflow: 'hidden',
        background: BG,
        opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease, background 0.3s ease',
        fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : "'Playfair Display', serif",
      }}
    >
      {/* Glow blobs */}
      <div style={{
        position: 'absolute', width: 480, height: 480, borderRadius: '50%', pointerEvents: 'none',
        background: dark ? 'radial-gradient(circle, rgba(232,130,74,0.10) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(232,130,74,0.08) 0%, transparent 70%)',
        top: -80, left: '50%', transform: 'translateX(-50%)',
      }} />

      {/* ── Barre langue + mode ── */}
      <div style={{
        position: 'absolute', top: 16,
        left: t.dir === 'rtl' ? 'auto' : 16,
        right: t.dir === 'rtl' ? 16 : 'auto',
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        {/* Toggle dark/light */}
        <button onClick={() => setDark(d => !d)} style={{
          background: CTRL_BG, border: `1px solid ${MUTED2}`,
          borderRadius: 20, padding: '5px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, color: MUTED,
          fontSize: 12, transition: 'all 0.2s',
        }}>
          {dark ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* Langue switcher */}
        {['fr', 'en', 'ar'].map(l => (
          <button key={l} onClick={() => { setLang(l); localStorage.setItem('sky07_lang', l) }} style={{
            background: lang === l ? ACCENT : CTRL_BG,
            border: `1px solid ${lang === l ? ACCENT : MUTED2}`,
            borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
            color: lang === l ? '#fff' : MUTED,
            fontSize: 11, fontWeight: lang === l ? 700 : 400,
            fontFamily: 'sans-serif', letterSpacing: '0.05em',
            transition: 'all 0.2s',
          }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Ornement ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ height: 1, width: 48, background: `linear-gradient(to ${t.dir === 'rtl' ? 'left' : 'right'}, transparent, rgba(232,130,74,0.4))` }} />
        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i===1 ? ACCENT : 'rgba(232,130,74,0.3)' }} />)}
        <div style={{ height: 1, width: 48, background: `linear-gradient(to ${t.dir === 'rtl' ? 'right' : 'left'}, transparent, rgba(232,130,74,0.4))` }} />
      </div>

      {/* ── Logo ── */}
      <div style={{
        fontSize: 'clamp(56px,14vw,80px)', fontWeight: 800,
        color: ACCENT, letterSpacing: '-1px', lineHeight: 1, marginBottom: 12,
        textShadow: dark ? '0 0 40px rgba(232,130,74,0.45)' : '0 0 20px rgba(232,130,74,0.2)',
        userSelect: 'none',
      }}>
        SKY07
      </div>

      {/* ── Tagline ── */}
      <p style={{
        fontStyle: 'italic', fontSize: 15, color: MUTED,
        letterSpacing: '0.04em', marginBottom: 20, textAlign: 'center',
        fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : "'Playfair Display', serif",
      }}>
        {t.tagline}
      </p>

      {/* ── Badge table ── */}
      {tableId && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28,
          padding: '8px 20px', borderRadius: 999,
          background: BG2, border: `1px solid ${BORDER}`,
        }}>
          <MapPin size={13} color={ACCENT} />
          <span style={{ color: ACCENT, fontSize: 14, fontWeight: 600, fontFamily: 'sans-serif' }}>
            {tableLabel}
          </span>
        </div>
      )}

      {/* ── Séparateur Bienvenue ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, width: '100%', maxWidth: 360 }}>
        <div style={{ flex: 1, height: 1, background: MUTED2 }} />
        <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, fontFamily: 'sans-serif' }}>
          {t.bienvenue}
        </span>
        <div style={{ flex: 1, height: 1, background: MUTED2 }} />
      </div>

      {/* ── Boutons ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 360 }}>

        {/* Commander */}
        <button
          onClick={() => navigate(`/commande/menu?table=${tableId}`)}
          style={{
            height: 58, width: '100%', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: ACCENT, color: '#0a1408',
            boxShadow: '0 6px 28px rgba(232,130,74,0.4)',
            fontSize: 15, fontWeight: 700, letterSpacing: '0.03em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : 'inherit',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#d4703a'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <UtensilsCrossed size={19} />
          {t.commander}
        </button>

        {/* Fidélité */}
        <a href="/client/login" style={{
          height: 52, width: '100%', borderRadius: 16,
          background: 'transparent', color: ACCENT,
          border: `1.5px solid ${BORDER}`, textDecoration: 'none',
          fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : 'inherit',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,130,74,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <Star size={17} />
          {t.fidelite}
        </a>

        {/* Séparateur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: MUTED2 }} />
          <span style={{ fontSize: 11, color: MUTED, fontFamily: 'sans-serif' }}>{t.ou}</span>
          <div style={{ flex: 1, height: 1, background: MUTED2 }} />
        </div>

        {/* Instagram */}
        <a href="https://www.instagram.com/sky07restaurant" target="_blank" rel="noopener noreferrer" style={{
          height: 48, width: '100%', borderRadius: 16,
          background: 'transparent', color: MUTED,
          border: `1px solid ${MUTED2}`, textDecoration: 'none',
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = MUTED; e.currentTarget.style.color = TEXT }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = MUTED2; e.currentTarget.style.color = MUTED }}
        >
          <Camera size={16} />
          @sky07restaurant
        </a>

        {/* WhatsApp */}
        <a href="https://wa.me/212530450523" target="_blank" rel="noopener noreferrer" style={{
          height: 48, width: '100%', borderRadius: 16,
          background: '#25D366', color: '#fff',
          boxShadow: '0 4px 18px rgba(37,211,102,0.22)',
          textDecoration: 'none', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: lang === 'ar' ? "'Noto Sans Arabic', sans-serif" : 'inherit',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1fba58'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#25D366'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <MessageCircle size={16} />
          {t.whatsapp}
        </a>
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ height: 1, width: 32, background: MUTED2 }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(232,130,74,0.3)' }} />
          <div style={{ height: 1, width: 32, background: MUTED2 }} />
        </div>
        <p style={{ fontSize: 11, color: MUTED2, letterSpacing: '0.06em', fontFamily: 'sans-serif', textAlign: 'center' }}>
          {t.footer}
        </p>
      </div>
    </div>
  )
}
