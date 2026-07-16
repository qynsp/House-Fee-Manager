import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { isAuthenticated, isAdmin, setupAuth } from '@/lib/auth'

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const [location, setLocation] = useLocation()

  useEffect(() => {
    setupAuth()
    if (!isAuthenticated()) {
      setLocation(adminOnly ? '/admin/login' : '/login')
      return
    }
    if (adminOnly && !isAdmin()) {
      setLocation('/admin/login')
    }
  }, [location, setLocation, adminOnly])

  if (!isAuthenticated() || (adminOnly && !isAdmin())) {
    return null
  }

  return <>{children}</>
}
