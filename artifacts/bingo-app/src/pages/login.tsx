import { useState, useEffect } from 'react'
import { useTelegramAuth } from '@workspace/api-client-react'
import { setToken } from '@/lib/auth'
import { useLocation } from 'wouter'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Zap } from 'lucide-react'

export default function Login() {
  const [, setLocation] = useLocation()
  const telegramAuth = useTelegramAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.initData) {
      telegramAuth.mutate(
        { data: { initData: tg.initData } },
        {
          onSuccess: (data) => {
            setToken(data.token)
            setLocation('/')
          },
          onError: () => {
            setError('Authentication failed. Please try again.')
          }
        }
      )
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background">
      <Card className="w-full max-w-sm border-primary/20 glow-primary">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center glow-primary">
            <Zap className="h-8 w-8 text-primary drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
          </div>
          <CardTitle className="text-3xl font-black uppercase tracking-widest text-primary glow-text">Casino Bingo</CardTitle>
          <CardDescription className="text-lg">
            {!error && !telegramAuth.isPending && "Open in Telegram to play"}
            {telegramAuth.isPending && "Authenticating with Telegram..."}
            {error && <span className="text-destructive font-bold">{error}</span>}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
