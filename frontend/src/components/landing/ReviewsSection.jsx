import { useState } from 'react'
import { useScrollFade } from './useScrollFade'
import { avisClients } from '../../data/mockData'

const A = '#e8824a'

function Stars({ note, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} fill="currentColor" viewBox="0 0 20 20"
          style={{ color: i<=note ? A : 'rgba(245,240,232,0.1)' }}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function ClickableStars({ value, onChange }) {
  const [hv, setHv] = useState(0)
  return (
    <div className="flex gap-1.5">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button"
          onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(0)}
          onClick={() => onChange(i)}
          className="transition-transform duration-100 hover:scale-110">
          <svg width="28" height="28" fill="currentColor" viewBox="0 0 20 20"
            style={{ color: i<=(hv||value) ? A : 'rgba(245,240,232,0.15)', transition:'color 0.15s' }}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function ReviewForm() {
  const [form, setForm] = useState({ nom:'', note:0, commentaire:'' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.note) return
    setLoading(true)
    setTimeout(() => { setLoading(false); setSubmitted(true) }, 900)
  }

  const inputBase = {
    width:'100%', background:'transparent', color:'#f5f0e8', padding:'12px 0',
    fontSize:'14px', outline:'none', fontFamily:"'Inter',sans-serif",
    borderBottom:`1px solid rgba(232,130,74,0.25)`, transition:'border-color 0.2s',
  }

  if (submitted) return (
    <div className="text-center py-10">
      <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6"
        style={{ background:'rgba(232,130,74,0.08)', border:`1px solid rgba(232,130,74,0.3)` }}>
        <svg className="w-7 h-7" fill="none" stroke={A} strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-white text-lg font-light mb-2" style={{ fontFamily:"'Playfair Display',Georgia,serif" }}>Merci !</p>
      <p className="text-sm" style={{ color:'rgba(245,240,232,0.38)', fontFamily:"'Inter',sans-serif" }}>Votre avis sera publié après modération.</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs tracking-[0.22em] uppercase mb-2" style={{ color:`rgba(232,130,74,0.55)`, fontFamily:"'Inter',sans-serif" }}>Votre nom</label>
          <input required type="text" value={form.nom}
            onChange={e => setForm({...form,nom:e.target.value})}
            style={inputBase} placeholder="Prénom Nom"
            onFocus={e => e.target.style.borderColor=A}
            onBlur={e => e.target.style.borderColor='rgba(232,130,74,0.25)'}
          />
        </div>
        <div>
          <label className="block text-xs tracking-[0.22em] uppercase mb-2" style={{ color:`rgba(232,130,74,0.55)`, fontFamily:"'Inter',sans-serif" }}>Note</label>
          <div className="py-2.5">
            <ClickableStars value={form.note} onChange={n => setForm({...form,note:n})} />
            {!form.note && <p className="text-xs mt-1.5" style={{ color:'rgba(245,240,232,0.2)', fontFamily:"'Inter',sans-serif" }}>Cliquez pour noter</p>}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs tracking-[0.22em] uppercase mb-2" style={{ color:`rgba(232,130,74,0.55)`, fontFamily:"'Inter',sans-serif" }}>Votre commentaire</label>
        <textarea required rows={4} value={form.commentaire}
          onChange={e => setForm({...form,commentaire:e.target.value})}
          style={{ ...inputBase, resize:'none' }}
          placeholder="Partagez votre expérience chez SKY07…"
          onFocus={e => e.target.style.borderColor=A}
          onBlur={e => e.target.style.borderColor='rgba(232,130,74,0.25)'}
        />
      </div>
      <button type="submit" disabled={loading||!form.note}
        className="px-10 py-3.5 text-xs tracking-[0.22em] uppercase font-semibold transition-all duration-300 disabled:opacity-35"
        style={{ background:`linear-gradient(135deg,${A},#c9673a)`, color:'#0a1408', fontFamily:"'Inter',sans-serif" }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 0 28px rgba(232,130,74,0.4)` }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow='none' }}>
        {loading ? 'Envoi…' : 'Publier mon avis'}
      </button>
    </form>
  )
}

export default function ReviewsSection() {
  const ref1 = useScrollFade()
  const ref2 = useScrollFade()
  const avg = Math.round(avisClients.reduce((s,a) => s+a.note, 0) / avisClients.length)

  return (
    <section id="avis">
      {/* Client reviews */}
      <div className="py-32 px-6" style={{ background:'#0a1408' }}>
        <div ref={ref1} className="max-w-6xl mx-auto opacity-0 translate-y-8 transition-all duration-700">
          <div className="text-center mb-16">
            <p className="tracking-[0.42em] text-xs uppercase mb-5" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>Témoignages</p>
            <h2 className="text-white mb-5"
              style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(2.2rem,5vw,3.5rem)', fontWeight:400 }}>
              Ce que disent nos clients
            </h2>
            <div className="flex items-center justify-center gap-3 mx-auto mb-6" style={{ maxWidth:160 }}>
              <div className="h-px flex-1" style={{ background:`linear-gradient(to right,transparent,${A})` }} />
              <div className="w-1 h-1 rotate-45" style={{ background:A, opacity:0.55 }} />
              <div className="h-px flex-1" style={{ background:`linear-gradient(to left,transparent,${A})` }} />
            </div>
            <div className="flex items-center justify-center gap-3">
              <Stars note={avg} size={18} />
              <span className="text-sm" style={{ color:'rgba(245,240,232,0.4)', fontFamily:"'Inter',sans-serif" }}>
                {avg}.0 / 5 · {avisClients.length} avis vérifiés
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
            {avisClients.map((avis, i) => (
              <div key={avis.id}
                className="p-7 flex flex-col"
                style={{
                  background:'rgba(255,255,255,0.02)', border:'1px solid rgba(232,130,74,0.08)',
                  backdropFilter:'blur(10px)', animation:`fadeInUp 0.6s ease ${i*0.08}s both`,
                  transition:'border-color 0.3s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(232,130,74,0.22)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(232,130,74,0.08)'}
              >
                <div className="text-4xl font-light mb-3 leading-none"
                  style={{ color:'rgba(232,130,74,0.2)', fontFamily:"'Playfair Display',Georgia,serif" }}>"</div>
                <Stars note={avis.note} />
                <p className="text-sm leading-relaxed my-5 flex-1 italic"
                  style={{ color:'rgba(245,240,232,0.55)', fontFamily:"'Playfair Display',Georgia,serif" }}>
                  {avis.commentaire}
                </p>
                <div className="flex items-center gap-3 pt-4" style={{ borderTop:'1px solid rgba(232,130,74,0.08)' }}>
                  <div className="w-9 h-9 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                    style={{ background:avis.couleur, fontFamily:"'Inter',sans-serif" }}>
                    {avis.initiales}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color:'rgba(245,240,232,0.82)', fontFamily:"'Inter',sans-serif" }}>
                      {avis.nom}
                    </p>
                    <p className="text-xs" style={{ color:'rgba(245,240,232,0.25)', fontFamily:"'Inter',sans-serif" }}>
                      {avis.date}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="max-w-2xl mx-auto p-10"
            style={{ background:'rgba(255,255,255,0.02)', border:`1px solid rgba(232,130,74,0.15)`, backdropFilter:'blur(10px)' }}>
            <p className="tracking-[0.35em] text-xs uppercase mb-3" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>Votre tour</p>
            <h3 className="text-white mb-8"
              style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'1.7rem', fontWeight:400 }}>
              Laissez votre avis
            </h3>
            <ReviewForm />
          </div>
        </div>
      </div>

      {/* Google Maps */}
      <div style={{ background:'#080e06', borderTop:'1px solid rgba(232,130,74,0.07)' }}>
        <div className="relative w-full" style={{ height:360 }}>
          <iframe
            title="SKY07 Casablanca"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d106376.0!2d-7.7000!3d33.5730!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda7cd4778aa113b%3A0xb06c1d84f310fd3!2sCasablanca%2C%20Maroc!5e0!3m2!1sfr!2sma!4v1"
            width="100%" height="100%"
            style={{ border:0, filter:'grayscale(100%) invert(88%) contrast(80%) brightness(0.55) sepia(20%)' }}
            allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background:'rgba(8,14,6,0.32)' }} />
        </div>

        <div ref={ref2} className="max-w-2xl mx-auto text-center py-20 px-6 opacity-0 translate-y-8 transition-all duration-700">
          <p className="tracking-[0.42em] text-xs uppercase mb-5" style={{ color:A, fontFamily:"'Inter',sans-serif" }}>Google Maps</p>
          <h3 className="text-white mb-5"
            style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:400 }}>
            Partagez votre expérience
          </h3>
          <div className="w-12 h-px mx-auto mb-8" style={{ background:A }} />
          <p className="text-sm leading-relaxed mb-10 max-w-lg mx-auto"
            style={{ color:'rgba(245,240,232,0.38)', fontFamily:"'Inter',sans-serif" }}>
            Votre avis sur Google aide d'autres gourmets à nous découvrir.
            Quelques mots sur votre visite chez SKY07 nous font énormément plaisir.
          </p>
          <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-4 font-semibold tracking-[0.18em] text-xs uppercase transition-all duration-300"
            style={{ background:`linear-gradient(135deg,${A},#c9673a)`, color:'#0a1408', fontFamily:"'Inter',sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow=`0 0 40px rgba(232,130,74,0.4)`}
            onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Laisser un avis sur Google Maps
          </a>
          <div className="flex items-center justify-center gap-8 mt-10">
            <div className="text-center">
              <Stars note={5} size={14} />
              <p className="text-xs mt-1.5" style={{ color:'rgba(245,240,232,0.28)', fontFamily:"'Inter',sans-serif" }}>4.9 / 5 sur Google</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'1.4rem', color:A, fontWeight:300 }}>120+</p>
              <p className="text-xs" style={{ color:'rgba(245,240,232,0.28)', fontFamily:"'Inter',sans-serif" }}>avis Google</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </section>
  )
}
