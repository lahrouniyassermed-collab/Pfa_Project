import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { envoyerCodeOTP, validerCodeOTP } from '../services/api'

const INK   = '#1A1410'
const CREAM = '#F5F0E8'
const PAPER = '#FAF7F0'
const MUTED = '#8A7E76'
const GOLD  = '#B8963E'
const serif = "'DM Serif Display', serif"
const mono  = "'Space Mono', monospace"
const bebas = "'Bebas Neue', sans-serif"

const OTP_LEN      = 6
const COUNTDOWN_SEC = 60

function PerfoRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '0 -20px', overflow: 'hidden' }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
      <div style={{ flex: 1, borderTop: `2px dashed rgba(26,20,16,0.18)` }} />
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: PAPER, flexShrink: 0 }} />
    </div>
  )
}

function Alert({ msg }) {
  if (!msg) return null
  return (
    <div style={{ padding: '8px 12px', borderRadius: 3, fontFamily: mono, fontSize: 10, letterSpacing: '0.05em', background: 'rgba(200,49,42,0.1)', border: '1px solid rgba(200,49,42,0.3)', color: '#C8312A' }}>
      ✗ {msg}
    </div>
  )
}

export default function PhoneVerification() {
  const navigate = useNavigate()

  const [step, setStep]               = useState(0)
  const [telephone, setTelephone]     = useState('')
  const [otp, setOtp]                 = useState(Array(OTP_LEN).fill(''))
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [countdown, setCountdown]     = useState(COUNTDOWN_SEC)
  const [canResend, setCanResend]     = useState(false)
  const [pointsGained, setPointsGained] = useState(50)

  const otpRefs  = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    if (step === 1) startCountdown()
    return () => clearInterval(timerRef.current)
  }, [step])

  function startCountdown() {
    setCountdown(COUNTDOWN_SEC); setCanResend(false)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current); setCanResend(true); return 0 } return c - 1 })
    }, 1000)
  }

  async function handleSendOTP() {
    if (!telephone || telephone.length < 9) { setError('Entrez un numéro valide (9 chiffres sans indicatif).'); return }
    setError(''); setLoading(true)
    try {
      const fullPhone = '+212' + telephone.replace(/^0/, '')
      await envoyerCodeOTP(fullPhone)
      setStep(1)
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible d'envoyer le code. Réessayez.")
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (!canResend) return
    setError(''); setLoading(true)
    try {
      const fullPhone = '+212' + telephone.replace(/^0/, '')
      await envoyerCodeOTP(fullPhone)
      startCountdown()
    } catch (err) {
      setError(err.response?.data?.detail || 'Impossible de renvoyer le code.')
    } finally { setLoading(false) }
  }

  async function handleValidateOTP() {
    const code = otp.join('')
    if (code.length < OTP_LEN) { setError('Entrez les 6 chiffres du code.'); return }
    setError(''); setLoading(true)
    try {
      const res = await validerCodeOTP(code)
      setPointsGained(res.data?.points ?? 50)
      clearInterval(timerRef.current)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Code incorrect. Réessayez.')
      setOtp(Array(OTP_LEN).fill('')); otpRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  function handleOtpChange(val, idx) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[idx] = digit; setOtp(next); setError('')
    if (digit && idx < OTP_LEN - 1) otpRefs.current[idx + 1]?.focus()
  }
  function handleOtpKeyDown(e, idx) {
    if (e.key === 'Backspace') {
      if (otp[idx]) { const next = [...otp]; next[idx] = ''; setOtp(next) }
      else if (idx > 0) { otpRefs.current[idx - 1]?.focus(); const next = [...otp]; next[idx - 1] = ''; setOtp(next) }
    }
  }
  function handleOtpPaste(e) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN)
    const next = Array(OTP_LEN).fill('')
    text.split('').forEach((c, i) => { next[i] = c })
    setOtp(next)
    otpRefs.current[Math.min(text.length, OTP_LEN - 1)]?.focus()
  }

  return (
    <div style={{ minHeight: '100vh', background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: mono }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Nav */}
        <button onClick={() => navigate('/client/dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.08em', marginBottom: 16,
          display: 'block',
        }}>← RETOUR</button>

        {/* Ticket */}
        <div style={{ background: CREAM, borderRadius: 4, boxShadow: '0 4px 20px rgba(26,20,16,0.12)', overflow: 'visible', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: -8 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />
            ))}
          </div>

          <div style={{ padding: '20px 20px 24px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: bebas, fontSize: 36, color: INK, letterSpacing: '0.1em', lineHeight: 1 }}>SKY07</div>
              <div style={{ fontFamily: serif, fontSize: 18, color: INK, marginTop: 4 }}>Vérification téléphone</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 4, letterSpacing: '0.1em' }}>
                GAGNEZ +{pointsGained} PTS EN CONFIRMANT VOTRE NUMÉRO
              </div>
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 16 }}>
              {['Téléphone', 'Code OTP', 'Confirmé'].map((label, i) => (
                <React.Fragment key={i}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: mono, fontSize: 9,
                      background: i < step ? GOLD : i === step ? INK : 'rgba(26,20,16,0.08)',
                      color: i <= step ? CREAM : MUTED,
                      border: `1px solid ${i <= step ? 'transparent' : 'rgba(26,20,16,0.12)'}`,
                    }}>
                      {i < step ? '✓' : i + 1}
                    </div>
                    <span style={{ fontFamily: mono, fontSize: 7, color: MUTED, marginTop: 3, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                  {i < 2 && <div style={{ width: 40, height: 1, background: i < step ? GOLD : 'rgba(26,20,16,0.12)', marginBottom: 14, margin: '0 4px 14px' }} />}
                </React.Fragment>
              ))}
            </div>

            <PerfoRow />
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* ── STEP 0: Phone ── */}
              {step === 0 && (
                <>
                  <div>
                    <label style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Numéro de téléphone
                    </label>
                    <div style={{ display: 'flex', border: `1px solid rgba(26,20,16,0.18)`, borderRadius: 3, overflow: 'hidden', background: 'rgba(26,20,16,0.04)' }}>
                      <div style={{ padding: '10px 12px', fontFamily: mono, fontSize: 12, color: INK, borderRight: `1px solid rgba(26,20,16,0.12)`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        🇲🇦 +212
                      </div>
                      <input type="tel" value={telephone}
                        onChange={e => { setTelephone(e.target.value.replace(/\D/g, '')); setError('') }}
                        placeholder="6 12 34 56 78" maxLength={10}
                        onKeyDown={e => e.key === 'Enter' && handleSendOTP()} autoFocus
                        style={{ flex: 1, background: 'none', border: 'none', padding: '10px 12px', fontFamily: mono, fontSize: 13, color: INK, outline: 'none' }} />
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginTop: 4 }}>
                      Le code sera envoyé à votre adresse email de connexion.
                    </div>
                  </div>
                  <Alert msg={error} />
                  <button onClick={handleSendOTP} disabled={loading || !telephone} style={{
                    padding: '12px 20px', background: INK, color: CREAM,
                    border: `2px dashed rgba(245,240,232,0.25)`, borderRadius: 3,
                    cursor: loading || !telephone ? 'not-allowed' : 'pointer', opacity: !telephone ? 0.5 : 1,
                    fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>{loading ? 'ENVOI...' : '→ ENVOYER LE CODE'}</button>
                </>
              )}

              {/* ── STEP 1: OTP ── */}
              {step === 1 && (
                <>
                  <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.04em', lineHeight: 1.6 }}>
                    Code envoyé à votre email — entrez les 6 chiffres
                  </div>
                  <div style={{ display: 'flex', gap: 8 }} onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input key={idx} ref={el => otpRefs.current[idx] = el}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(e.target.value, idx)}
                        onKeyDown={e => handleOtpKeyDown(e, idx)}
                        autoFocus={idx === 0}
                        style={{
                          flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 700,
                          background: 'rgba(26,20,16,0.06)', border: `1px solid ${digit ? INK : 'rgba(26,20,16,0.18)'}`,
                          borderRadius: 3, color: INK, padding: '12px 0', outline: 'none', fontFamily: mono,
                        }} />
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 10, color: MUTED }}>
                    {canResend
                      ? <button onClick={handleResend} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontFamily: mono, fontSize: 10, letterSpacing: '0.06em' }}>
                          Renvoyer le code
                        </button>
                      : <span>Renvoyer dans <span style={{ color: INK }}>{countdown}s</span></span>
                    }
                  </div>
                  <Alert msg={error} />
                  <button onClick={handleValidateOTP} disabled={loading || otp.join('').length < OTP_LEN} style={{
                    padding: '12px 20px', background: INK, color: CREAM,
                    border: `2px dashed rgba(245,240,232,0.25)`, borderRadius: 3,
                    cursor: loading || otp.join('').length < OTP_LEN ? 'not-allowed' : 'pointer',
                    opacity: otp.join('').length < OTP_LEN ? 0.5 : 1,
                    fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>{loading ? 'VALIDATION...' : '→ VALIDER'}</button>
                  <button onClick={() => { setStep(0); setOtp(Array(OTP_LEN).fill('')); setError('') }} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 9, color: MUTED, textAlign: 'center', letterSpacing: '0.06em',
                  }}>← Changer de numéro</button>
                </>
              )}

              {/* ── STEP 2: Success ── */}
              {step === 2 && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                  <div style={{ fontFamily: serif, fontSize: 22, color: INK, marginBottom: 6 }}>Téléphone vérifié !</div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, marginBottom: 16 }}>Votre numéro a bien été confirmé.</div>
                  <div style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(184,150,62,0.12)', border: `1px solid rgba(184,150,62,0.3)`, borderRadius: 3, marginBottom: 20 }}>
                    <span style={{ fontFamily: bebas, fontSize: 22, color: GOLD }}>+{pointsGained} PTS</span>
                    <span style={{ fontFamily: mono, fontSize: 9, color: MUTED, marginLeft: 6 }}>crédités</span>
                  </div>
                  <button onClick={() => navigate('/client/dashboard')} style={{
                    display: 'block', width: '100%', padding: '12px 20px', background: INK, color: CREAM,
                    border: `2px dashed rgba(245,240,232,0.25)`, borderRadius: 3, cursor: 'pointer',
                    fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>→ TABLEAU DE BORD</button>
                </div>
              )}

            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginBottom: -8 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: PAPER }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
