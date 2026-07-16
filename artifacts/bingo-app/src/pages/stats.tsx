import { useGetMyStats, useGetMe } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { User, Activity, Trophy, Crosshair, Target } from 'lucide-react'

export default function Stats() {
  const { data: user, isLoading: userLoading } = useGetMe()
  const { data: stats, isLoading: statsLoading } = useGetMyStats()

  if (userLoading || statsLoading) return <div className="p-4 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-4 mb-8">
        <div className="mx-auto w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center glow-primary overflow-hidden">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-primary" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-black text-white glow-text tracking-wider">{user?.firstName} {user?.lastName}</h1>
          <p className="text-primary font-mono">@{user?.username}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-secondary/30 bg-secondary/5 glow-secondary">
          <CardContent className="p-4 text-center space-y-2">
            <Trophy className="w-6 h-6 text-secondary mx-auto" />
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Winnings</div>
            <div className="text-2xl font-mono font-black text-white">${stats?.totalWinnings?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
        
        <Card className="border-primary/30 bg-primary/5 glow-primary">
          <CardContent className="p-4 text-center space-y-2">
            <Activity className="w-6 h-6 text-primary mx-auto" />
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Win Rate</div>
            <div className="text-2xl font-mono font-black text-white">{((stats?.winRate || 0) * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardContent className="p-4 text-center space-y-2">
            <Target className="w-6 h-6 text-muted-foreground mx-auto" />
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Games Played</div>
            <div className="text-2xl font-mono font-black text-white">{stats?.totalGames || 0}</div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardContent className="p-4 text-center space-y-2">
            <Crosshair className="w-6 h-6 text-muted-foreground mx-auto" />
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Spent</div>
            <div className="text-2xl font-mono font-black text-white">${stats?.totalSpent?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
      </div>

      <div className="glass-panel p-4 rounded-xl border border-white/10 text-center space-y-2 mt-8">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Joined</div>
        <div className="text-sm font-mono text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</div>
      </div>
    </div>
  )
}
