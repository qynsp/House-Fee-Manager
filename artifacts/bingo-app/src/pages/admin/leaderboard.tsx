import { useGetLeaderboard, useHideFromLeaderboard, useRestoreToLeaderboard } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, EyeOff, Eye, Crown, Medal } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export default function AdminLeaderboard() {
  const { data: entries, isLoading } = useGetLeaderboard({ includeHidden: true, limit: 100 })
  const hideUser = useHideFromLeaderboard()
  const restoreUser = useRestoreToLeaderboard()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const getRankIcon = (rank: number, hidden: boolean) => {
    if (hidden) return <span className="font-bold text-muted-foreground/40 w-6 text-center font-mono text-sm">#{rank}</span>
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />
    return <span className="font-bold text-muted-foreground w-6 text-center font-mono text-sm">#{rank}</span>
  }

  const handleHide = (userId: number, username: string) => {
    hideUser.mutate({ userId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['getLeaderboard'] })
        toast({ title: `${username} hidden from leaderboard` })
      },
    })
  }

  const handleRestore = (userId: number, username: string) => {
    restoreUser.mutate({ userId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['getLeaderboard'] })
        toast({ title: `${username} restored to leaderboard` })
      },
    })
  }

  const visible = (entries ?? []).filter(e => !e.leaderboardHidden)
  const hidden = (entries ?? []).filter(e => e.leaderboardHidden)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-white glow-text mb-2 flex items-center gap-3">
          <Trophy className="h-7 w-7 text-accent" />
          Leaderboard Manager
        </h1>
        <p className="text-muted-foreground">Show or hide players from the public Hall of Fame.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <>
          {/* Visible players */}
          <Card className="glass-panel border-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-400" />
              <span className="font-bold uppercase tracking-widest text-sm text-white">Visible on Leaderboard</span>
              <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30">{visible.length}</Badge>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Winnings</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8 uppercase tracking-widest text-sm">No visible entries</TableCell>
                    </TableRow>
                  ) : visible.map((entry) => (
                    <TableRow key={entry.userId}>
                      <TableCell>
                        <div className="flex justify-center w-8">{getRankIcon(entry.rank, false)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                            {entry.avatarUrl
                              ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                              : <span className="text-xs font-bold text-primary">{entry.username.substring(0, 2).toUpperCase()}</span>
                            }
                          </div>
                          <span className="font-bold text-white">{entry.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-accent">${entry.totalWinnings.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{entry.totalWins}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleHide(entry.userId, entry.username)}
                          disabled={hideUser.isPending}
                          className="gap-2"
                        >
                          <EyeOff className="h-4 w-4" />
                          Hide
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Hidden players */}
          {hidden.length > 0 && (
            <Card className="glass-panel border-white/10">
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold uppercase tracking-widest text-sm text-muted-foreground">Hidden from Leaderboard</span>
                <Badge className="ml-auto bg-white/5 text-muted-foreground border-white/10">{hidden.length}</Badge>
              </div>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Winnings</TableHead>
                      <TableHead className="text-right">Wins</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hidden.map((entry) => (
                      <TableRow key={entry.userId} className="opacity-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                              {entry.avatarUrl
                                ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                                : <span className="text-xs font-bold text-muted-foreground">{entry.username.substring(0, 2).toUpperCase()}</span>
                              }
                            </div>
                            <span className="font-bold text-muted-foreground">{entry.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">${entry.totalWinnings.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{entry.totalWins}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(entry.userId, entry.username)}
                            disabled={restoreUser.isPending}
                            className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
                          >
                            <Eye className="h-4 w-4" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
