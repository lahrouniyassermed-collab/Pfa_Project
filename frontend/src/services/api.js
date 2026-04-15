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

export default api
