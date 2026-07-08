import React, { useState, useEffect, useRef } from 'react'
import {
  clientLogin, clientRegister, verifierCodeAmi,
  confirmerEmail, renvoyerConfirmation,
  demanderResetMdpClient, resetMdpClient,
} from '../services/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// ── Design tokens ────────────────────────────────────────────────────────────
const INK   = '#1A1410'
const CREAM = '#F5F0E8'
const PAPER = '#FAF7F0'
const MUTED = '#8A7E76'
const RED   = '#C8312A'
const GOLD  = '#B8963E'
const serif = "'DM Serif Display', serif"
const mono  = "'Space Mono', monospace"
const bebas = "'Bebas Neue', sans-serif"

// ── Helpers ──────────────────────────────────────────────────────────────────
function Barcode({ width = 120, height = 28 }) {
  const bars = []
  for (let i = 0; i < 38; i++) {
    const w = [1, 2, 3][i % 3]
    bars.push({ x: bars.reduce((s, b) => s + b.w + 1, 0), w })
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height}
          fill={INK} opacity={i % 7 === 0 ? 0.3 : 1} />
      ))}
    </svg>
  )
}

function PerfoRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '0 -16px', overflow: 'hidden' }}>
      <div style={{ width: 16, height: 16, background: PAPER, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, borderTop: `2px dashed rgba(26,20,16,0.2)` }} />
      <div style={{ width: 16, height: 16, background: PAPER, borderRadius: '50%', flexShrink: 0 }} />
    </div>
  )
}

function TicketInput({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const fieldStyle = {
  background: 'rgba(26,20,16,0.06)',
  border: `1px solid rgba(26,20,16,0.18)`,
  borderRadius: 3, color: INK,
  fontFamily: mono, fontSize: 13,
  padding: '10px 12px', outline: 'none', width: '100%',
}

function Btn({ children, loading, disabled, type = 'submit', onClick, variant = 'primary' }) {
  const isSecondary = variant === 'secondary'
  return (
    <button type={type} disabled={disabled || loading} onClick={onClick} style={{
      width: '100%', padding: '12px 20px',
      background: isSecondary ? 'transparent' : INK,
      color: isSecondary ? INK : CREAM,
      border: isSecondary ? `1px solid rgba(26,20,16,0.3)` : 'none',
      borderTop: isSecondary ? undefined : `2px dashed rgba(245,240,232,0.3)`,
      borderBottom: isSecondary ? undefined : `2px dashed rgba(245,240,232,0.3)`,
      borderRadius: 3, cursor: disabled || loading ? 'not-allowed' : 'pointer',
      fontFamily: mono, fontSize: 12, letterSpacing: '0.1em',
      textTransform: 'uppercase', opacity: disabled || loading ? 0.5 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {loading ? '...' : children}
    </button>
  )
}

function Alert({ msg, type = 'error' }) {
  if (!msg) return null
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 3, fontFamily: mono, fontSize: 11,
      letterSpacing: '0.05em',
      background: type === 'error' ? 'rgba(200,49,42,0.1)' : 'rgba(184,150,62,0.1)',
      border: `1px solid ${type === 'error' ? 'rgba(200,49,42,0.3)' : 'rgba(184,150,62,0.3)'}`,
      color: type === 'error' ? RED : GOLD,
    }}>
      {type === 'error' ? '✗ ' : '✓ '}{msg}
    </div>
  )
}

// ── Terms of Service Modal ───────────────────────────────────────────────────
function TermsModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.85)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: PAPER, maxWidth: 560, width: '100%', maxHeight: '80vh',
        overflowY: 'auto', borderRadius: 4, padding: '32px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: bebas, fontSize: 28, color: INK, letterSpacing: '0.08em', marginBottom: 4 }}>
          CONDITIONS D'UTILISATION
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.1em', marginBottom: 24 }}>
          SKY07 — Version 1.0 — Mai 2026
        </div>
        <PerfoRow />
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16, fontFamily: mono, fontSize: 12, color: INK, lineHeight: 1.7 }}>
          <section>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>1. Objet du programme</div>
            <p>L'application SKY07 est un programme de fidélité proposé par le restaurant SKY07 (Casablanca, Maroc). Elle permet aux clients de cumuler des points, de participer à la roue de fortune, de parrainer des amis, et de bénéficier d'avantages exclusifs.</p>
          </section>
          <section>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>2. Inscription et compte</div>
            <p>L'inscription est gratuite et ouverte à toute personne physique majeure. Chaque client ne peut détenir qu'un seul compte. Les informations fournies doivent être exactes et à jour. SKY07 se réserve le droit de suspendre tout compte frauduleux.</p>
          </section>
          <section>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>3. Points de fidélité</div>
            <p>Les points sont crédités sur présentation de votre QR code lors d'une visite. Ils ne sont pas échangeables contre de l'argent et ne peuvent pas être transférés. Ils expirent après 12 mois d'inactivité.</p>
          </section>
          <section>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>4. Roue de fortune</div>
            <p>La roue de fortune est accessible avec des points. Les gains obtenus sont valables 30 jours et ne sont pas cumulables. SKY07 se réserve le droit de modifier les récompenses sans préavis.</p>
          </section>
          <section>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>5. Parrainage</div>
            <p>Le programme de parrainage permet de gagner des points en invitant des amis. Les points de parrainage sont crédités une fois que l'ami parrainé a effectué sa première visite. Tout abus entraînera la suspension des deux comptes.</p>
          </section>
          <section>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>6. Données personnelles</div>
            <p>Vos données (nom, email, téléphone) sont collectées pour faire fonctionner le programme de fidélité. Elles ne sont jamais vendues à des tiers. Vous pouvez demander leur suppression à tout moment en contactant le restaurant. Si vous avez accepté de recevoir des emails promotionnels, vous pouvez vous désabonner à tout moment.</p>
          </section>
          <section>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>7. Modification des conditions</div>
            <p>SKY07 se réserve le droit de modifier ces conditions à tout moment. Les modifications seront notifiées par email aux membres ayant accepté de recevoir des communications. L'utilisation continue de l'application vaut acceptation des nouvelles conditions.</p>
          </section>
          <section>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>8. Résiliation</div>
            <p>Vous pouvez clôturer votre compte à tout moment en contactant le restaurant. Les points non utilisés seront perdus. SKY07 peut suspendre un compte en cas de fraude ou d'abus.</p>
          </section>
          <section>
            <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>9. Droit applicable</div>
            <p>Ces conditions sont régies par le droit marocain. En cas de litige, les tribunaux de Casablanca seront seuls compétents.</p>
          </section>
        </div>
        <PerfoRow />
        <div style={{ marginTop: 20 }}>
          <Btn type="button" onClick={onClose}>J'ai lu et compris ✓</Btn>
        </div>
      </div>
    </div>
  )
}

