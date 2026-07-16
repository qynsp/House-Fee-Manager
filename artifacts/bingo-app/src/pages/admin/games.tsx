import { useListGames } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminGames() {
  const { data: gamesPage, isLoading } = useListGames({ limit: 50 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-white glow-text mb-2">Game History</h1>
        <p className="text-muted-foreground">Archive of all bingo matches.</p>
      </div>

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
  )
}
