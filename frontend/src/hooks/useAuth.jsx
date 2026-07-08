import { createContext, useContext, useState } from 'react'
import { login as loginApi } from '../services/api'
import { storageSave, storageGet, storageRemove } from '../utils/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = storageGet('user')
    try { return saved ? JSON.parse(saved) : null } catch { return null }
  })

  async function login(identifiant, code_passe) {
    const res = await loginApi(identifiant, code_passe)
    const userData = res.data
    storageSave('token', userData.access_token)
    storageSave('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  function logout() {
    storageRemove('token')
    storageRemove('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
