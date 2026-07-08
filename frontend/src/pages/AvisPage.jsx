import { useState } from 'react'
import { deposerAvis } from '../services/api'
import { useNavigate } from 'react-router-dom'

function Etoile({ pleine, onClick }) {
  return (
    <button type="button" onClick={onClick} className="focus:outline-none">
      <svg className={`w-9 h-9 transition-colors ${pleine ? 'text-amber-400' : 'text-gray-300'}`}
        fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  )
}

export default function AvisPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nom: '', note: 0, commentaire: '' })
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')

  async function soumettre(e) {
    e.preventDefault()
    if (form.note === 0) { setErreur('Veuillez choisir une note.'); return }
    if (!form.nom.trim()) { setErreur('Veuillez entrer votre nom.'); return }
    setErreur('')
    setLoading(true)
    try {
      await deposerAvis(form)
      setSucces(true)
    } catch {
      setErreur('Une erreur est survenue, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  if (succes) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Merci pour votre avis !</h2>
          <p className="text-gray-500 text-sm mb-6">
            Votre avis a été envoyé. Il sera visible après validation par l'équipe.
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-lg w-full">

        {/* Header */}
        <div className="mb-7">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm mb-4 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Accueil
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Laisser un avis</h1>
          <p className="text-gray-500 text-sm mt-1">Votre retour nous aide à nous améliorer.</p>
        </div>

        <form onSubmit={soumettre} className="space-y-5">

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Votre nom</label>
            <input
              type="text"
              value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              placeholder="Prénom ou pseudonyme"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          {/* Note étoiles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <Etoile key={n} pleine={n <= form.note} onClick={() => setForm(f => ({ ...f, note: n }))} />
              ))}
            </div>
            {form.note > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {['', 'Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent'][form.note]}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Commentaire</label>
            <textarea
              value={form.commentaire}
              onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
              placeholder="Partagez votre expérience..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
            />
          </div>

          {erreur && (
            <p className="text-red-500 text-sm">{erreur}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer mon avis'}
          </button>
        </form>
      </div>
    </div>
  )
}
