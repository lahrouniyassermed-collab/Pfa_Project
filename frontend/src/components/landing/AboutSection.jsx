import { useEffect, useRef, useState } from 'react'
import { useScrollFade } from './useScrollFade'

const A = '#e8824a'
const ABOUT_IMG = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=80'

const horaires = [
  { jour: 'Mardi — Vendredi', midi: '12h00 – 14h30', soir: '19h00 – 22h30' },
  { jour: 'Samedi',           midi: '12h00 – 15h00', soir: '19h00 – 23h00' },
  { jour: 'Dimanche',         midi: '12h00 – 15h00', soir: 'Fermé'         },
  { jour: 'Lundi',            midi: 'Fermé',          soir: 'Fermé'         },
]

function useCountUp(target, duration = 1800) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (!started) return
    let frame = 0, total = Math.ceil(duration / 16)
    const t = setInterval(() => {
      frame++
      const ease = 1 - Math.pow(1 - frame / total, 3)
      setCount(Math.round(ease * target))
      if (frame >= total) clearInterval(t)
    }, 16)
    return () => clearInterval(t)
  }, [started, target, duration])
  return [count, () => setStarted(true)]
}

function Stat({ value, suffix = '', label }) {
  const [count, start] = useCountUp(value)
  const ref = useRef(null)
  const fired = useRef(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !fired.current) { fired.current = true; start() }
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className="text-center">
      <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'2.5rem', lineHeight:1, color:A, fontWeight:300 }}>
        {count}{suffix}
      </p>
      <p className="text-xs tracking-[0.22em] uppercase mt-1" style={{ color:'rgba(245,240,232,0.35)', fontFamily:"'Inter',sans-serif" }}>
        {label}
      </p>
    </div>
  )
}

export default function AboutSection() {
  const ref = useScrollFade()
  return (
    <section id="apropos" className="py-32 px-6 overflow-hidden" style={{ background:'#0f1f0c' }}>
      <div ref={ref} className="max-w-6xl mx-auto opacity-0 translate-y-8 transition-all duration-700">
        <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-center">

          {/* Photo */}
          <div className="relative">
            <div className="absolute -top-4 -left-4 right-8 bottom-8"
              style={{ border:`1px solid rgba(232,130,74,0.18)`, zIndex:0 }} />
            <div className="relative overflow-hidden" style={{ zIndex:1, aspectRatio:'4/5' }}>
              <img src={ABOUT_IMG} alt="Intérieur SKY07"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 right-0 h-32"
                style={{ background:'linear-gradient(to top,rgba(10,20,8,0.7),transparent)' }} />
            </div>
            <div className="absolute bottom-8 right-0 translate-x-4 px-6 py-5 z-10"
              style={{ background:'rgba(8,16,6,0.92)', border:`1px solid rgba(232,130,74,0.28)`, backdropFilter:'blur(20px)' }}>
              <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'1.6rem', color:A, fontWeight:300 }}>2009</p>
              <p className="text-xs tracking-widest uppercase" style={{ color:'rgba(245,240,232,0.4)', fontFamily:"'Inter',sans-serif" }}>
                Fondé à Casablanca
              </p>
            </div>
          </div>

          {/* Text */}
          <div>
            <p className="tracking-[0.4em] text-xs uppercase mb-6" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>Notre histoire</p>
            <h2 className="text-white mb-7 leading-tight"
              style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(2rem,4vw,3rem)', fontWeight:400 }}>
              Une cuisine de caractère,{' '}
              <em style={{ color:A, fontStyle:'italic' }}>une âme méditerranéenne</em>
            </h2>
            <div className="w-12 h-px mb-8" style={{ background:A }} />
            <p className="text-base leading-relaxed mb-5" style={{ color:'rgba(245,240,232,0.52)', fontFamily:"'Inter',sans-serif" }}>
              Né d'une passion pour les saveurs authentiques et la gastronomie de haut vol,
              SKY07 ouvre ses portes comme un sanctuaire du goût. Notre chef, formé auprès des
              plus grandes tables marocaines et méditerranéennes, compose une carte qui célèbre
              les producteurs locaux et les savoir-faire ancestraux.
            </p>
            <p className="text-base leading-relaxed mb-12" style={{ color:'rgba(245,240,232,0.52)', fontFamily:"'Inter',sans-serif" }}>
              Trois espaces distincts : intérieur feutré, terrasse aérienne et mezzanine privée
              pour vos moments d'exception.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 py-8 mb-12"
              style={{ borderTop:'1px solid rgba(232,130,74,0.1)', borderBottom:'1px solid rgba(232,130,74,0.1)' }}>
              <Stat value={120} label="Couverts" />
              <Stat value={15} suffix="+" label="Ans d'expérience" />
              <Stat value={3} label="Étoiles chef" />
            </div>

            {/* Horaires */}
            <p className="tracking-[0.35em] text-xs uppercase mb-5" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>
              Horaires d'ouverture
            </p>
            <div className="space-y-2.5">
              {horaires.map(({ jour, midi, soir }) => (
                <div key={jour} className="flex items-center justify-between py-2.5"
                  style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-sm w-44" style={{ color:'rgba(245,240,232,0.72)', fontFamily:"'Inter',sans-serif" }}>{jour}</span>
                  <div className="text-right">
                    <p className="text-xs" style={{ color:'rgba(245,240,232,0.38)', fontFamily:"'Inter',sans-serif" }}>{midi}</p>
                    <p className="text-xs" style={{ color:'rgba(245,240,232,0.38)', fontFamily:"'Inter',sans-serif" }}>{soir}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact bar */}
        <div className="mt-16 grid md:grid-cols-3 gap-0" style={{ border:'1px solid rgba(232,130,74,0.1)' }}>
          {[
            { label:'Adresse', value:'7 Av. Mohammed VI, Casablanca', iconD:'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
            { label:'Réservations', value:'+212 5 22 00 07 07', iconD:'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
            { label:'Email', value:'contact@sky07.ma', iconD:'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
          ].map(({ label, value, iconD }, i) => (
            <div key={label} className="flex items-center gap-4 px-8 py-6"
              style={{ borderRight: i<2 ? '1px solid rgba(232,130,74,0.1)' : 'none' }}>
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ border:`1px solid rgba(232,130,74,0.25)`, background:'rgba(232,130,74,0.06)' }}>
                <svg className="w-4 h-4" fill="none" stroke={A} strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconD} />
                </svg>
              </div>
              <div>
                <p className="text-xs tracking-widest uppercase mb-0.5" style={{ color:'rgba(245,240,232,0.28)', fontFamily:"'Inter',sans-serif" }}>{label}</p>
                <p className="text-sm" style={{ color:'rgba(245,240,232,0.72)', fontFamily:"'Inter',sans-serif" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