// ── OTP Box ──────────────────────────────────────────────────────────────────
function OtpBox({ otp, otpRefs, onChange, onKeyDown, onPaste }) {
  return (
    <div style={{ display: 'flex', gap: 8 }} onPaste={onPaste}>
      {otp.map((d, i) => (
        <input key={i} ref={el => otpRefs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e => onChange(e.target.value, i)}
          onKeyDown={e => onKeyDown(e, i)}
          style={{
            flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 700,
            background: 'rgba(26,20,16,0.07)',
            border: `1px solid ${d ? INK : 'rgba(26,20,16,0.2)'}`,
            borderRadius: 3, color: INK, padding: '12px 0', outline: 'none',
            fontFamily: mono, transition: 'border-color 150ms',
          }} />
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ClientLogin() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // screens: login | register | verify-email | forgot | reset-code
  const [screen, setScreen]             = useState('login')
  const [form, setForm]                 = useState({
    prenom: '', nom: '', email: '', password: '',
    code_parrainage: '', accept_emails: false, accept_terms: false,
  })
  const [pendingEmail, setPendingEmail]     = useState('')
  const [pendingPassword, setPendingPassword] = useState('')
  const [resetEmail, setResetEmail]         = useState('')
  const [newPassword, setNewPassword]       = useState('')
  const [otp, setOtp]                       = useState(['','','','','',''])
  const [error, setError]                   = useState('')
  const [success, setSuccess]               = useState('')
  const [loading, setLoading]               = useState(false)
  const [showPwd, setShowPwd]               = useState(false)
  const [showNewPwd, setShowNewPwd]         = useState(false)
  const [codeStatus, setCodeStatus]         = useState(null)
  const [codeInfo, setCodeInfo]             = useState(null)
  const [countdown, setCountdown]           = useState(0)
  const [canResend, setCanResend]           = useState(false)
  const [showTerms, setShowTerms]           = useState(false)
  const debounceRef = useRef(null)
  const otpRefs     = useRef([])

  useEffect(() => {
    const codeUrl = searchParams.get('code')
    if (codeUrl) {
      setScreen('register')
      setForm(f => ({ ...f, code_parrainage: codeUrl.toUpperCase() }))
      verifierCode(codeUrl.toUpperCase())
    }
  }, [])

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function verifierCode(code) {
    const clean = code.trim().toUpperCase()
    if (!clean) { setCodeStatus(null); setCodeInfo(null); return }
    if (!/^SKY-[A-Z]+-[A-Z0-9]{4}$/.test(clean)) {
      setCodeStatus('invalid'); setCodeInfo({ message: 'Format invalide (ex: SKY-YASSER-4F2A)' }); return
    }
    setCodeStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await verifierCodeAmi(clean)
        if (res.data.valide) { setCodeStatus('valid'); setCodeInfo(res.data) }
        else { setCodeStatus('invalid'); setCodeInfo({ message: res.data.message }) }
      } catch { setCodeStatus('invalid'); setCodeInfo({ message: 'Erreur de vérification' }) }
    }, 500)
  }

  function handleOtp(val, i) {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) otpRefs.current[i + 1]?.focus()
  }
  function handleOtpKey(e, i) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }
  function handleOtpPaste(e) {
    const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (txt.length === 6) { setOtp(txt.split('')); otpRefs.current[5]?.focus(); e.preventDefault() }
  }

  function goTo(s) { setScreen(s); setError(''); setSuccess(''); setOtp(['','','','','','']) }

  async function handleRegister(e) {
    e.preventDefault(); setError('')
    if (!form.accept_terms) { setError('Vous devez accepter le règlement pour continuer'); return }
    if (form.password.length < 6) { setError('Mot de passe : 6 caractères minimum'); return }
    if (form.code_parrainage && codeStatus !== 'valid') { setError('Code de parrainage invalide'); return }
    setLoading(true)
    try {
      const res = await clientRegister({
        prenom: form.prenom.trim(), nom: form.nom.trim(),
        email: form.email.trim(), password: form.password,
        accept_emails: form.accept_emails,
        code_parrainage: form.code_parrainage.trim().toUpperCase() || undefined,
      })
      if (res.data.requires_email_verification) {
        setPendingEmail(form.email.trim()); setPendingPassword(form.password)
        goTo('verify-email'); setCountdown(60); setCanResend(false)
      }
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(typeof msg === 'string' ? msg : 'Une erreur est survenue')
    } finally { setLoading(false) }
  }

  async function handleLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await clientLogin({ email: form.email.trim(), password: form.password })
      const clientData = { ...res.data.client, role: 'client', access_token: res.data.access_token }
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(clientData))
      if (setUser) setUser(clientData)
      navigate('/client/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(form.email.trim()); setPendingPassword(form.password)
        goTo('verify-email'); setCountdown(60); setCanResend(false)
      } else {
        setError(typeof detail === 'string' ? detail : 'Email ou mot de passe incorrect')
      }
    } finally { setLoading(false) }
  }

  async function handleVerifyEmail(e) {
    e.preventDefault(); setError('')
    const code = otp.join('')
    if (code.length < 6) { setError('Entrez les 6 chiffres du code'); return }
    setLoading(true)
    try {
      const res = await confirmerEmail(code)
      const clientData = { ...res.data.client, role: 'client', access_token: res.data.access_token }
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(clientData))
      if (setUser) setUser(clientData)
      navigate('/client/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Code incorrect ou expiré')
      setOtp(['','','','','','']); otpRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (!canResend) return
    setError(''); setSuccess('')
    try {
      await renvoyerConfirmation({ email: pendingEmail, password: pendingPassword })
      setSuccess('Nouveau code envoyé !'); setCountdown(60); setCanResend(false)
      setOtp(['','','','','','']); otpRefs.current[0]?.focus()
    } catch { setError('Impossible de renvoyer le code') }
  }

  async function handleForgot(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await demanderResetMdpClient(resetEmail.trim())
      setSuccess('Code envoyé si cet email est enregistré.')
      goTo('reset-code')
    } catch (err) {
      setError('Une erreur est survenue. Réessayez.')
    } finally { setLoading(false) }
  }

  async function handleResetCode(e) {
    e.preventDefault(); setError('')
    const code = otp.join('')
    if (code.length < 6) { setError('Entrez les 6 chiffres du code'); return }
    if (newPassword.length < 6) { setError('Mot de passe : 6 caractères minimum'); return }
    setLoading(true)
    try {
      await resetMdpClient(resetEmail.trim(), code, newPassword)
      setSuccess('Mot de passe réinitialisé ! Vous pouvez vous connecter.')
      goTo('login')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Code incorrect ou expiré')
    } finally { setLoading(false) }
  }

  // ── Ticket wrapper ────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `linear-gradient(rgba(26,20,16,0.62), rgba(26,20,16,0.72)), url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=80')`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: mono,
    }}>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      <div style={{
        width: '100%', maxWidth: 420,
        background: CREAM, borderRadius: 4,
        boxShadow: '0 8px 40px rgba(26,20,16,0.35), 0 2px 8px rgba(26,20,16,0.15)',
        overflow: 'visible', position: 'relative',
      }}>
        {/* Top perforation holes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px', marginTop: -10 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: PAPER, border: `1px solid rgba(26,20,16,0.08)` }} />
          ))}
        </div>

        <div style={{ padding: '20px 28px 28px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: bebas, fontSize: 40, color: INK, letterSpacing: '0.12em', lineHeight: 1 }}>SKY07</div>
            <div style={{ fontFamily: mono, fontSize: 9, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>
              Programme Fidélité
            </div>
          </div>

          <PerfoRow />
          <div style={{ marginTop: 20 }}>

            {/* ── LOGIN ── */}
            {screen === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontFamily: serif, fontSize: 20, color: INK, marginBottom: 4 }}>Connexion</div>
                <TicketInput label="Email">
                  <input type="email" required placeholder="vous@email.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} style={fieldStyle}
                    onFocus={e => e.target.style.borderColor = GOLD}
                    onBlur={e => e.target.style.borderColor = 'rgba(26,20,16,0.18)'} />
                </TicketInput>
                <TicketInput label="Mot de passe">
                  <div style={{ position: 'relative' }}>
                    <input type={showPwd ? 'text' : 'password'} required placeholder="••••••••" value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      style={{ ...fieldStyle, paddingRight: 40 }}
                      onFocus={e => e.target.style.borderColor = GOLD}
                      onBlur={e => e.target.style.borderColor = 'rgba(26,20,16,0.18)'} />
                    <button type="button" onClick={() => setShowPwd(s => !s)} style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 11, fontFamily: mono,
                    }}>{showPwd ? 'HIDE' : 'SHOW'}</button>
                  </div>
                </TicketInput>
                <Alert msg={error} type="error" />
                <Btn loading={loading}>→ ENTRER</Btn>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <button type="button" onClick={() => goTo('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.05em' }}>
                    Pas de compte ? Créer
                  </button>
                  <button type="button" onClick={() => { setResetEmail(form.email); goTo('forgot') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.05em' }}>
                    Mot de passe oublié ?
                  </button>
                </div>
              </form>
            )}

            {/* ── REGISTER ── */}
            {screen === 'register' && (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontFamily: serif, fontSize: 20, color: INK, marginBottom: 4 }}>Nouveau compte</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <TicketInput label="Prénom">
                    <input required placeholder="Yasser" value={form.prenom}
                      onChange={e => setForm({ ...form, prenom: e.target.value })} style={fieldStyle}
                      onFocus={e => e.target.style.borderColor = GOLD}
                      onBlur={e => e.target.style.borderColor = 'rgba(26,20,16,0.18)'} />
                  </TicketInput>
                  <TicketInput label="Nom">
                    <input required placeholder="Benali" value={form.nom}
                      onChange={e => setForm({ ...form, nom: e.target.value })} style={fieldStyle}
                      onFocus={e => e.target.style.borderColor = GOLD}
                      onBlur={e => e.target.style.borderColor = 'rgba(26,20,16,0.18)'} />
                  </TicketInput>
                </div>
                <TicketInput label="Email">
                  <input type="email" required placeholder="vous@email.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} style={fieldStyle}
                    onFocus={e => e.target.style.borderColor = GOLD}
                    onBlur={e => e.target.style.borderColor = 'rgba(26,20,16,0.18)'} />
                </TicketInput>
                <TicketInput label="Mot de passe (6 caractères min)">
                  <div style={{ position: 'relative' }}>
                    <input type={showPwd ? 'text' : 'password'} required placeholder="••••••••" value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      style={{ ...fieldStyle, paddingRight: 40 }}
                      onFocus={e => e.target.style.borderColor = GOLD}
                      onBlur={e => e.target.style.borderColor = 'rgba(26,20,16,0.18)'} />
                    <button type="button" onClick={() => setShowPwd(s => !s)} style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 11, fontFamily: mono,
                    }}>{showPwd ? 'HIDE' : 'SHOW'}</button>
                  </div>
                </TicketInput>
                <TicketInput label="Code parrainage (optionnel)">
                  <div style={{ position: 'relative' }}>
                    <input type="text" placeholder="SKY-YASSER-4F2A" maxLength={20}
                      value={form.code_parrainage}
                      onChange={e => { const v = e.target.value.toUpperCase(); setForm({...form, code_parrainage: v}); verifierCode(v) }}
                      style={{
                        ...fieldStyle, paddingRight: 36, letterSpacing: '0.08em',
                        ...(codeStatus === 'valid' ? { borderColor: GOLD } : {}),
                        ...(codeStatus === 'invalid' ? { borderColor: RED } : {}),
                      }}
                      onFocus={e => { if (!codeStatus) e.target.style.borderColor = GOLD }}
                      onBlur={e => { if (!codeStatus) e.target.style.borderColor = 'rgba(26,20,16,0.18)' }} />
                    <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: mono, fontSize: 10 }}>
                      {codeStatus === 'checking' && <span style={{ color: MUTED }}>…</span>}
                      {codeStatus === 'valid'    && <span style={{ color: GOLD }}>✓</span>}
                      {codeStatus === 'invalid'  && <span style={{ color: RED }}>✗</span>}
                    </div>
                  </div>
                  {codeStatus === 'valid' && codeInfo && <div style={{ fontFamily: mono, fontSize: 10, color: GOLD, marginTop: 3 }}>Parrain: {codeInfo.parrain_prenom} — +{codeInfo.points_filleul} pts</div>}
                  {codeStatus === 'invalid' && codeInfo && <div style={{ fontFamily: mono, fontSize: 10, color: RED, marginTop: 3 }}>{codeInfo.message}</div>}
                </TicketInput>

                <PerfoRow />

                {/* Email consent */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.accept_emails}
                    onChange={e => setForm({ ...form, accept_emails: e.target.checked })}
                    style={{ marginTop: 3, accentColor: GOLD, flexShrink: 0, width: 14, height: 14 }} />
                  <span style={{ fontFamily: mono, fontSize: 10, color: MUTED, lineHeight: 1.5, letterSpacing: '0.04em' }}>
                    J'accepte de recevoir des emails promotionnels de SKY07 (offres, nouveaux plats, événements). Vous pouvez vous désabonner à tout moment.
                  </span>
                </label>

                {/* Terms */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.accept_terms}
                    onChange={e => setForm({ ...form, accept_terms: e.target.checked })}
                    style={{ marginTop: 3, accentColor: INK, flexShrink: 0, width: 14, height: 14 }} />
                  <span style={{ fontFamily: mono, fontSize: 10, color: INK, lineHeight: 1.5, letterSpacing: '0.04em' }}>
                    J'ai lu et j'accepte le{' '}
                    <button type="button" onClick={() => setShowTerms(true)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: mono, fontSize: 10, color: RED, textDecoration: 'underline', padding: 0,
                    }}>règlement d'utilisation</button>
                    {' '}de l'application SKY07. <span style={{ color: RED }}>*</span>
                  </span>
                </label>

                <Alert msg={error} type="error" />
                <Btn loading={loading}>→ CRÉER MON TICKET</Btn>
                <button type="button" onClick={() => goTo('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, color: MUTED, letterSpacing: '0.05em', textAlign: 'center' }}>
                  ← Retour connexion
                </button>
              </form>
            )}

            {/* ── VERIFY EMAIL ── */}
            {screen === 'verify-email' && (
              <form onSubmit={handleVerifyEmail} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontFamily: serif, fontSize: 20, color: INK, marginBottom: 2 }}>Vérification email</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, lineHeight: 1.6 }}>
                  Code envoyé à <span style={{ color: INK }}>{pendingEmail}</span>
                </div>
                <OtpBox otp={otp} otpRefs={otpRefs} onChange={handleOtp} onKeyDown={handleOtpKey} onPaste={handleOtpPaste} />
                <Alert msg={error} type="error" />
                <Alert msg={success} type="success" />
                <Btn loading={loading} disabled={otp.join('').length < 6}>→ CONFIRMER</Btn>
                <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 10, color: MUTED }}>
                  {canResend
                    ? <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontFamily: mono, fontSize: 10 }}>Renvoyer le code</button>
                    : <span>Renvoyer dans <span style={{ color: INK }}>{countdown}s</span></span>
                  }
                </div>
                <button type="button" onClick={() => goTo('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, color: MUTED, textAlign: 'center' }}>
                  ← Retour connexion
                </button>
              </form>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {screen === 'forgot' && (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontFamily: serif, fontSize: 20, color: INK, marginBottom: 2 }}>Mot de passe oublié</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, lineHeight: 1.6 }}>
                  Entrez votre email — nous vous envoyons un code à 6 chiffres.
                </div>
                <TicketInput label="Email">
                  <input type="email" required placeholder="vous@email.com" value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)} style={fieldStyle}
                    onFocus={e => e.target.style.borderColor = GOLD}
                    onBlur={e => e.target.style.borderColor = 'rgba(26,20,16,0.18)'} />
                </TicketInput>
                <Alert msg={error} type="error" />
                <Alert msg={success} type="success" />
                <Btn loading={loading}>→ ENVOYER LE CODE</Btn>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button type="button" onClick={() => { setOtp(['','','','','','']); goTo('reset-code') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, color: GOLD, letterSpacing: '0.05em' }}>
                    J'ai déjà un code →
                  </button>
                </div>
                <button type="button" onClick={() => goTo('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, color: MUTED, textAlign: 'center' }}>
                  ← Retour connexion
                </button>
              </form>
            )}

            {/* ── RESET CODE ── */}
            {screen === 'reset-code' && (
              <form onSubmit={handleResetCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontFamily: serif, fontSize: 20, color: INK, marginBottom: 2 }}>Nouveau mot de passe</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: MUTED, lineHeight: 1.6 }}>
                  Code envoyé à <span style={{ color: INK }}>{resetEmail}</span>
                </div>
                <OtpBox otp={otp} otpRefs={otpRefs} onChange={handleOtp} onKeyDown={handleOtpKey} onPaste={handleOtpPaste} />
                <TicketInput label="Nouveau mot de passe">
                  <div style={{ position: 'relative' }}>
                    <input type={showNewPwd ? 'text' : 'password'} required placeholder="••••••••" value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={{ ...fieldStyle, paddingRight: 40 }}
                      onFocus={e => e.target.style.borderColor = GOLD}
                      onBlur={e => e.target.style.borderColor = 'rgba(26,20,16,0.18)'} />
                    <button type="button" onClick={() => setShowNewPwd(s => !s)} style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 11, fontFamily: mono,
                    }}>{showNewPwd ? 'HIDE' : 'SHOW'}</button>
                  </div>
                </TicketInput>
                <Alert msg={error} type="error" />
                <Alert msg={success} type="success" />
                <Btn loading={loading} disabled={otp.join('').length < 6 || newPassword.length < 6}>
                  → RÉINITIALISER
                </Btn>
                <button type="button" onClick={() => goTo('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, color: MUTED, textAlign: 'center' }}>
                  ← Renvoyer un code
                </button>
              </form>
            )}

          </div>

          <PerfoRow />

          {/* Footer ticket */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.12em' }}>RESTAURANT</div>
              <div style={{ fontFamily: bebas, fontSize: 18, color: INK, letterSpacing: '0.1em' }}>SKY07</div>
              <div style={{ fontFamily: mono, fontSize: 8, color: MUTED, letterSpacing: '0.08em' }}>CASABLANCA</div>
            </div>
            <Barcode width={90} height={22} />
          </div>
        </div>

        {/* Bottom perforation holes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px', marginBottom: -10 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: PAPER, border: `1px solid rgba(26,20,16,0.08)` }} />
          ))}
        </div>
      </div>

      <style>{`
        input::placeholder { color: ${MUTED}; opacity: 0.6; }
        input:focus { outline: none; }
      `}</style>
    </div>
  )
}
