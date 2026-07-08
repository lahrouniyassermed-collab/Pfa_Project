import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { claimGoogleBonus } from '../services/api'

const INK   = '#1A1410'
const CREAM = '#F5F0E8'
const PAPER = '#FAF7F0'
const MUTED = '#8A7E76'
const GOLD  = '#B8963E'
const serif = "'DM Serif Display', serif"
const mono  = "'Space Mono', monospace"
const bebas = "'Bebas Neue', sans-serif"

const GOOGLE_LINK = "https://www.google.com/search?sca_esv=2abe5610bf025d75&rlz=1C1MYPO_frMA1177MA1177&sxsrf=APpeQnvBeIpC4h3gln498SznSt4_NUUSfA:1781932054958&si=APenkKm7iecQ4G6P-TsbSMFKIQtv3EFIqRAFw-i8uEbk55Z-__5e3GYvMGKcufkFXydTjqpf4osU9vsEufQHRtVp-SMqzjJ0jz9bcpub77XwxcIm9xKD9TDVRIIitM5m1mkUTaLuVmC2&q=Sky+07+Avis&sa=X&ved=2ahUKEwj_7ZiZhpWVAxXUSKQEHQKaIrgQ0bkNegQINhAF&biw=977&bih=675&dpr=2"

const STEPS = [
  { n: '01', title: 'Ouvrir Google Maps', desc: 'Cliquez sur le bouton ci-dessous pour accéder directement à la page SKY07 sur Google.', link: true },
  { n: '02', title: '5 étoiles + commentaire positif', desc: 'Sélectionnez 5 étoiles et rédigez un commentaire positif sur votre expérience.' },
  { n: '03', title: 'Votre nom doit apparaître', desc: 'Votre prénom et nom Google doivent correspondre à votre compte ici — l\'IA les vérifiera.' },
  { n: '04', title: 'Prendre la capture d\'écran', desc: 'Capture montrant : nom SKY07, vos étoiles, votre commentaire et votre nom visible.' },
  { n: '05', title: 'Soumettre ci-dessous', desc: 'Déposez votre capture et lancez la validation IA.' },
]

// Délais d'animation pour chaque checkbox (en ms)
const DELAYS = [600, 1400, 2300, 3300]

function PerfoRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '0 -20px', overflow: 'hidden' }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
      <div style={{ flex: 1, borderTop: `2px dashed rgba(26,20,16,0.18)` }} />
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
    </div>
  )
}

// État d'une checkbox : 'pending' | 'checking' | 'done'
function CheckBox({ state, checked, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 4,
      background: state === 'pending' ? 'rgba(26,20,16,0.03)'
        : state === 'checking' ? 'rgba(184,150,62,0.08)'
        : checked ? 'rgba(22,101,52,0.08)' : 'rgba(153,27,27,0.08)',
      border: `1px solid ${
        state === 'pending' ? 'rgba(26,20,16,0.1)'
        : state === 'checking' ? 'rgba(184,150,62,0.3)'
        : checked ? 'rgba(22,101,52,0.25)' : 'rgba(153,27,27,0.25)'
      }`,
      transition: 'all 0.4s ease',
    }}>
      {/* Checkbox visuelle */}
      <div style={{
        width: 24, height: 24, borderRadius: 5, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: state === 'pending' ? 'transparent'
          : state === 'checking' ? 'rgba(184,150,62,0.15)'
          : checked ? '#166534' : '#991B1B',
        border: state === 'pending' ? '2px solid rgba(26,20,16,0.2)'
          : state === 'checking' ? '2px solid rgba(184,150,62,0.5)'
          : 'none',
        transition: 'all 0.3s ease',
      }}>
        {state === 'checking' && (
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            border: '2px solid rgba(184,150,62,0.6)',
            borderTopColor: GOLD,
            animation: 'spin 0.7s linear infinite',
          }} />
        )}
        {state === 'done' && (
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', lineHeight: 1 }}>
            {checked ? '✓' : '✕'}
          </span>
        )}
      </div>

      {/* Label */}
      <span style={{
        fontFamily: mono, fontSize: 10,
        color: state === 'pending' ? MUTED
          : state === 'checking' ? GOLD
          : checked ? '#166534' : '#991B1B',
        transition: 'color 0.3s ease',
        lineHeight: 1.4,
      }}>
        {label}
      </span>
    </div>
  )
}

