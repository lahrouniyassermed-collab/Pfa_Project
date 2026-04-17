import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── AUTH ──────────────────────────────────────────────────
export const login = (identifiant, code_passe) => {
  const form = new FormData()
  form.append('username', identifiant)
  form.append('password', code_passe)
  return api.post('/api/auth/login', form)
}

// ── PLATS ─────────────────────────────────────────────────
export const getMenu            = ()        => api.get('/api/plats/categories')
export const getTousPlats       = ()        => api.get('/api/plats/admin/tous')
export const getPropositions    = ()        => api.get('/api/plats/admin/propositions')
export const creerPlatGerant    = (data)    => api.post('/api/plats/admin/creer', data)
export const validerProposition = (id, data)=> api.put(`/api/plats/admin/${id}/valider`, data)
export const modifierPlat       = (id, data)=> api.put(`/api/plats/admin/${id}`, data)
export const supprimerPlat      = (id)      => api.delete(`/api/plats/admin/${id}`)
export const proposerPlat       = (data)    => api.post('/api/plats/proposer', data)
export const mesPropositions    = ()        => api.get('/api/plats/mes-propositions')
export const uploadImagePlat    = (platId, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/api/plats/${platId}/image`, form)
}

// ── CATÉGORIES ────────────────────────────────────────────
export const getCategories      = ()        => api.get('/api/categories/')
export const creerCategorie     = (data)    => api.post('/api/categories/', data)
export const modifierCategorie  = (id, data)=> api.put(`/api/categories/${id}`, data)
export const supprimerCategorie = (id)      => api.delete(`/api/categories/${id}`)

// ── INGRÉDIENTS ───────────────────────────────────────────
export const getIngredients     = ()        => api.get('/api/ingredients/')
export const getAlertes         = ()        => api.get('/api/ingredients/alertes')
export const creerIngredient    = (data)    => api.post('/api/ingredients/', data)
export const modifierIngredient = (id, data)=> api.put(`/api/ingredients/${id}`, data)
export const supprimerIngredient= (id)      => api.delete(`/api/ingredients/${id}`)

// ── COMMANDES ─────────────────────────────────────────────
export const creerCommande      = (data)    => api.post('/api/commandes/', data)
export const envoyerCuisine     = (id)      => api.post(`/api/commandes/${id}/envoyer-cuisine`)
export const cloturerCommande   = (id)      => api.post(`/api/commandes/${id}/cloturer`)
export const getCommandesCuisine= ()        => api.get('/api/commandes/cuisine')
export const majStatutLigne     = (id, s)   => api.put(`/api/commandes/ligne/${id}/statut?statut=${s}`)
export const majStatutCommande  = (id, s)   => api.put(`/api/commandes/${id}/statut?statut=${s}`)
export const toutesCommandes    = ()        => api.get('/api/commandes/')

// ── TABLES ────────────────────────────────────────────────
export const getTables          = ()        => api.get('/api/tables/')
export const creerTable         = (data)    => api.post('/api/tables/', data)
export const changerStatutTable = (id, s)   => api.put(`/api/tables/${id}/statut?statut=${s}`)
export const supprimerTable     = (id)      => api.delete(`/api/tables/${id}`)

// ── RÉSERVATIONS ──────────────────────────────────────────
export const creerReservation   = (data)    => api.post('/api/reservations/', data)
export const getReservations    = ()        => api.get('/api/reservations/')
export const confirmerReservation=(id)      => api.put(`/api/reservations/${id}/confirmer`)
export const annulerReservation = (id)      => api.put(`/api/reservations/${id}/annuler`)
export const verifierCodeAcces  = (code)    => api.get(`/api/reservations/verifier-code/${code}`)

// ── TOMBOLA ───────────────────────────────────────────────
export const getTombolas        = ()        => api.get('/api/tombola/')
export const creerTombola       = (data)    => api.post('/api/tombola/creer', data)
export const getParticipations  = (tid)     => api.get(`/api/tombola/participations${tid ? `?tombola_id=${tid}` : ''}`)
export const validerAvis        = (id)      => api.put(`/api/tombola/avis/${id}/valider`)
export const rejeterAvis        = (id)      => api.put(`/api/tombola/avis/${id}/rejeter`)
export const tirageAuSort       = (id)      => api.post(`/api/tombola/${id}/tirage`)

// ── DASHBOARD ─────────────────────────────────────────────
export const getDashboard       = ()        => api.get('/api/dashboard/')

// ── EMPLOYÉS ──────────────────────────────────────────────
export const getEmployes        = ()        => api.get('/api/employes/')
export const creerEmploye       = (data)    => api.post('/api/employes/', data)
export const toggleActifEmploye = (id, actif) => api.put(`/api/employes/${id}/actif?actif=${actif}`)

// ── RESTAURANT ────────────────────────────────────────────────
export const getRestaurantInfo = () => api.get('/api/restaurant/')
export const updateRestaurantInfo = (data) => api.put('/api/restaurant/', data)

// ── SETUP ─────────────────────────────────────────────────────
export const getSetupStatus = () => api.get('/api/setup/status')
export const setupRestaurant = (data) => api.post('/api/setup/', data)

// ── LANDING ───────────────────────────────────────────────────
export const getLanding = () => api.get('/api/landing/')

// ── SALLES PRIVÉES ────────────────────────────────────────────
export const getSalles = () => api.get('/api/salles/')
export const creerSalle = (data) => api.post('/api/salles/', data)
export const modifierSalle = (id, data) => api.put(`/api/salles/${id}`, data)
export const supprimerSalle = (id) => api.delete(`/api/salles/${id}`)

// ── OFFRES D'EMPLOI ───────────────────────────────────────────
export const getOffres = () => api.get('/api/emplois/')
export const creerOffre = (data) => api.post('/api/emplois/', data)
export const modifierOffre = (id, data) => api.put(`/api/emplois/${id}`, data)
export const supprimerOffre = (id) => api.delete(`/api/emplois/${id}`)
export const postuler = (offreId, data) => api.post(`/api/emplois/${offreId}/postuler`, data)
export const getCandidatures = () => api.get('/api/emplois/candidatures')
export const marquerCandidatureLue = (id) => api.put(`/api/emplois/candidatures/${id}/lue`)

// ── AVIS CLIENTS ──────────────────────────────────────────────
export const getAvisPublics = () => api.get('/api/avis-clients/')
export const deposerAvis = (data) => api.post('/api/avis-clients/', data)
export const getAvisAdmin = () => api.get('/api/avis-clients/admin')
export const validerAvisClient = (id) => api.put(`/api/avis-clients/${id}/valider`)
export const rejeterAvisClient = (id) => api.put(`/api/avis-clients/${id}/rejeter`)

export default api
