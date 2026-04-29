import { useState } from 'react'
import { tables } from '../../data/mockData'

const ACCENT = '#e8824a'
const PCT = { libre: '#8b6914', occupee: '#3d1010', reservee: '#3d2a00' }
const CCT = { libre: '#5a4010', occupee: '#2a0a0a', reservee: '#2a1a00' }
const DOT = { occupee: '#ef4444', reservee: '#f59e0b' }

const plateauR = (cap) => ({ 2: 16, 4: 19, 6: 22, 8: 25 }[cap] ?? 19)

function getChairs(n, r) {
  const dist = r + 9
  return Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2
    return { x: +(Math.cos(a) * dist).toFixed(1), y: +(Math.sin(a) * dist).toFixed(1) }
  })
}

function Plant({ x, y }) {
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI * 2) / 6
        return (
          <ellipse key={i}
            cx={x + +(Math.cos(a) * 9).toFixed(1)}
            cy={y + +(Math.sin(a) * 9).toFixed(1)}
            rx={5} ry={3.5} fill="#2d5a27" opacity={0.82}
          />
        )
      })}
      <circle cx={x} cy={y} r={7} fill="#254e22" />
    </g>
  )
}

/* Symbole escalier top-down */
function Stairs({ x, y }) {
  return (
    <g opacity={0.7}>
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i}
          x={x + i * 4} y={y + i * 4}
          width={20 - i * 4} height={3} rx="0.5"
          fill="none"
          stroke="rgba(200,155,55,0.55)"
          strokeWidth="0.8"
        />
      ))}
      <text x={x + 10} y={y + 32}
        textAnchor="middle"
        fill="rgba(200,155,55,0.4)"
        fontSize="5" letterSpacing="1"
        fontFamily="'Inter',sans-serif"
        style={{ userSelect: 'none' }}>
        ESC.
      </text>
    </g>
  )
}

