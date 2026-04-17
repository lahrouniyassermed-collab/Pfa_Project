import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSetupStatus, setupRestaurant } from '../services/api'

export default function SetupPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nom_restaurant: '',
    slogan: '',
    description: '',
    adresse: '',
    telephone: '',
    horaires: '',
    prenom: '',
    nom: '',
    identifiant: '',
    code_passe: '',
  })

  useEffect(() => {
    getSetupStatus()
      .then(res => {
        if (res.data.configured) navigate('/login')
        else setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [navigate])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await setupRestaurant(form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la configuration.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Vérification...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Configuration initiale</h1>
        <p className="text-sm text-gray-500 mb-8">
          Bienvenue ! Configurez votre restaurant en quelques secondes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Infos restaurant */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Informations du restaurant
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Nom du restaurant *</label>
                <input
                  name="nom_restaurant"
                  value={form.nom_restaurant}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="La Belle Assiette"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Slogan</label>
                <input
                  name="slogan"
                  value={form.slogan}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="La cuisine du cœur"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Un restaurant familial au cœur de la ville..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Adresse</label>
                <input
                  name="adresse"
                  value={form.adresse}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12 rue de la Paix, Casablanca"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Téléphone</label>
                <input
                  name="telephone"
                  value={form.telephone}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="06 00 00 00 00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Horaires</label>
                <input
                  name="horaires"
                  value={form.horaires}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lun-Dim 12h00 - 23h00"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Compte gérant */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Compte gérant
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Prénom *</label>
                <input
                  name="prenom"
                  value={form.prenom}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Yasser"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nom *</label>
                <input
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lahrouni"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Identifiant *</label>
                <input
                  name="identifiant"
                  value={form.identifiant}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="GER001"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mot de passe *</label>
                <input
                  type="password"
                  name="code_passe"
                  value={form.code_passe}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Configuration en cours...' : 'Initialiser mon restaurant'}
          </button>
        </form>
      </div>
    </div>
  )
}
