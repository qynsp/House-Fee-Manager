import { useState, useEffect } from 'react'
import { useTelegramAuth } from '@workspace/api-client-react'
import { setToken } from '@/lib/auth'
import { useLocation } from 'wouter'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Zap, Bot } from 'lucide-react'

function detectContext(): 'mini-app' | 'telegram-browser' | 'external' {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.initData) return 'mini-app'
  // Check Telegram's in-app browser user agent
  const ua = navigator.userAgent || ''
  if (ua.includes('Telegram') || tg !== undefined) return 'telegram-browser'
  return 'external'
}

export default function Login() {
  const [, setLocation] = useLocation()
  const telegramAuth = useTelegramAuth()
  const [error, setError] = useState('')
  const [ctx] = useState(detectContext)

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.initData) {
      // Expand to full screen for Mini App
      tg.expand?.()
      tg.ready?.()

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

  const subtitle = (() => {
    if (error) return null
    if (telegramAuth.isPending) return 'Authenticating with Telegram...'
    if (ctx === 'mini-app') return 'Loading...'
    if (ctx === 'telegram-browser') return 'Open this app through your bot to play'
    return 'Open in Telegram to play'
  })()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background">
      <Card className="w-full max-w-sm border-primary/20 glow-primary">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center glow-primary">
            <Zap className="h-8 w-8 text-primary drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
          </div>
          <CardTitle className="text-3xl font-black uppercase tracking-widest text-primary glow-text">Casino Bingo</CardTitle>
          {subtitle && (
            <CardDescription className="text-lg">
              {subtitle}
            </CardDescription>
          )}
          {error && (
            <CardDescription className="text-destructive font-bold text-sm">
              {error}
            </CardDescription>
          )}
        </CardHeader>

        {ctx === 'telegram-browser' && !telegramAuth.isPending && (
          <CardContent className="text-center pb-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Bot className="h-4 w-4" />
              <span>Start your bot, then tap the menu button to launch the game</span>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
