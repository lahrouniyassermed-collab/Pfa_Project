import { X, Leaf, Wheat } from 'lucide-react'

const ALLERGENES_ICONS = {
  gluten: '🌾', lactose: '🥛', noix: '🥜', oeuf: '🥚',
  soja: '🫘', poisson: '🐟', crustaces: '🦐', sesame: '🌰',
}

function Row({ label, value, bold, sub, separator }) {
  return (
    <>
      {separator && <div style={{ borderTop: '6px solid #1A1A1A', margin: 0 }} />}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        padding: sub ? '2px 8px 2px 20px' : '3px 8px',
        borderTop: separator ? 'none' : '1px solid #1A1A1A',
        backgroundColor: bold ? 'rgba(0,0,0,0.04)' : 'white',
      }}>
        <span style={{
          fontSize: sub ? 12 : bold ? 14 : 13,
          fontWeight: bold ? 700 : 400,
          color: '#1A1A1A',
          fontFamily: 'Arial, sans-serif',
        }}>{label}</span>
        <span style={{
          fontSize: bold ? 14 : 13,
          fontWeight: bold ? 700 : 600,
          color: '#1A1A1A',
          fontFamily: 'Arial, sans-serif',
          whiteSpace: 'nowrap',
          marginLeft: 12,
        }}>{value}</span>
      </div>
    </>
  )
}

export default function NutritionModal({ plat, onClose }) {
  const n = plat.nutrition
  if (!n) return null

  const allergenes = (plat.allergenes || '').split(',').map(a => a.trim()).filter(Boolean)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '0 0' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', width: '100%', maxWidth: 440, borderRadius: '20px 20px 0 0', overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 2 }}>
              Valeurs nutritionnelles
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{plat.nom}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 20px 24px' }}>
          {/* Badges */}
          {(plat.vegetarien || plat.sans_gluten) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {plat.vegetarien && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                  <Leaf size={12} /> Végétarien
                </span>
              )}
              {plat.sans_gluten && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                  <Wheat size={12} /> Sans gluten
                </span>
              )}
            </div>
          )}

          {/* Nutrition Facts Panel */}
          <div style={{ border: '2px solid #1A1A1A', borderRadius: 4, overflow: 'hidden' }}>
            {/* Title */}
            <div style={{ background: '#1A1A1A', padding: '8px 10px 6px' }}>
              <div style={{ color: 'white', fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', fontFamily: 'Arial Black, Arial, sans-serif', lineHeight: 1 }}>
                Nutrition Facts
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2, fontFamily: 'Arial, sans-serif' }}>
                Pour {n.taille_portion || 100}g / portion
              </div>
            </div>

            {/* Calories — big */}
            <div style={{ borderTop: '8px solid #1A1A1A', borderBottom: '4px solid #1A1A1A', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>Calories</span>
              <span style={{ fontSize: 36, fontWeight: 900, fontFamily: 'Arial Black, Arial, sans-serif', color: '#1A1A1A', lineHeight: 1 }}>
                {Math.round(n.calories || 0)}
              </span>
            </div>

            {/* Sub-header */}
            <div style={{ padding: '2px 8px', borderBottom: '1px solid #1A1A1A', textAlign: 'right' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#1A1A1A', fontFamily: 'Arial, sans-serif', letterSpacing: '0.03em' }}>
                QUANTITÉ PAR PORTION
              </span>
            </div>

            {/* Rows */}
            <Row label="Matières grasses" value={`${+(n.lipides || 0).toFixed(1)} g`} bold separator />
            <Row label="dont Acides gras saturés" value="—" sub />
            <Row label="Glucides" value={`${+(n.glucides || 0).toFixed(1)} g`} bold separator />
            <Row label="dont Sucres" value={`${+(n.sucre || 0).toFixed(1)} g`} sub />
            <Row label="Fibres alimentaires" value={`${+(n.fibres || 0).toFixed(1)} g`} bold separator />
            <Row label="Protéines" value={`${+(n.proteines || 0).toFixed(1)} g`} bold separator />
            <Row label="Sodium" value={`${+(n.sodium || 0).toFixed(0)} mg`} bold separator />
          </div>

          {/* Daily value note */}
          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8, lineHeight: 1.5, fontFamily: 'Arial, sans-serif' }}>
            * Les valeurs journalières de référence sont basées sur un régime de 2 000 kcal par jour.
          </p>

          {/* Allergènes */}
          {allergenes.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                Allergènes
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allergenes.map(a => (
                  <span key={a} style={{ fontSize: 12, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', padding: '3px 10px', borderRadius: 20 }}>
                    {ALLERGENES_ICONS[a] || '⚠'} {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
