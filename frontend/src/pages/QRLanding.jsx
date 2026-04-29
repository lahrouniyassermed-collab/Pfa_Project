import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getTableQR } from '../services/api'
import { UtensilsCrossed, Star, Camera, MessageCircle, MapPin } from 'lucide-react'

export default function QRLanding() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const tableId = params.get('table')

  const [table, setTable] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!tableId) { setTimeout(() => setVisible(true), 50); return }
    getTableQR(tableId)
      .then(r => setTable(r.data.table))
      .catch(() => {})
      .finally(() => setTimeout(() => setVisible(true), 50))
  }, [tableId])

  const emplacementLabel = table?.emplacement
    ? table.emplacement.charAt(0).toUpperCase() + table.emplacement.slice(1)
    : ''
  const tableLabel = table ? `Table ${table.numero} · ${emplacementLabel}` : '…'

  const btnBase = {
    width: '100%', height: '56px', borderRadius: '12px', border: 'none',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '10px', textDecoration: 'none', boxSizing: 'border-box',
    transition: 'all 0.2s ease', fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0a1408 0%, #111f0e 100%)',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(232,130,74,0.07) 0%, transparent 60%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
      opacity: visible ? 1 : 0, transition: 'opacity 0.45s ease',
    }}>

      {/* Logo */}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '56px', fontWeight: '800', color: '#e8824a',
        letterSpacing: '-1px', lineHeight: 1,
        textShadow: '0 0 32px rgba(232,130,74,0.5), 0 0 80px rgba(232,130,74,0.15)',
        marginBottom: '14px', userSelect: 'none',
      }}>SKY07</div>

      {/* Badge table */}
      {tableId && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: '100px', padding: '5px 14px',
          color: 'rgba(255,255,255,0.8)', fontSize: '13px',
          fontWeight: '500', marginBottom: '8px',
        }}>
          <MapPin size={13} strokeWidth={2} />
          {tableLabel}
        </div>
      )}

      <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '13px', marginBottom: '40px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Bienvenue chez SKY07
      </p>

      {/* Boutons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '380px' }}>

        <button
          onClick={() => navigate(`/commande/menu?table=${tableId}`)}
          style={{ ...btnBase, background: '#e8824a', color: '#000', boxShadow: '0 4px 24px rgba(232,130,74,0.38)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#d4703a'; e.currentTarget.style.transform = 'scale(1.02)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#e8824a'; e.currentTarget.style.transform = 'scale(1)' }}
        >
          <UtensilsCrossed size={18} strokeWidth={2.5} />
          <span>Voir le menu &amp; Commander</span>
        </button>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />

        <a href="/client/login" style={{ ...btnBase, background: 'transparent', color: '#e8824a', border: '1.5px solid rgba(232,130,74,0.5)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e8824a'; e.currentTarget.style.background = 'rgba(232,130,74,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,130,74,0.5)'; e.currentTarget.style.background = 'transparent' }}
        >
          <Star size={18} strokeWidth={2} />
          <span>Mon espace fidélité</span>
        </a>

        <a href="https://www.instagram.com/sky07restaurant" target="_blank" rel="noopener noreferrer"
          style={{ ...btnBase, background: 'transparent', color: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(255,255,255,0.18)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
        >
          <Camera size={18} strokeWidth={2} />
          <span>Instagram SKY07</span>
        </a>

        <a href="https://wa.me/212600000000" target="_blank" rel="noopener noreferrer"
          style={{ ...btnBase, background: '#25D366', color: '#fff', boxShadow: '0 4px 16px rgba(37,211,102,0.25)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1fba58'; e.currentTarget.style.transform = 'scale(1.02)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#25D366'; e.currentTarget.style.transform = 'scale(1)' }}
        >
          <MessageCircle size={18} strokeWidth={2} />
          <span>WhatsApp</span>
        </a>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textDecoration: 'none' }}>
          Landing page
        </a>
        <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: '11px', margin: 0 }}>
          © 2026 SKY07 — Tous droits réservés
        </p>
      </div>
    </div>
  )
}
