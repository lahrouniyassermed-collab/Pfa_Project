import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  const loginPath = roles && roles.includes('client') ? '/client/login' : '/login'
  
  if (!user) return <Navigate to={loginPath} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={loginPath} replace />
  return children
}
