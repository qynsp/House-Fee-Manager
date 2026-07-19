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

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-black text-white glow-text uppercase tracking-widest">My Tickets</h1>
      </div>

      {tickets.length === 0 ? (
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
          {tickets.map(ticket => (
            <Link key={ticket.id} href={`/game/${ticket.gameId}`}>
              <Card className={`border hover:glow-primary transition-all cursor-pointer ${ticket.isWinner ? 'border-accent glow-secondary' : 'border-white/10 glass-panel'}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${ticket.isWinner ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'}`}>
                      {ticket.isWinner ? <Medal className="w-6 h-6"/> : <TicketIcon className="w-6 h-6"/>}
                    </div>
                    <div>
                      <div className="font-bold uppercase tracking-widest">Game #{ticket.gameId}</div>
                      <div className="text-xs text-muted-foreground font-mono">{new Date(ticket.purchasedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {ticket.isWinner ? (
                      <>
                        <div className="text-xs font-bold uppercase tracking-wider text-accent glow-text">Winner</div>
                        <div className="font-mono font-bold text-lg text-white">${ticket.prizeAmount?.toFixed(2)}</div>
                      </>
                    ) : (
                      <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Ticket #{ticket.id}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
