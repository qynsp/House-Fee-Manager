import { useListMyTickets } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Ticket as TicketIcon, Medal } from 'lucide-react'
import { Link } from 'wouter'
import { Button } from '@/components/ui/button'

export default function Tickets() {
  const { data: ticketsPage, isLoading } = useListMyTickets()

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>

  const tickets = ticketsPage?.data || []

  // Group tickets by game
  const byGame = Object.values(
    tickets.reduce<Record<number, typeof tickets>>((acc, t) => {
      if (!acc[t.gameId]) acc[t.gameId] = []
      acc[t.gameId].push(t)
      return acc
    }, {})
  ).sort((a, b) => b[0].gameId - a[0].gameId)

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-black text-white glow-text uppercase tracking-widest">My Tickets</h1>
      </div>

      {byGame.length === 0 ? (
        <div className="text-center p-12 glass-panel rounded-xl space-y-4">
          <TicketIcon className="w-16 h-16 text-muted-foreground mx-auto" />
          <h3 className="text-xl font-bold uppercase tracking-widest text-muted-foreground">No History</h3>
          <p className="text-muted-foreground">Buy a ticket in the lobby to start playing.</p>
          <Link href="/">
            <Button className="mt-4">Go to Lobby</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {byGame.map(group => {
            const gameId = group[0].gameId
            const hasWinner = group.some(t => t.isWinner)
            const winner = group.find(t => t.isWinner)

            return (
              <Link key={gameId} href={`/game/${gameId}`}>
                <Card className={`border hover:glow-primary transition-all cursor-pointer ${hasWinner ? 'border-accent glow-secondary' : 'border-white/10 glass-panel'}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Game header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${hasWinner ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'}`}>
                          {hasWinner ? <Medal className="w-5 h-5" /> : <TicketIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-bold uppercase tracking-widest">Game #{gameId}</div>
                          <div className="text-xs text-muted-foreground font-mono">{new Date(group[0].purchasedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {hasWinner && winner ? (
                          <>
                            <div className="text-xs font-bold uppercase tracking-wider text-accent glow-text">Winner</div>
                            <div className="font-mono font-bold text-lg text-white">${winner.prizeAmount?.toFixed(2)}</div>
                          </>
                        ) : (
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {group.length} ticket{group.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cartelas side by side */}
                    <div className={`grid gap-2 ${group.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {group.map(t => (
                        <div
                          key={t.id}
                          className={`rounded-lg px-3 py-2 flex items-center justify-between text-sm border ${
                            t.isWinner
                              ? 'bg-accent/10 border-accent/40 text-accent'
                              : 'bg-white/5 border-white/10 text-muted-foreground'
                          }`}
                        >
                          <span className="font-mono font-bold">Cartela #{t.cartelaNumber}</span>
                          {t.isWinner && <Medal className="w-4 h-4 shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
