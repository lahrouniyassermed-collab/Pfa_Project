import { useState } from 'react'
import { useScrollFade } from './useScrollFade'
import { offresEmploi } from '../../data/mockData'
import JobApplicationForm from './JobApplicationForm'

const A = '#e8824a'

const icons = {
  chef: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  server: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  commis: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
}

export default function JobsSection() {
  const ref = useScrollFade()
  const [activeOffre, setActiveOffre] = useState(null)

  return (
    <section id="emplois" className="py-32 px-6 relative" style={{ background:'#0f1f0c' }}>
      <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none"
        style={{ background:'radial-gradient(ellipse at 100% 0%,rgba(232,130,74,0.05) 0%,transparent 70%)' }} />

      <div ref={ref} className="max-w-5xl mx-auto opacity-0 translate-y-8 transition-all duration-700">
        <div className="text-center mb-16">
          <p className="tracking-[0.42em] text-xs uppercase mb-5" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>Carrières</p>
          <h2 className="text-white mb-5"
            style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(2.2rem,5vw,3.5rem)', fontWeight:400 }}>
            Rejoignez l'équipe <em style={{ color:A, fontStyle:'italic' }}>SKY07</em>
          </h2>
          <div className="flex items-center justify-center gap-3 mx-auto mb-5" style={{ maxWidth:160 }}>
            <div className="h-px flex-1" style={{ background:`linear-gradient(to right,transparent,${A})` }} />
            <div className="w-1 h-1 rotate-45" style={{ background:A, opacity:0.55 }} />
            <div className="h-px flex-1" style={{ background:`linear-gradient(to left,transparent,${A})` }} />
          </div>
          <p className="text-sm" style={{ color:'rgba(245,240,232,0.35)', fontFamily:"'Inter',sans-serif" }}>
            Nous recherchons des passionnés prêts à partager notre vision de l'excellence
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {offresEmploi.map((offre, i) => (
            <div key={offre.id} className="group p-8 flex flex-col relative overflow-hidden"
              style={{ background:'#111a0e', border:'1px solid rgba(232,130,74,0.08)', transition:'border-color 0.3s,transform 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(232,130,74,0.28)'; e.currentTarget.style.transform='translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(232,130,74,0.08)'; e.currentTarget.style.transform='translateY(0)' }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background:'radial-gradient(ellipse at 0% 0%,rgba(232,130,74,0.04) 0%,transparent 70%)' }} />

              <div className="w-14 h-14 flex items-center justify-center mb-6 flex-shrink-0"
                style={{ border:`1px solid rgba(232,130,74,0.22)`, background:'rgba(232,130,74,0.06)', color:A }}>
                {icons[offre.icon]}
              </div>

              <div className="flex-1">
                <p className="text-xs tracking-[0.22em] uppercase mb-3"
                  style={{ color:A, fontFamily:"'Inter',sans-serif" }}>
                  {offre.type}
                </p>
                <h3 className="text-xl mb-4 leading-snug"
                  style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:400, color:'#f5f0e8' }}>
                  {offre.titre}
                </h3>
                <p className="text-sm leading-relaxed mb-8"
                  style={{ color:'rgba(245,240,232,0.4)', fontFamily:"'Inter',sans-serif" }}>
                  {offre.description}
                </p>
              </div>

              <button onClick={() => setActiveOffre(offre)}
                className="w-full py-3 text-xs tracking-[0.2em] uppercase transition-all duration-250"
                style={{ border:`1px solid rgba(232,130,74,0.38)`, color:A, background:'transparent', fontFamily:"'Inter',sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.background=A; e.currentTarget.style.color='#0a1408' }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=A }}
              >
                Postuler
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs tracking-widest mt-12"
          style={{ color:'rgba(245,240,232,0.18)', fontFamily:"'Inter',sans-serif" }}>
          Candidatures spontanées bienvenues · contact@sky07.ma
        </p>
      </div>

      {activeOffre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.88)', backdropFilter:'blur(16px)' }}
          onClick={e => e.target===e.currentTarget && setActiveOffre(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-8"
            style={{ background:'#111a0e', border:`1px solid rgba(232,130,74,0.18)`, animation:'modalIn 0.3s ease both' }}>
            <JobApplicationForm offre={activeOffre} onClose={() => setActiveOffre(null)} />
          </div>
        </div>
      )}
      <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </section>
  )
}
