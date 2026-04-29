import React, { useState } from 'react'
import { clientLogin, clientRegister } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { User, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'

export default function ClientLogin() {
  const { setUser } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = isLogin
        ? await clientLogin({ email: form.email, password: form.password })
        : await clientRegister(form)
      const clientData = { ...res.data.client, role: 'client', access_token: res.data.access_token }
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(clientData))
      if (setUser) setUser(clientData)
      navigate('/client/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail
      if (typeof msg === 'string') setError(msg)
      else if (Array.isArray(msg)) setError(msg[0]?.msg || 'Erreur de validation')
      else setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] px-4 py-3 text-[#f5f0e8] placeholder-[#a89880] text-sm focus:outline-none focus:border-[#e8824a] focus:ring-1 focus:ring-[rgba(232,130,74,0.3)] transition-all"
  const labelClass = "block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a89880] mb-1.5"

  return (
    <div className="min-h-screen bg-[#0a1408] flex items-center justify-center p-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(232,130,74,0.06) 0%, transparent 60%)' }}>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#e8824a] mb-2"
            style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 0 32px rgba(232,130,74,0.4)' }}>
            SKY07
          </h1>
          <p className="text-[#a89880] text-sm">Espace fidélité client</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a2e1a] border border-[rgba(232,130,74,0.15)] rounded-[20px] p-8 shadow-2xl">

          {/* Tabs */}
          <div className="flex bg-[rgba(255,255,255,0.04)] rounded-[10px] p-1 mb-7">
            <button onClick={() => { setIsLogin(true); setError('') }}
              className={`flex-1 py-2.5 rounded-[8px] text-sm font-semibold transition-all ${isLogin ? 'bg-[#e8824a] text-black shadow' : 'text-[#a89880] hover:text-[#f5f0e8]'}`}>
              Se connecter
            </button>
            <button onClick={() => { setIsLogin(false); setError('') }}
              className={`flex-1 py-2.5 rounded-[8px] text-sm font-semibold transition-all ${!isLogin ? 'bg-[#e8824a] text-black shadow' : 'text-[#a89880] hover:text-[#f5f0e8]'}`}>
              Créer un compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Prénom</label>
                  <input type="text" required placeholder="Yasser" className={inputClass}
                    value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Nom</label>
                  <input type="text" required placeholder="Lahrouni" className={inputClass}
                    value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a89880]" />
                <input type="email" required placeholder="vous@email.com"
                  className={inputClass + " pl-10"}
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a89880]" />
                <input type={showPwd ? 'text' : 'password'} required placeholder="••••••••"
                  className={inputClass + " pl-10 pr-10"}
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a89880] hover:text-[#f5f0e8]">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-[8px] px-3 py-2">
                <p className="text-red-400 text-xs text-center">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-[#e8824a] hover:bg-[#d4703a] text-black font-bold py-3.5 rounded-[10px] transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              style={{ boxShadow: '0 4px 16px rgba(232,130,74,0.3)' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />}
              {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "Créer mon compte")}
            </button>
          </form>
        </div>

        <p className="text-center text-[#a89880] text-xs mt-6">
          © 2026 SKY07 — Programme de fidélité
        </p>
      </div>
    </div>
  )
}
