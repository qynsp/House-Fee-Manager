import { useListGames, useGetCurrentGame } from '@workspace/api-client-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Square, RotateCcw, Trophy, Loader2, Users, Ticket } from 'lucide-react'

const API_BASE = import.meta.env.BASE_URL + 'api'

function getToken() {
  return localStorage.getItem('bingoToken') ?? ''
}

async function adminPost(path: string, body?: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error ?? 'Request failed')
  }
  return res.json()
}

async function adminGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

type GameTicket = {
  id: number
  userId: number
  cartelaNumber: number
  isWinner: boolean
  username: string | null
}

function ForceWinnerDialog({
  gameId,
  open,
  onClose,
  onDone,
}: {
  gameId: number
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [tickets, setTickets] = useState<GameTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [forcing, setForcing] = useState<number | null>(null)
  const { toast } = useToast()

  const loadTickets = async () => {
    setLoading(true)
    try {
      const data = await adminGet(`/games/${gameId}/all-tickets`)
      setTickets(data)
    } catch {
      toast({ title: 'Failed to load tickets', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleForce = async (ticketId: number) => {
    setForcing(ticketId)
    try {
      await adminPost(`/games/${gameId}/force-winner`, { ticketId })
      toast({ title: '🏆 Winner forced!', description: `Ticket #${ticketId} is now the winner.` })
      onDone()
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' })
    } finally {
      setForcing(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="border-accent/30 bg-background/95 sm:max-w-md max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-widest text-accent">Force Winner</DialogTitle>
          <DialogDescription>Select a ticket to declare as winner. The prize pool will be awarded immediately.</DialogDescription>
        </DialogHeader>

        {!tickets.length && !loading && (
          <Button onClick={loadTickets} variant="outline" className="w-full">
            <Ticket className="mr-2 h-4 w-4" /> Load Tickets
          </Button>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {tickets.length > 0 && (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between glass-panel rounded-lg px-3 py-2 border border-white/10">
                <div>
                  <div className="text-sm font-bold text-white">
                    {t.username ?? `User #${t.userId}`}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Ticket #{t.id} · Cartela #{t.cartelaNumber}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleForce(t.id)}
                  disabled={!!forcing || t.isWinner}
                  className="shrink-0"
                >
                  {forcing === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trophy className="h-3 w-3" />}
                  {t.isWinner ? 'Winner' : 'Force Win'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {tickets.length === 0 && !loading && (
          <p className="text-center text-sm text-muted-foreground py-4">No tickets in this game yet.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function LiveControls() {
  const { data: game, isLoading } = useGetCurrentGame()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [forceOpen, setForceOpen] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries()
  }

  const handleStop = async () => {
    if (!game) return
    setBusy('stop')
    try {
      await adminPost(`/games/${game.id}/stop`)
      toast({ title: '🛑 Game stopped', description: 'A new round will start shortly.' })
      invalidate()
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const handleRestart = async () => {
    if (!game) return
    setBusy('restart')
    try {
      await adminPost(`/games/${game.id}/restart`)
      toast({ title: '🔄 Game restarted', description: 'Drawn numbers cleared, back to waiting.' })
      invalidate()
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />

  if (!game) {
    return (
      <Card className="glass-panel border-white/10">
        <CardContent className="p-6 text-center text-muted-foreground">
          No active game. A new one will be created automatically.
        </CardContent>
      </Card>
    )
  }

  const statusColor =
    game.status === 'active' ? 'text-green-400' :
    game.status === 'waiting' ? 'text-yellow-400' :
    'text-muted-foreground'

  return (
    <>
      <Card className="glass-panel border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full bg-current ${game.status === 'active' ? 'animate-pulse' : ''} ${statusColor}`} />
            Live Game Controls — #{game.id}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Game stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center glass-panel rounded-lg p-3 border border-white/5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Status</div>
              <Badge variant={game.status === 'active' ? 'primary' : 'secondary'} className="capitalize">
                {game.status}
              </Badge>
            </div>
            <div className="text-center glass-panel rounded-lg p-3 border border-white/5">
              <Users className="w-4 h-4 text-secondary mx-auto mb-1" />
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Players</div>
              <div className="text-lg font-mono font-bold text-white">{game.playerCount}</div>
            </div>
            <div className="text-center glass-panel rounded-lg p-3 border border-white/5">
              <Trophy className="w-4 h-4 text-accent mx-auto mb-1" />
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Prize</div>
              <div className="text-lg font-mono font-bold text-accent">${game.prizePool.toFixed(2)}</div>
            </div>
          </div>

          {game.status === 'active' && (
            <div className="text-xs text-muted-foreground font-mono text-center">
              {game.drawnNumbers.length} numbers drawn
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStop}
              disabled={!!busy}
              className="flex flex-col h-auto py-3 gap-1.5 text-xs"
            >
              {busy === 'stop' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Stop Game
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              disabled={!!busy}
              className="flex flex-col h-auto py-3 gap-1.5 text-xs border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
            >
              {busy === 'restart' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Restart
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setForceOpen(true)}
              disabled={!!busy || game.playerCount === 0}
              className="flex flex-col h-auto py-3 gap-1.5 text-xs border-accent/40 text-accent hover:bg-accent/10"
            >
              <Trophy className="h-4 w-4" />
              Force Winner
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center">
            Stop ends the round without a winner · Restart resets drawn numbers · Force Winner awards prize immediately
          </p>
        </CardContent>
      </Card>

      {forceOpen && (
        <ForceWinnerDialog
          gameId={game.id}
          open={forceOpen}
          onClose={() => setForceOpen(false)}
          onDone={() => { setForceOpen(false); invalidate() }}
        />
      )}
    </>
  )
}

export default function AdminGames() {
  const { data: gamesPage, isLoading } = useListGames({ limit: 50 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-white glow-text mb-2">Game Management</h1>
        <p className="text-muted-foreground">Control active games and view history.</p>
      </div>

      {/* Live Controls */}
      <LiveControls />

      {/* History table */}
      <div>
        <h2 className="text-lg font-bold uppercase tracking-widest text-muted-foreground mb-3">Game History</h2>
        <Card className="glass-panel border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ticket Price</TableHead>
                    <TableHead className="text-right">Players</TableHead>
                    <TableHead className="text-right">Prize Pool</TableHead>
                    <TableHead className="text-right">House Cut</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead className="text-right">Ended At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gamesPage?.data.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell className="font-bold text-white">#{game.id}</TableCell>
                      <TableCell>
                        <Badge variant={
                          game.status === 'active' ? 'primary' :
                          game.status === 'finished' ? 'outline' : 'secondary'
                        }>
                          {game.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">${game.ticketPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">{game.playerCount}</TableCell>
                      <TableCell className="text-right text-accent glow-text font-black">${game.prizePool.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary font-bold">${game.houseEarnings.toFixed(2)}</TableCell>
                      <TableCell>
                        {game.winnerUsername ? (
                          <span className="font-bold text-secondary">{game.winnerUsername}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {game.endedAt ? new Date(game.endedAt).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!gamesPage?.data || gamesPage.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center p-8 text-muted-foreground">No games found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
