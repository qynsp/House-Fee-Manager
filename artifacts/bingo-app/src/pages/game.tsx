import { useGetGame, useGetMyGameTickets, useClaimBingo, getGetCurrentGameQueryKey } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useGameSocket } from '@/hooks/use-game-socket'
import { Trophy, ArrowLeft, Ticket, Medal } from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export default function GameLive({ params }: { params: { id: string } }) {
  const gameId = parseInt(params.id)
  const [, setLocation] = useLocation()
  const { data: game, isLoading: gameLoading } = useGetGame(gameId, { query: { enabled: !!gameId, queryKey: ['game', gameId] } })
  const { data: ticketsPage, isLoading: ticketsLoading } = useGetMyGameTickets(gameId, { query: { enabled: !!gameId, queryKey: ['my-tickets', gameId] } })
  const claimBingo = useClaimBingo()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const { lastDrawnNumber, winner, clearWinner } = useGameSocket()

  // Confetti on win
  useEffect(() => {
    if (winner) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00FFFF', '#AA00FF', '#FFFFFF']
      })
    }
  }, [winner])

  const handleClaim = (ticketId: number) => {
    claimBingo.mutate({ id: gameId, data: { ticketId } }, {
      onSuccess: (res) => {
        if (res.valid) {
          toast({
            title: "BINGO!",
            description: `You won $${res.prizeAmount?.toFixed(2)}! Pattern: ${res.pattern}`,
          })
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: ['#00FFFF'] })
        } else {
          toast({
            title: "Invalid Bingo",
            description: res.message,
            variant: "destructive"
          })
        }
      },
      onError: (err: any) => {
        toast({
          title: "Claim Failed",
          description: err?.message || "Could not claim bingo",
          variant: "destructive"
        })
      }
    })
  }

  if (gameLoading || ticketsLoading) {
    return <div className="space-y-4 pt-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-96 w-full" /></div>
  }

  if (!game) return <div>Game not found</div>

  const myTickets = Array.isArray(ticketsPage) ? ticketsPage : (ticketsPage as any)?.data || []
  
  // Create board grid 1-75
  const boardNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
  const isDrawn = (n: number) => game.drawnNumbers.includes(n)

  return (
    <div className="space-y-6 pt-2 pb-10">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-6 w-6" /></Button>
        </Link>
        <div className="text-center">
          <div className="text-sm font-bold text-primary tracking-widest uppercase glow-text">Game #{game.id}</div>
          <div className="text-xs text-muted-foreground uppercase">{game.status}</div>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Drawn Numbers Board */}
      <Card className="border-primary/20 bg-background/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prize Pool</div>
              <div className="text-xl font-mono text-accent glow-text">${game.prizePool.toFixed(2)}</div>
            </div>
            
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Latest Draw</div>
              <div className="text-4xl font-black font-mono text-primary glow-text h-10 w-16 flex items-center justify-end">
                <AnimatePresence mode="popLayout">
                  {lastDrawnNumber && (
                    <motion.span
                      key={lastDrawnNumber}
                      initial={{ scale: 0.5, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 1.5, opacity: 0, y: -20 }}
                      className="inline-block"
                    >
                      {lastDrawnNumber}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!lastDrawnNumber && game.drawnNumbers.length > 0 && game.drawnNumbers[game.drawnNumbers.length - 1]}
                {!lastDrawnNumber && game.drawnNumbers.length === 0 && '--'}
              </div>
            </div>
          </div>

          <div className="bg-black/40 rounded-lg p-2 border border-white/5">
            <div className="grid grid-cols-15 gap-1 max-h-[150px] overflow-y-auto no-scrollbar content-start">
              {boardNumbers.map(n => (
                <div 
                  key={n} 
                  className={`aspect-square flex items-center justify-center text-[8px] sm:text-[10px] font-mono rounded-sm transition-all duration-300 ${
                    isDrawn(n) 
                      ? n === lastDrawnNumber 
                        ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_10px_rgba(0,255,255,0.8)] scale-110 z-10'
                        : 'bg-primary/30 text-primary border border-primary/50'
                      : 'text-muted-foreground opacity-30'
                  }`}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Tickets */}
      <div className="space-y-8">
        {myTickets.length === 0 ? (
          <div className="text-center p-8 glass-panel rounded-xl space-y-4">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-bold uppercase tracking-widest text-muted-foreground">No Tickets</h3>
            {game.status === 'waiting' && (
              <Button onClick={() => setLocation('/')} variant="outline">Buy in Lobby</Button>
            )}
          </div>
        ) : (
          myTickets.map(ticket => (
            <div key={ticket.id} className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <div className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Ticket #{ticket.id}</div>
                {ticket.isWinner && <div className="text-xs font-bold text-accent tracking-widest uppercase glow-text flex items-center gap-1"><Medal className="w-3 h-3"/> Winner</div>}
              </div>
              
              <Card className={`border-2 transition-all ${ticket.isWinner ? 'border-accent glow-secondary' : 'border-white/10'}`}>
                <CardContent className="p-2 sm:p-4">
                  {/* Bingo Headers */}
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {['B','I','N','G','O'].map(letter => (
                      <div key={letter} className="text-center font-black text-xl sm:text-2xl text-primary glow-text tracking-widest">{letter}</div>
                    ))}
                  </div>
                  
                  {/* 5x5 Grid */}
                  <div className="grid grid-cols-5 gap-1 sm:gap-2">
                    {ticket.card.map((row, rIdx) => 
                      row.map((num, cIdx) => {
                        const isFree = rIdx === 2 && cIdx === 2
                        const drawn = isFree || game.drawnNumbers.includes(num)
                        
                        return (
                          <div 
                            key={`${rIdx}-${cIdx}`}
                            className={`aspect-square flex items-center justify-center text-sm sm:text-xl font-bold font-mono rounded-md border-2 transition-all ${
                              isFree 
                                ? 'bg-secondary/20 border-secondary text-secondary glow-secondary text-xs sm:text-sm'
                                : drawn
                                  ? 'bg-primary/20 border-primary text-primary glow-primary'
                                  : 'bg-black/40 border-white/5 text-muted-foreground'
                            }`}
                          >
                            {isFree ? 'FREE' : num}
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {game.status === 'active' && !ticket.isWinner && (
                <Button 
                  size="lg" 
                  className="w-full h-14 text-xl tracking-widest" 
                  onClick={() => handleClaim(ticket.id)}
                  disabled={claimBingo.isPending}
                >
                  SLAM BINGO
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Winner Modal */}
      <Dialog open={!!winner} onOpenChange={(open) => !open && clearWinner()}>
        <DialogContent className="border-accent glow-secondary bg-background/95 sm:max-w-md text-center py-10">
          <DialogHeader>
            <div className="mx-auto w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center glow-secondary mb-4">
              <Trophy className="h-10 w-10 text-accent" />
            </div>
            <DialogTitle className="text-4xl font-black text-accent glow-text uppercase tracking-widest mb-2">BINGO!</DialogTitle>
            <DialogDescription className="text-xl text-white">
              <span className="font-bold text-primary">{winner?.username}</span> won <span className="font-mono font-bold text-secondary glow-text">${winner?.prizeAmount?.toFixed(2)}</span>!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 text-sm text-muted-foreground uppercase tracking-widest">
            Pattern: {winner?.pattern}
          </div>
          <Button onClick={clearWinner} className="w-full mt-6" variant="outline">Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
