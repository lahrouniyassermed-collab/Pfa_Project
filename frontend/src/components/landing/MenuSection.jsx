import { useState } from 'react'
import { useScrollFade } from './useScrollFade'
import { categories, plats } from '../../data/mockData'

const A = '#e8824a'
const catName = { 1:'Entrée', 2:'Plat', 3:'Dessert', 4:'Boisson' }

function PlatCard({ plat }) {
  return (
    <div
      className="group relative overflow-hidden flex flex-col"
      style={{ background:'#111a0e', border:'1px solid rgba(232,130,74,0.07)', transition:'border-color 0.3s,transform 0.3s,box-shadow 0.3s', cursor:'default' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(232,130,74,0.32)'; e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 20px 60px rgba(0,0,0,0.55)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(232,130,74,0.07)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none' }}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ height:200 }}>
        <img
          src={plat.image} alt={plat.nom} loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0"
          style={{ background:'linear-gradient(to top,#111a0e 0%,rgba(17,26,14,0.1) 50%,transparent 100%)' }} />
        <div className="absolute top-3 left-3 px-2.5 py-1"
          style={{ background:'rgba(8,14,6,0.8)', backdropFilter:'blur(8px)' }}>
          <span className="text-[9px] tracking-[0.22em] uppercase" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>
            {catName[plat.categorie_id]}
          </span>
        </div>
        <div className="absolute top-3 right-3 px-3 py-1.5"
          style={{ background:`linear-gradient(135deg,${A},#c9673a)` }}>
          <span className="text-xs font-semibold" style={{ color:'#0a1408', fontFamily:"'Inter',sans-serif" }}>
            {plat.prix} Dh
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-sm leading-snug mb-2 transition-colors duration-300"
          style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:400, color:'#f5f0e8' }}
          ref={el => {
            if (!el) return
            el.parentElement?.parentElement?.addEventListener('mouseenter', () => { el.style.color = A })
            el.parentElement?.parentElement?.addEventListener('mouseleave', () => { el.style.color = '#f5f0e8' })
          }}
        >
          {plat.nom}
        </h3>
        <p className="text-xs leading-relaxed line-clamp-2 flex-1"
          style={{ color:'rgba(245,240,232,0.35)', fontFamily:"'Inter',sans-serif" }}>
          {plat.description}
        </p>
      </div>

      {/* Gold reveal line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px origin-left"
        style={{ background:`linear-gradient(to right,transparent,${A},transparent)`, transform:'scaleX(0)', transition:'transform 0.5s ease' }}
        ref={el => {
          if (!el) return
          const p = el.parentElement
          p.addEventListener('mouseenter', () => { el.style.transform='scaleX(1)' })
          p.addEventListener('mouseleave', () => { el.style.transform='scaleX(0)' })
        }}
      />
    </div>
  )
}

export default function MenuSection() {
  const [activeCategorie, setActiveCategorie] = useState(null)
  const ref = useScrollFade()
  const filtered = activeCategorie ? plats.filter(p => p.categorie_id === activeCategorie) : plats

  return (
    <section id="menu" className="py-32 px-6 relative" style={{ background:'#0a1408' }}>
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage:'repeating-linear-gradient(45deg,#e8824a 0,#e8824a 1px,transparent 0,transparent 50%)', backgroundSize:'20px 20px' }} />

      <div ref={ref} className="max-w-7xl mx-auto relative opacity-0 translate-y-8 transition-all duration-700">
        <div className="text-center mb-16">
          <p className="tracking-[0.45em] text-xs uppercase mb-5" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>Notre carte</p>
          <h2 className="text-white mb-6"
            style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(2.2rem,5vw,3.5rem)', fontWeight:400 }}>
            Une cuisine d'exception
          </h2>
          <div className="flex items-center justify-center gap-3 mx-auto" style={{ maxWidth:180 }}>
            <div className="h-px flex-1" style={{ background:`linear-gradient(to right,transparent,${A})` }} />
            <div className="w-1 h-1 rotate-45" style={{ background:A, opacity:0.55 }} />
            <div className="h-px flex-1" style={{ background:`linear-gradient(to left,transparent,${A})` }} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-14">
          {[{ id:null, nom:'Tout' }, ...categories].map((cat) => {
            const active = cat.id === activeCategorie
            return (
              <button key={cat.id ?? 'all'} onClick={() => setActiveCategorie(cat.id)}
                className="px-7 py-2.5 text-xs tracking-[0.2em] uppercase transition-all duration-200"
                style={{
                  border: `1px solid ${active ? A : 'rgba(232,130,74,0.2)'}`,
                  background: active ? 'rgba(232,130,74,0.12)' : 'transparent',
                  color: active ? A : 'rgba(245,240,232,0.38)',
                  fontFamily:"'Inter',sans-serif",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor=A; e.currentTarget.style.color=A }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor='rgba(232,130,74,0.2)'; e.currentTarget.style.color='rgba(245,240,232,0.38)' }}}
              >
                {cat.nom}
              </button>
            )
          })}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(p => <PlatCard key={p.id} plat={p} />)}
        </div>

        <p className="text-center text-xs tracking-widest mt-12 uppercase"
          style={{ color:'rgba(245,240,232,0.14)', fontFamily:"'Inter',sans-serif" }}>
          Menu évolutif selon les arrivages · Prix TTC service compris
        </p>
      </div>
    </section>
  )
}
