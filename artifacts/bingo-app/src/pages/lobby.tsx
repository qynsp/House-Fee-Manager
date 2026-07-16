import { useGetCurrentGame, useGetSettings, useBuyTicket, getGetCurrentGameQueryKey } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useGameSocket } from '@/hooks/use-game-socket'
import { Users, Timer, Trophy, Ticket, AlertTriangle } from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

export default function Lobby() {
  const [, setLocation] = useLocation()
  const { data: game, isLoading: gameLoading } = useGetCurrentGame()
  const { data: settings } = useGetSettings()
  const buyTicket = useBuyTicket()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { playerCount } = useGameSocket()
  const displayPlayers = playerCount > (game?.playerCount || 0) ? playerCount : (game?.playerCount || 0)

  // Countdown timer logic
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  useEffect(() => {
    if (game?.status === 'waiting' && game.startedAt && settings?.countdownSecs) {
      const start = new Date(game.startedAt).getTime()
      const end = start + settings.countdownSecs * 1000
      
      const interval = setInterval(() => {
        const now = Date.now()
        const diff = Math.max(0, Math.floor((end - now) / 1000))
        setTimeLeft(diff)
        if (diff <= 0) clearInterval(interval)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [game?.status, game?.startedAt, settings?.countdownSecs])

  if (gameLoading) {
    return <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-24 w-full" /></div>
  }

  if (game?.status === 'active') {
    return (
      <div className="space-y-6 text-center pt-10">
        <div className="mx-auto w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center glow-secondary animate-pulse">
          <Trophy className="h-12 w-12 text-secondary" />
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-widest">Game in Progress!</h2>
        <p className="text-muted-foreground text-lg">A round is currently active.</p>
        <Link href={`/game/${game.id}`}>
          <Button size="lg" variant="secondary" className="w-full mt-4 text-xl">
            Watch Live
          </Button>
        </Link>
      </div>
    )
  }

  const handleBuyTicket = () => {
    if (!game) return
    buyTicket.mutate({ id: game.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentGameQueryKey() })
        setLocation(`/game/${game.id}`)
      },
      onError: (err: any) => {
        toast({
          title: "Failed to buy ticket",
          description: err?.message || "Insufficient balance or game not available",
          variant: "destructive"
        })
      }
    })
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-black text-primary glow-text uppercase tracking-widest">Neon Bingo</h1>
        <p className="text-muted-foreground font-mono">Next round starting soon</p>
      </div>

      <Card className="border-primary/30 glow-primary bg-primary/5">
        <CardContent className="p-6 text-center space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-xl space-y-2">
              <Users className="w-6 h-6 text-secondary mx-auto" />
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Players</div>
              <div className="text-2xl font-mono text-white">{displayPlayers}</div>
            </div>
            
            <div className="glass-panel p-4 rounded-xl space-y-2">
              <Trophy className="w-6 h-6 text-accent mx-auto" />
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Prize Pool</div>
              <div className="text-2xl font-mono text-white">${game?.prizePool?.toFixed(2) || '0.00'}</div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-primary/20 space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Timer className="w-5 h-5 animate-pulse" />
              <span className="font-bold tracking-widest uppercase">Time Remaining</span>
            </div>
            <div className="text-6xl font-black font-mono text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full h-16 text-xl animate-pulse" 
            onClick={handleBuyTicket}
            disabled={buyTicket.isPending || !game}
          >
            <Ticket className="mr-2 h-6 w-6" />
            Buy Ticket • ${game?.ticketPrice}
          </Button>

          {buyTicket.isError && (
             <div className="text-destructive text-sm flex items-center justify-center gap-1 font-bold">
               <AlertTriangle className="w-4 h-4" /> Not enough balance
             </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
