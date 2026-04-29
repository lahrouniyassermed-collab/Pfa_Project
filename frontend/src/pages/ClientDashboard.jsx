import React, { useState, useEffect, useRef } from 'react'
import { getClientDashboard, claimGoogleBonus } from '../services/api'
import SpinWheel from '../components/client/SpinWheel'
import { useNavigate } from 'react-router-dom'
import {
  Star, LogOut, Upload, Camera, CheckCircle, XCircle,
  Loader2, BarChart3, Trophy, X, ExternalLink, Clock
} from 'lucide-react'

export default function ClientDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claimingStep, setClaimingStep] = useState(1)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [uploadStatus, setUploadStatus] = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  async function loadData() {
    try {
      const res = await getClientDashboard()
      setData(res.data)
    } catch (err) {
      if (err.response?.status === 401) navigate('/client/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  function handleOpenGoogle() {
    window.open('https://maps.google.com/?q=SKY07+Restaurant', '_blank')
    setClaimingStep(2)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  async function handleUpload() {
    if (!selectedFile) return
    setClaimingStep(3)
    setLoadingMsg('Vérification de votre capture…')
    setTimeout(() => setLoadingMsg('Analyse de votre avis Google…'), 1500)
    setTimeout(() => setLoadingMsg('Validation en cours…'), 3000)
    try {
      const res = await claimGoogleBonus(selectedFile)
      setTimeout(() => {
        const { status, message } = res.data
        setUploadStatus({ success: status === 'valide' || status === 'en_attente', status, message })
        setClaimingStep(4)
        loadData()
      }, 4500)
    } catch (err) {
      setUploadStatus({ success: false, message: err.response?.data?.detail || 'Une erreur est survenue.' })
      setClaimingStep(4)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/client/login')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a1408] flex items-center justify-center">
      <Loader2 size={40} className="animate-spin text-[#e8824a]" />
    </div>
  )

  const canSpin = !data.derniere_date_spin ||
    new Date(data.derniere_date_spin).getMonth() !== new Date().getMonth() ||
    new Date(data.derniere_date_spin).getFullYear() !== new Date().getFullYear()

  const canClaimAvis = !data.derniere_date_avis ||
    new Date(data.derniere_date_avis).getMonth() !== new Date().getMonth() ||
    new Date(data.derniere_date_avis).getFullYear() !== new Date().getFullYear()

  const cardGlass = "bg-[rgba(255,255,255,0.04)] backdrop-blur-sm border border-[rgba(255,255,255,0.08)] rounded-[16px] p-6 transition-all hover:border-[rgba(232,130,74,0.2)]"

  return (
    <div className="min-h-screen bg-[#0a1408] text-[#f5f0e8] pb-12"
      style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(232,130,74,0.05) 0%, transparent 50%)' }}>

      {/* Header */}
      <div className="max-w-4xl mx-auto flex justify-between items-center px-4 py-6">
        <div>
          <h1 className="text-xl font-bold">Bonjour, {data.prenom}</h1>
          <p className="text-[#a89880] text-sm mt-0.5">Espace fidélité SKY07</p>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)] px-4 py-2 rounded-[10px] text-sm transition-all">
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-5">

        {/* Solde points */}
        <div className="bg-gradient-to-br from-[#1a2e1a] to-[#0f1f0e] border border-[rgba(232,130,74,0.2)] rounded-[20px] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#e8824a] opacity-5 blur-3xl rounded-full -mr-24 -mt-24 pointer-events-none" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a89880] mb-2">Solde fidélité</p>
          <div className="flex items-baseline gap-3">
            <span className="text-7xl font-black text-white leading-none">{data.points}</span>
            <div>
              <span className="text-[#e8824a] font-bold text-lg">POINTS</span>
              <div className="flex items-center gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className={i < Math.min(5, Math.floor(data.points / 100)) ? 'text-[#e8824a] fill-[#e8824a]' : 'text-[#a89880]'} />
                ))}
              </div>
            </div>
          </div>
          <p className="text-[#a89880] text-xs mt-4">Les points expirent après 60 jours d'inactivité.</p>
        </div>

        {/* Roue */}
        <div className={cardGlass}>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Roue de la Fortune</h2>
            <p className="text-[#a89880] text-sm mt-1">Une tentative par mois</p>
          </div>
          <SpinWheel points={data.points} canSpin={canSpin} coutSpin={data.config.cout_spin} onWin={loadData} />
        </div>

        {/* Avis Google + Stats */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* Avis Google */}
          <div className={cardGlass}>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <ExternalLink size={16} className="text-[#e8824a]" />
              Avis Google
            </h3>

            {claimingStep === 1 && (
              <>
                <p className="text-[#a89880] text-sm mb-5 leading-relaxed">
                  Partagez votre expérience sur Google Maps et gagnez{' '}
                  <span className="text-[#e8824a] font-bold">{data.config.points_avis} points</span> ce mois-ci.
                </p>
                <button onClick={handleOpenGoogle} disabled={!canClaimAvis}
                  className={`w-full py-3 rounded-[10px] font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    !canClaimAvis
                      ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e] cursor-not-allowed border border-[rgba(34,197,94,0.3)]'
                      : 'bg-[#e8824a] text-black hover:bg-[#d4703a]'
                  }`} style={canClaimAvis ? { boxShadow: '0 4px 16px rgba(232,130,74,0.3)' } : {}}>
                  {!canClaimAvis ? <><CheckCircle size={15} /> Bonus récupéré ce mois</> : <><Star size={15} /> Donner mon avis (+{data.config.points_avis} pts)</>}
                </button>
              </>
            )}

            {claimingStep === 2 && (
              <div className="space-y-4">
                <p className="text-[#a89880] text-sm">Uploadez la capture de votre avis Google pour valider :</p>
                <div onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[rgba(232,130,74,0.4)] hover:border-[#e8824a] bg-[rgba(255,255,255,0.03)] rounded-[12px] p-4 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px]">
                  {previewUrl ? (
                    <div className="relative w-full">
                      <img src={previewUrl} alt="Preview" className="w-full h-28 object-contain rounded-lg" />
                      <button onClick={e => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null) }}
                        className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Camera size={28} className="text-[#a89880] mb-2" />
                      <span className="text-xs text-[#a89880] text-center font-semibold uppercase tracking-widest">Cliquez pour uploader</span>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <button onClick={handleUpload} disabled={!selectedFile}
                  className={`w-full py-3 rounded-[10px] font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    !selectedFile ? 'bg-[rgba(255,255,255,0.05)] text-[#a89880] cursor-not-allowed' : 'bg-[#e8824a] text-black hover:bg-[#d4703a]'
                  }`}>
                  <Upload size={15} /> Valider mon avis
                </button>
                <button onClick={() => setClaimingStep(1)} className="w-full text-xs text-[#a89880] hover:text-[#f5f0e8] transition-colors py-1">
                  Retour
                </button>
              </div>
            )}

            {claimingStep === 3 && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader2 size={36} className="animate-spin text-[#e8824a]" />
                <p className="text-[#e8824a] font-medium text-sm text-center">{loadingMsg}</p>
              </div>
            )}

            {claimingStep === 4 && (
              <div className="text-center py-6 space-y-4">
                {uploadStatus?.success
                  ? <CheckCircle size={52} className="text-[#22c55e] mx-auto" />
                  : <XCircle size={52} className="text-[#ef4444] mx-auto" />
                }
                <p className={`text-sm font-semibold leading-relaxed ${uploadStatus?.success ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {uploadStatus?.message}
                </p>
                <button onClick={() => setClaimingStep(1)}
                  className="bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.12)] text-[#f5f0e8] px-6 py-2 rounded-[10px] text-sm transition-all">
                  Fermer
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className={cardGlass}>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-[#e8824a]" />
              Statistiques
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[rgba(255,255,255,0.04)] rounded-[10px]">
                <span className="text-[#a89880] text-sm">Spins ce mois</span>
                <span className="font-bold text-sm">{data.spin_count_mois} / 1</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[rgba(255,255,255,0.04)] rounded-[10px]">
                <span className="text-[#a89880] text-sm">Gains totaux</span>
                <span className="font-bold text-sm">{data.historique_gains.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[rgba(255,255,255,0.04)] rounded-[10px]">
                <span className="text-[#a89880] text-sm">Avis ce mois</span>
                <span className="font-bold text-sm">{data.avis_google_mois ? '1 / 1' : '0 / 1'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Historique gains */}
        <div className={cardGlass}>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <Trophy size={18} className="text-[#e8824a]" />
            Mes Gains
          </h2>
          {data.historique_gains.length === 0 ? (
            <div className="text-center py-10">
              <Trophy size={32} className="text-[#a89880] mx-auto mb-3 opacity-40" />
              <p className="text-[#a89880] text-sm">Aucun gain pour l'instant. Faites tourner la roue !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.historique_gains.map(gain => (
                <div key={gain.id} className="flex justify-between items-center p-4 bg-[rgba(255,255,255,0.04)] rounded-[12px] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(232,130,74,0.2)] transition-all">
                  <div>
                    <h4 className="font-semibold text-[#e8824a] text-sm">{gain.nom_prix}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock size={11} className="text-[#a89880]" />
                      <p className="text-xs text-[#a89880]">{new Date(gain.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    {gain.description && <p className="text-xs text-[#a89880] mt-1">{gain.description}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    gain.statut === 'utilise'
                      ? 'bg-[rgba(255,255,255,0.06)] text-[#a89880]'
                      : 'bg-[rgba(232,130,74,0.15)] text-[#e8824a]'
                  }`}>
                    {gain.statut === 'utilise' ? 'Utilisé' : 'Disponible'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