export default function FloorPlan({ onTableClick, selectedTableId }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="w-full" style={{ borderRadius: 16 }}>
      <svg
        viewBox="0 0 680 460"
        className="w-full block"
        style={{
          borderRadius: 16,
          background: '#0f0f0f',
          border: '1px solid rgba(232,130,74,0.07)',
        }}
        onClick={() => onTableClick?.(null)}
      >
        <defs>
          <pattern id="pk" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <line x1="0" y1="28" x2="28" y2="0" stroke="rgba(139,105,20,0.055)" strokeWidth="1" />
          </pattern>
          <filter id="oglow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="sglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Fond + parquet */}
        <rect width="680" height="460" fill="#0f0f0f" rx="14" />
        <rect width="680" height="460" fill="url(#pk)" rx="14" />

        {/* ── ZONE INTÉRIEUR ── */}
        <path
          d="M 45,24 C 100,14 235,12 295,24 C 316,32 318,60 316,135 C 314,212 320,285 308,312 C 296,326 175,330 75,322 C 38,316 20,296 18,263 C 14,200 16,82 45,24 Z"
          fill="#1e3a2f" stroke="rgba(50,100,65,0.4)" strokeWidth="1"
        />
        <text x="170" y="38" textAnchor="middle"
          fill="rgba(100,200,130,0.32)" fontSize="7" letterSpacing="5"
          fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>
          INTÉRIEUR
        </text>

        {/* ── ZONE TERRASSE ── */}
        <path
          d="M 334,24 C 382,12 558,12 622,24 C 646,32 658,60 656,145 C 654,238 650,293 628,310 C 606,320 488,327 388,319 C 350,312 326,295 324,260 C 320,198 324,52 334,24 Z"
          fill="#2d1f0e" stroke="rgba(100,65,20,0.4)" strokeWidth="1"
        />
        <text x="492" y="38" textAnchor="middle"
          fill="rgba(180,130,60,0.32)" fontSize="7" letterSpacing="5"
          fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>
          TERRASSE
        </text>

        {/* ── ZONE MEZZANINE ── */}
        <path
          d="M 22,338 C 52,328 185,324 340,326 C 495,328 626,329 658,338 C 668,344 670,366 666,408 C 662,434 638,444 598,445 C 448,447 200,447 80,445 C 42,444 16,432 14,408 C 10,384 12,344 22,338 Z"
          fill="#1a1428" stroke="rgba(85,55,130,0.4)" strokeWidth="1"
        />
        <text x="340" y="352" textAnchor="middle"
          fill="rgba(140,100,200,0.32)" fontSize="7" letterSpacing="5"
          fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>
          MEZZANINE
        </text>

        {/* Cloison intérieur / terrasse */}
        <line x1="320" y1="26" x2="320" y2="316"
          stroke="#2a2015" strokeWidth="5" strokeLinecap="round" />

        {/* ─────────────────────────────────────────── */}
        {/* DÉCORATIONS                                 */}
        {/* ─────────────────────────────────────────── */}

        {/* Cuisine (intérieur, haut) */}
        <rect x="56" y="26" width="54" height="14" rx="3"
          fill="#152e20" stroke="rgba(50,130,70,0.45)" strokeWidth="0.8" />
        <text x="83" y="37" textAnchor="middle"
          fill="rgba(80,180,100,0.55)" fontSize="5.5" letterSpacing="1.5"
          fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>
          CUISINE
        </text>

        {/* Bar / comptoir (intérieur, milieu-droit) */}
        <rect x="240" y="200" width="62" height="24" rx="6"
          fill="#1a0f05" stroke="#8b6914" strokeWidth="0.9" />
        <text x="271" y="216" textAnchor="middle"
          fill="rgba(139,105,20,0.62)" fontSize="6.5" letterSpacing="2.5"
          fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>
          BAR
        </text>

        {/* Accueil / Réception (intérieur, bas) */}
        <rect x="224" y="292" width="66" height="14" rx="3"
          fill="#1a0f05" stroke="rgba(139,105,20,0.38)" strokeWidth="0.8" />
        <text x="257" y="303" textAnchor="middle"
          fill="rgba(139,105,20,0.52)" fontSize="5.5" letterSpacing="1"
          fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>
          ACCUEIL
        </text>

        {/* WC — Toilettes (terrasse, bas-droite) */}
        <rect x="600" y="268" width="46" height="30" rx="4"
          fill="#1a1205" stroke="rgba(100,70,22,0.48)" strokeWidth="0.8" />
        <line x1="623" y1="268" x2="623" y2="298"
          stroke="rgba(100,70,22,0.38)" strokeWidth="0.6" />
        <text x="611" y="283" textAnchor="middle"
          fill="rgba(160,115,52,0.58)" fontSize="6"
          fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>H</text>
        <text x="635" y="283" textAnchor="middle"
          fill="rgba(160,115,52,0.58)" fontSize="6"
          fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>F</text>
        <text x="623" y="294" textAnchor="middle"
          fill="rgba(160,115,52,0.42)" fontSize="4.5" letterSpacing="1"
          fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>WC</text>

        {/* Escalier mezzanine (centre, entre les zones) */}
        <Stairs x={330} y={316} />

        {/* Porte d'entrée (bas-centre, vue de dessus) */}
        <g>
          {/* Chambranle */}
          <rect x="310" y="447" width="60" height="11" rx="2"
            fill="#1a0f05" stroke="#8b6914" strokeWidth="0.9" />
          {/* Arc d'ouverture (swing de porte) */}
          <path d="M 340,447 A 30,30 0 0 0 310,447"
            fill="none" stroke="rgba(139,105,20,0.45)"
            strokeWidth="0.8" strokeDasharray="2.5 2" />
          <text x="340" y="455" textAnchor="middle"
            fill="rgba(139,105,20,0.62)" fontSize="5.5" letterSpacing="1"
            fontFamily="'Inter',sans-serif" style={{ userSelect: 'none' }}>
            ENTRÉE
          </text>
        </g>

        {/* Plantes */}
        <Plant x={38}  y={50}  />
        <Plant x={288} y={48}  />
        <Plant x={342} y={48}  />
        <Plant x={636} y={48}  />
        <Plant x={38}  y={298} />

        {/* ─────────────────────────────────────────── */}
        {/* TABLES                                      */}
        {/* ─────────────────────────────────────────── */}
        {tables.map((table) => {
          const r = plateauR(table.capacite)
          const chs = getChairs(table.capacite, r)
          const isLibre = table.statut === 'libre'
          const isHov = hovered === table.id
          const isSel = selectedTableId === table.id

          return (
            /*
             * Groupe externe : position fixe via attribut SVG transform (pas CSS).
             * Le hitbox transparent capte les événements souris sans bouger.
             * Le groupe interne porte UNIQUEMENT le scale CSS → plus de jitter.
             */
            <g
              key={table.id}
              transform={`translate(${table.x},${table.y})`}
              style={{ cursor: isLibre ? 'pointer' : 'not-allowed' }}
              onMouseEnter={() => isLibre && setHovered(table.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => {
                e.stopPropagation()
                if (isLibre) onTableClick?.(isSel ? null : table)
              }}
            >
              {/* Hitbox stable — ne scale jamais — élimine le jitter */}
              <circle cx={0} cy={0} r={r + 18}
                fill="rgba(0,0,0,0)" style={{ pointerEvents: 'all' }} />

              {/* Groupe visuel animé — pointerEvents none pour ne pas interférer */}
              <g style={{
                transform: `scale(${isHov ? 1.13 : 1})`,
                transformOrigin: '50% 50%',
                transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                pointerEvents: 'none',
              }}>
                {/* Anneau de sélection */}
                {isSel && (
                  <circle cx={0} cy={0} r={r + 10}
                    fill="none" stroke={ACCENT} strokeWidth="2.5" opacity="0.9" />
                )}
                {/* Anneau de survol */}
                {isHov && !isSel && (
                  <circle cx={0} cy={0} r={r + 10}
                    fill="none" stroke={ACCENT} strokeWidth="1.5" opacity="0.5" />
                )}
                {/* Lueur verte (tables libres) */}
                {isLibre && (
                  <circle cx={0} cy={0} r={r + 4}
                    fill="rgba(74,222,128,0.07)"
                    style={{ filter: 'blur(4px)' }}
                  />
                )}
                {/* Chaises */}
                {chs.map((c, i) => (
                  <circle key={i} cx={c.x} cy={c.y} r={5}
                    fill={CCT[table.statut]}
                    filter={isHov ? 'url(#sglow)' : undefined}
                  />
                ))}
                {/* Plateau */}
                <circle cx={0} cy={0} r={r}
                  fill={PCT[table.statut]}
                  stroke={
                    isHov    ? ACCENT
                    : isLibre ? '#c8970f'
                    : table.statut === 'occupee' ? '#6d1010' : '#6d4800'
                  }
                  strokeWidth={isHov ? 2 : 1}
                  filter={isHov ? 'url(#oglow)' : undefined}
                />
                {/* Point de statut */}
                {!isLibre && (
                  <circle cx={0} cy={0} r={4} fill={DOT[table.statut]} />
                )}
                {/* Numéro */}
                <text
                  x={0} y={isLibre ? 4.5 : -1.5}
                  textAnchor="middle"
                  fill={isLibre ? '#fde68a' : 'rgba(255,255,255,0.42)'}
                  fontSize={isLibre ? 8 : 7}
                  fontWeight="700"
                  fontFamily="'Inter',sans-serif"
                  style={{ userSelect: 'none' }}
                >
                  T{table.numero}
                </text>
              </g>
            </g>
          )
        })}
      </svg>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-5 mt-3 px-1">
        {[
          { label: 'Disponible', fill: '#8b6914', stroke: '#c8970f' },
          { label: 'Occupée',    fill: '#3d1010', stroke: '#6d1010' },
          { label: 'Réservée',   fill: '#3d2a00', stroke: '#6d4800' },
        ].map(({ label, fill, stroke }) => (
          <div key={label} className="flex items-center gap-2">
            <svg width="14" height="14">
              <circle cx="7" cy="7" r="5.5" fill={fill} stroke={stroke} strokeWidth="1.5" />
            </svg>
            <span style={{ color: 'rgba(245,240,232,0.38)', fontSize: 11, fontFamily: "'Inter',sans-serif" }}>
              {label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          {[16, 19, 22].map((r, i) => (
            <svg key={i} width={r * 2 + 4} height={r * 2 + 4}>
              <circle cx={r + 2} cy={r + 2} r={r}
                fill="rgba(139,105,20,0.18)" stroke="rgba(139,105,20,0.35)" strokeWidth="1" />
            </svg>
          ))}
          <span style={{ color: 'rgba(245,240,232,0.25)', fontSize: 10, fontFamily: "'Inter',sans-serif", marginLeft: 4 }}>
            Capacité
          </span>
        </div>
      </div>
    </div>
  )
}
