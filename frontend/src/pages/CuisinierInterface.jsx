import { useEffect, useState, useCallback, useRef } from 'react'
import { getCommandesCuisine, majStatutCommande, majStatutLigne, getKDSAlertes, acquitterAlerte, ruptureStock } from '../services/api'
import { Wifi, WifiOff, RefreshCw, ChefHat, Clock, AlertTriangle, CheckCircle2, Flame, X, BellRing } from 'lucide-react'

// ── Timer live ────────────────────────────────────────────────────────────────
function Timer({ dateHeure }) {
  const [elapsed, setElapsed] = useState('')
  const [mins, setMins] = useState(0)

  useEffect(() => {
    function calc() {
      const diff = Math.floor((Date.now() - new Date(dateHeure).getTime()) / 1000)
      setMins(Math.floor(diff / 60))
      if (diff < 60) return `${diff}s`
      if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`
      return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
    }
    setElapsed(calc())
    const id = setInterval(() => setElapsed(calc()), 1000)
    return () => clearInterval(id)
  }, [dateHeure])

  const color = mins >= 15 ? 'text-red-400' : mins >= 8 ? 'text-amber-400' : 'text-gray-400'
  const urgent = mins >= 15

  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      {urgent ? <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> : <Clock className="w-3.5 h-3.5" />}
      <span className="text-xs font-bold tabular-nums">{elapsed}</span>
      {urgent && <span className="text-xs font-black tracking-widest animate-pulse">URGENT</span>}
    </div>
  )
}

// ── Horloge header ────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-sm text-gray-400 tabular-nums">{time}</span>
}

// ── Badge emplacement ─────────────────────────────────────────────────────────
const EMPL = {
  interieur:  { label: 'Intérieur',  cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  terrasse:   { label: 'Terrasse',   cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  mezzanine:  { label: 'Mezzanine',  cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ lignes }) {
  const total  = lignes.length
  const done   = lignes.filter(l => l.statut === 'prete').length
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0
  const color  = pct === 100 ? 'bg-emerald-400' : pct > 0 ? 'bg-amber-400' : 'bg-gray-600'

  return (
    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Card commande ─────────────────────────────────────────────────────────────
function CommandeCard({ cmd, onStartCommande, onMarkLigne, onRupture, loadingLines }) {
  const allPret  = cmd.lignes.length > 0 && cmd.lignes.every(l => l.statut === 'prete')
  const empl     = cmd.table?.emplacement ? EMPL[cmd.table.emplacement] : null
  const mins     = Math.floor((Date.now() - new Date(cmd.date_heure).getTime()) / 60000)
  const isUrgent = mins >= 15

  const borderColor = allPret
    ? 'border-emerald-500/50'
    : cmd.statut === 'en_preparation'
    ? 'border-amber-500/40'
    : 'border-blue-500/40'

  const headerBg = allPret
    ? 'bg-emerald-900/40'
    : cmd.statut === 'en_preparation'
    ? 'bg-amber-900/30'
    : 'bg-blue-900/30'

  const glowClass = allPret ? 'shadow-[0_0_20px_rgba(52,211,153,0.15)]' : ''

  return (
    <div className={`flex flex-col bg-[#161b22] border rounded-2xl overflow-hidden transition-all duration-300 ${borderColor} ${glowClass} ${isUrgent && !allPret ? 'ring-1 ring-red-500/40' : ''}`}>

      {/* Header */}
      <div className={`${headerBg} px-4 py-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {cmd.table && (
              <span className="text-white font-black text-2xl leading-none">
                T{cmd.table.numero}
              </span>
            )}
            {empl && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${empl.cls}`}>
                {empl.label}
              </span>
            )}
            {cmd.origine === 'qr_table' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                📱 QR
              </span>
            )}
          </div>
          <Timer dateHeure={cmd.date_heure} />
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-mono text-gray-500">{cmd.code_unique}</span>
          {allPret && (
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold">Tout prêt</span>
            </div>
          )}
          {cmd.statut === 'en_preparation' && !allPret && (
            <div className="flex items-center gap-1 text-amber-400">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">En préparation</span>
            </div>
          )}
          {cmd.statut === 'envoyee' && (
            <span className="text-xs font-semibold text-blue-400">Nouvelle</span>
          )}
        </div>

        <div className="mt-2">
          <ProgressBar lignes={cmd.lignes} />
        </div>
      </div>

      {/* Lignes */}
      <div className="flex-1 px-3 py-3 space-y-2">
        {cmd.lignes.map(l => {
          const isDone    = l.statut === 'prete'
          const isInPrep  = l.statut === 'en_preparation'
          const isLoading = loadingLines.has(l.id)

          return (
            <div
              key={l.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
                l.statut === 'annulee' || l.statut === 'rupture'
                  ? 'bg-red-900/20 border-red-700/30 opacity-60'
                  : l.statut === 'remplacee'
                  ? 'bg-purple-900/20 border-purple-700/30 opacity-50'
                  : isDone
                  ? 'bg-emerald-900/20 border-emerald-700/30'
                  : isInPrep
                  ? 'bg-amber-900/20 border-amber-700/30'
                  : 'bg-[#0d1117] border-gray-700/50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm leading-snug ${
                  l.statut === 'annulee' || l.statut === 'rupture' ? 'text-red-400 line-through' :
                  l.statut === 'remplacee' ? 'text-purple-400 line-through' :
                  isDone ? 'text-emerald-400 line-through decoration-emerald-600' : 'text-white'
                }`}>
                  <span className={`inline-block w-6 text-center rounded font-black mr-1.5 text-xs py-0.5 ${
                    isDone ? 'bg-emerald-800 text-emerald-300' : 'bg-gray-700 text-gray-300'
                  }`}>{l.quantite}×</span>
                  {l.plat_nom}
                </p>
                {l.note && (
                  <p className="text-xs text-amber-300 bg-amber-900/30 border border-amber-700/40 px-2 py-1 rounded-lg mt-1.5 leading-snug">
                    📝 {l.note}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  {l.statut === 'annulee'   && <span className="text-xs font-bold text-red-400">✕ ANNULÉ</span>}
                  {l.statut === 'rupture'   && <span className="text-xs font-bold text-red-300">⛔ RUPTURE</span>}
                  {l.statut === 'remplacee' && <span className="text-xs font-bold text-purple-400">→ REMPLACÉ</span>}
                  {isDone   && l.statut !== 'annulee' && <span className="text-xs font-semibold text-emerald-400">✓ Prêt</span>}
                  {isInPrep && !isDone && <span className="text-xs font-semibold text-amber-400">En préparation…</span>}
                  {!isDone && !isInPrep && l.statut === 'en_cours' && <span className="text-xs text-gray-500">En attente</span>}
                </div>
              </div>

              {!isDone && l.statut !== 'annulee' && l.statut !== 'rupture' && l.statut !== 'remplacee' && (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => onMarkLigne(l.id, l.statut)}
                    disabled={isLoading}
                    className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${
                      isInPrep
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : 'bg-amber-500 hover:bg-amber-400 text-white shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    }`}
                  >
                    {isLoading
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                      : isInPrep ? '✓' : '▶'
                    }
                  </button>
                  <button
                    onClick={() => onRupture(l.id)}
                    title="Rupture de stock"
                    className="shrink-0 flex items-center justify-center w-10 h-7 rounded-lg bg-red-900/60 hover:bg-red-700 text-red-300 text-xs font-bold transition-all"
                  >
                    ⛔
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action prendre en charge */}
      {cmd.statut === 'envoyee' && (
        <div className="px-3 pb-3">
          <button
            onClick={() => onStartCommande(cmd.id)}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black font-bold py-3 rounded-xl transition-all text-sm shadow-[0_0_16px_rgba(251,191,36,0.25)]"
          >
            <Flame className="w-4 h-4" />
            Prendre en charge
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CuisinierInterface() {
  const [commandes,    setCommandes]    = useState([])
  const [alertes,      setAlertes]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [online,       setOnline]       = useState(true)
  const [lastSync,     setLastSync]     = useState(null)
  const [toast,        setToast]        = useState(null)
  const [loadingLines, setLoadingLines] = useState(new Set())
  const toastRef = useRef(null)

  const notify = (msg, type = 'success') => {
    clearTimeout(toastRef.current)
    setToast({ msg, type })
    toastRef.current = setTimeout(() => setToast(null), 2800)
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [rc, ra] = await Promise.all([getCommandesCuisine(), getKDSAlertes()])
      setCommandes(rc.data)
      setAlertes(ra.data)
      setOnline(true)
      setLastSync(new Date())
    } catch {
      setOnline(false)
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleAcquitter(id) {
    await acquitterAlerte(id)
    setAlertes(prev => prev.filter(a => a.id !== id))
  }

  async function handleRupture(ligneId) {
    try {
      await ruptureStock(ligneId)
      notify('Rupture signalée — remboursement déclenché')
      load(true)
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), 5000)
    return () => clearInterval(id)
  }, [load])

  async function handleStartCommande(id) {
    try {
      await majStatutCommande(id, 'en_preparation')
      notify('Commande prise en charge')
      load(true)
    } catch (e) { notify(e.response?.data?.detail || 'Erreur', 'error') }
  }

  async function handleMarkLigne(id, currentStatut) {
    const next = currentStatut === 'en_cours' ? 'en_preparation' : 'prete'
    setLoadingLines(prev => new Set(prev).add(id))
    try {
      await majStatutLigne(id, next)
      load(true)
    } catch (e) {
      notify(e.response?.data?.detail || 'Erreur', 'error')
    } finally {
      setLoadingLines(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const nbEnAttente    = commandes.filter(c => c.statut === 'envoyee').length
  const nbEnPrep       = commandes.filter(c => c.statut === 'en_preparation').length
  const nbPrets        = commandes.filter(c => c.lignes.every(l => l.statut === 'prete') && c.lignes.length > 0).length

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col">

      {/* ── Header sticky ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0d1117]/95 backdrop-blur border-b border-gray-800 px-5 py-3 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.4)]">
            <ChefHat className="w-5 h-5 text-black" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-black tracking-widest text-amber-400 leading-none">MANGERMANGER</p>
            <p className="text-xs text-gray-500 leading-none mt-0.5">Kitchen Display</p>
          </div>
        </div>

        {/* Compteurs */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-blue-300">{nbEnAttente} nouvelle{nbEnAttente > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">{nbEnPrep} en prépa</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300">{nbPrets} prête{nbPrets > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Droite : wifi + clock + refresh */}
        <div className="flex items-center gap-3 shrink-0">
          {alertes.length > 0 && (
            <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 rounded-lg px-2 py-1">
              <BellRing className="w-3.5 h-3.5 text-red-400 animate-bounce" />
              <span className="text-xs font-bold text-red-300">{alertes.length}</span>
            </div>
          )}
          {online
            ? <Wifi className="w-4 h-4 text-emerald-400" />
            : <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
          }
          <LiveClock />
          <button
            onClick={() => load(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Contenu ───────────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-5">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            <p className="text-gray-500 text-sm">Chargement des commandes…</p>
          </div>

        ) : !online && commandes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-500">
            <WifiOff className="w-12 h-12 text-red-500/50" />
            <p className="font-semibold text-red-400">Connexion perdue</p>
            <button onClick={() => load(false)} className="text-sm text-amber-400 underline">Réessayer</button>
          </div>

        ) : commandes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-600">
            <div className="w-20 h-20 rounded-3xl bg-gray-800/60 flex items-center justify-center mb-2">
              <ChefHat className="w-10 h-10 text-gray-700" />
            </div>
            <p className="text-lg font-bold text-gray-500">Cuisine libre</p>
            <p className="text-sm text-gray-600">Aucune commande en attente</p>
            {lastSync && (
              <p className="text-xs text-gray-700 mt-1">
                Synchronisé à {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>

        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {commandes.map(cmd => (
              <CommandeCard
                key={cmd.id}
                cmd={cmd}
                onStartCommande={handleStartCommande}
                onMarkLigne={handleMarkLigne}
                onRupture={handleRupture}
                loadingLines={loadingLines}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Overlay alertes KDS ──────────────────────────────────────────── */}
      {alertes.length > 0 && (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
          {alertes.map(a => {
            const cfg = {
              rupture:       { bg: 'bg-red-900 border-red-500',    icon: '⛔', label: 'RUPTURE' },
              annulation:    { bg: 'bg-red-800 border-red-400',    icon: '✕',  label: 'ANNULÉ'  },
              note_modifiee: { bg: 'bg-amber-900 border-amber-400',icon: '⚠',  label: 'NOTE'    },
              mauvaise_table:{ bg: 'bg-purple-900 border-purple-400',icon:'⚡', label: 'VÉRIFIER'},
              ajout:         { bg: 'bg-blue-900 border-blue-400',  icon: '+',  label: 'AJOUT'   },
            }[a.type] || { bg: 'bg-gray-800 border-gray-600', icon: '!', label: 'ALERTE' }

            return (
              <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border text-white text-xs shadow-2xl ${cfg.bg}`}>
                <span className="text-base shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className={`font-black text-xs uppercase tracking-widest mr-1 ${
                    a.type === 'rupture' ? 'text-red-300' :
                    a.type === 'note_modifiee' ? 'text-amber-300' :
                    a.type === 'ajout' ? 'text-blue-300' : 'text-white'
                  }`}>{cfg.label}</span>
                  <span className="text-gray-200">{a.message}</span>
                </div>
                <button onClick={() => handleAcquitter(a.id)} className="shrink-0 text-gray-400 hover:text-white p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
          {alertes.length > 1 && (
            <button
              onClick={() => Promise.all(alertes.map(a => acquitterAlerte(a.id))).then(() => setAlertes([]))}
              className="text-xs text-gray-500 hover:text-white text-center py-1"
            >
              Tout acquitter ({alertes.length})
            </button>
          )}
        </div>
      )}

      {/* ── Compteur alertes dans le header ───────────────────────────────── */}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl backdrop-blur transition-all ${
          toast.type === 'error'
            ? 'bg-red-500/90 text-white'
            : 'bg-emerald-500/90 text-white'
        }`}>
          {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
        </div>
      )}
    </div>
  )
}