export default function GoogleAvisPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [apiResult, setApiResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef()

  // États d'animation des checkboxes : 'pending' | 'checking' | 'done'
  const [boxStates, setBoxStates] = useState(['pending', 'pending', 'pending', 'pending'])
  const [showFinal, setShowFinal] = useState(false)

  function handleFile(f) {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setApiResult(null)
    setError('')
    setBoxStates(['pending', 'pending', 'pending', 'pending'])
    setShowFinal(false)
  }

  async function handleSubmit() {
    if (!file) { setError('Choisissez une capture d\'écran.'); return }
    setSubmitting(true)
    setError('')
    setApiResult(null)
    setShowFinal(false)
    setBoxStates(['pending', 'pending', 'pending', 'pending'])

    try {
      const res = await claimGoogleBonus(file)
      const data = res.data

      // Passer en phase "analyse visuelle" immédiatement
      setSubmitting(false)
      setApiResult(data)

      // Animer chaque checkbox une par une
      const checks = [
        data.est_avis_google,
        data.restaurant_sky07,
        data.auteur_correspond,
        data.sentiment === 'POSITIF',
      ]

      for (let i = 0; i < 4; i++) {
        // Délai avant de commencer à "checker" cette case
        await new Promise(r => setTimeout(r, i === 0 ? 300 : DELAYS[i] - DELAYS[i-1]))

        // Passer en "checking" (spinner)
        setBoxStates(prev => prev.map((s, idx) => idx === i ? 'checking' : s))

        // Attendre un moment de suspense
        await new Promise(r => setTimeout(r, 700))

        // Révéler le résultat
        setBoxStates(prev => prev.map((s, idx) => idx === i ? 'done' : s))
      }

      // Après toutes les checkboxes, afficher le résultat final
      await new Promise(r => setTimeout(r, 500))
      setShowFinal(true)

    } catch (err) {
      setSubmitting(false)
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Erreur lors de l\'analyse. Réessayez.')
    }
  }

  const inAnalysis = apiResult && !showFinal
  const checks = apiResult ? [
    apiResult.est_avis_google,
    apiResult.restaurant_sky07,
    apiResult.auteur_correspond,
    apiResult.sentiment !== 'NEGATIF', // NEUTRE et POSITIF = ✓
  ] : [false, false, false, false]

  const labels = apiResult ? [
    'Interface Google Maps détectée',
    'Restaurant SKY07 visible dans la capture',
    apiResult.auteur_detecte ? `Nom trouvé : "${apiResult.auteur_detecte}"` : 'Votre nom visible dans la capture',
    `Sentiment : ${apiResult.sentiment === 'POSITIF' ? 'Positif ✓' : apiResult.sentiment === 'NEGATIF' ? 'Négatif ✗' : 'Neutre'}`,
  ] : [
    'Interface Google Maps détectée ?',
    'Restaurant SKY07 visible dans la capture ?',
    'Votre nom visible dans la capture ?',
    'Sentiment du commentaire ?',
  ]

  const accepted = showFinal && apiResult?.points_gagnes > 0
  const rejected = showFinal && apiResult?.points_gagnes === 0

  return (
    <div style={{ minHeight: '100vh', background: PAPER, padding: '20px 16px 60px', fontFamily: mono }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate('/client/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.08em',
          }}>← RETOUR</button>
          <div style={{ fontFamily: bebas, fontSize: 20, color: INK, letterSpacing: '0.1em' }}>SKY07</div>
        </div>

        {/* Main card */}
        <div style={{ background: CREAM, borderRadius: 4, boxShadow: '0 4px 20px rgba(26,20,16,0.12)', overflow: 'visible', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: -8 }}>
            {[...Array(7)].map((_, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />)}
          </div>

          <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Title */}
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Gagner des points</div>
              <div style={{ fontFamily: serif, fontSize: 22, color: INK }}>Avis Google Maps</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 4, lineHeight: 1.6 }}>
                Laissez un avis 5★ sur SKY07 et gagnez des points validés par IA.
              </div>
            </div>

            <PerfoRow />

            {/* Steps */}
            {!apiResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STEPS.map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '12px 14px', background: PAPER, borderRadius: 4,
                    borderLeft: `2px solid ${i === STEPS.length - 1 ? GOLD : 'rgba(26,20,16,0.12)'}`,
                  }}>
                    <div style={{ fontFamily: bebas, fontSize: 18, color: i === STEPS.length - 1 ? GOLD : MUTED, lineHeight: 1, flexShrink: 0, minWidth: 24 }}>{step.n}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: mono, fontSize: 10, color: INK, fontWeight: 'bold', marginBottom: 4 }}>{step.title}</div>
                      <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, lineHeight: 1.5 }}>{step.desc}</div>
                      {step.link && (
                        <a href={GOOGLE_LINK} target="_blank" rel="noreferrer" style={{
                          display: 'inline-block', marginTop: 8,
                          padding: '7px 16px', background: INK, color: CREAM,
                          borderRadius: 3, fontFamily: mono, fontSize: 9,
                          letterSpacing: '0.08em', textDecoration: 'none',
                          textTransform: 'uppercase',
                        }}>
                          → Ouvrir SKY07 sur Google
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Zone upload */}
            {!apiResult && (
              <>
                <PerfoRow />
                <div
                  onClick={() => inputRef.current?.click()}
                  style={{
                    border: `2px dashed ${preview ? GOLD : 'rgba(26,20,16,0.2)'}`,
                    borderRadius: 4, padding: preview ? 0 : '24px 16px',
                    cursor: 'pointer', textAlign: 'center', overflow: 'hidden',
                    background: preview ? 'transparent' : PAPER,
                    transition: 'border-color 200ms',
                  }}
                >
                  {preview ? (
                    <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 30, marginBottom: 8 }}>📸</div>
                      <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>DÉPOSER LA CAPTURE D'ÉCRAN</div>
                      <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, marginTop: 4, opacity: 0.7 }}>JPG, PNG — max 10 Mo</div>
                    </>
                  )}
                  <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files?.[0])} />
                </div>

                {preview && (
                  <button onClick={() => inputRef.current?.click()} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: mono, fontSize: 9, color: MUTED, textAlign: 'center',
                  }}>Changer l'image</button>
                )}

                {error && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '10px 14px', fontFamily: mono, fontSize: 9, color: '#991B1B' }}>
                    {error}
                  </div>
                )}

                <button onClick={handleSubmit} disabled={!file || submitting} style={{
                  background: file && !submitting ? INK : 'rgba(26,20,16,0.15)',
                  color: file && !submitting ? CREAM : MUTED,
                  border: 'none', borderRadius: 4, padding: '14px 20px',
                  cursor: file && !submitting ? 'pointer' : 'default',
                  fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  transition: 'background 200ms',
                }}>
                  {submitting ? '⏳ ENVOI EN COURS...' : 'VALIDER PAR IA'}
                </button>
              </>
            )}

            {/* ── PHASE ANALYSE : checkboxes animées ── */}
            {apiResult && (
              <>
                {/* Titre analyse */}
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
                    {showFinal ? 'Analyse terminée' : '⏳ Analyse en cours...'}
                  </div>
                  {!showFinal && (
                    <div style={{ fontFamily: mono, fontSize: 9, color: MUTED }}>
                      Vérification de votre capture par l'IA
                    </div>
                  )}
                </div>

                {/* Image soumise (miniature) */}
                {preview && (
                  <div style={{ borderRadius: 4, overflow: 'hidden', border: `1px solid rgba(26,20,16,0.12)`, maxHeight: 120 }}>
                    <img src={preview} alt="capture" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', filter: 'brightness(0.9)' }} />
                  </div>
                )}

                <PerfoRow />

                {/* Checkboxes animées */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[0, 1, 2, 3].map(i => (
                    <CheckBox
                      key={i}
                      state={boxStates[i]}
                      checked={checks[i]}
                      label={labels[i]}
                    />
                  ))}
                </div>

                {/* Résultat final */}
                {showFinal && (
                  <>
                    <PerfoRow />
                    <div style={{
                      padding: '20px 16px', borderRadius: 4, textAlign: 'center',
                      background: accepted ? 'rgba(22,101,52,0.08)' : 'rgba(153,27,27,0.08)',
                      border: `1px solid ${accepted ? 'rgba(22,101,52,0.2)' : 'rgba(153,27,27,0.2)'}`,
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{accepted ? '🎉' : '❌'}</div>
                      <div style={{ fontFamily: serif, fontSize: 20, color: INK, marginBottom: 6 }}>
                        {accepted ? 'Avis accepté !' : 'Avis non accepté'}
                      </div>
                      {accepted && (
                        <div style={{ fontFamily: bebas, fontSize: 34, color: GOLD, letterSpacing: '0.05em' }}>
                          +{apiResult.points_gagnes} PTS
                        </div>
                      )}
                      {rejected && apiResult.motif_rejet && (
                        <div style={{ fontFamily: mono, fontSize: 9, color: '#991B1B', marginTop: 8, lineHeight: 1.6 }}>
                          {apiResult.motif_rejet}
                        </div>
                      )}
                      <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, marginTop: 8, letterSpacing: '0.08em' }}>
                        SCORE IA : {apiResult.score_confiance ?? 0}/100
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {rejected && (
                        <button onClick={() => { setApiResult(null); setFile(null); setPreview(null); setBoxStates(['pending','pending','pending','pending']); setShowFinal(false) }} style={{
                          flex: 1, background: INK, color: CREAM, border: 'none', borderRadius: 4,
                          padding: '12px', cursor: 'pointer', fontFamily: mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>
                          Réessayer
                        </button>
                      )}
                      <button onClick={() => navigate('/client/dashboard')} style={{
                        flex: 1, background: 'none', border: `1px solid rgba(26,20,16,0.15)`, borderRadius: 4,
                        padding: '12px', cursor: 'pointer', fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.06em',
                      }}>
                        ← Tableau de bord
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginBottom: -8 }}>
            {[...Array(7)].map((_, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />)}
          </div>
        </div>

      </div>
    </div>
  )
}
