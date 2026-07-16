import { useGetLeaderboard } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Medal, Crown } from 'lucide-react'

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard()

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-64 w-full" /></div>

  const entries = leaderboard || []

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.8)]" />
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]" />
    return <span className="font-bold text-muted-foreground w-6 text-center font-mono">#{rank}</span>
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-2 mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center glow-secondary mb-4">
          <Trophy className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-3xl font-black text-white glow-text uppercase tracking-widest">Hall of Fame</h1>
        <p className="text-muted-foreground font-mono text-sm">Top earners of all time</p>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div 
            key={entry.userId} 
            className={`glass-panel p-4 rounded-xl flex items-center justify-between border ${
              entry.rank === 1 ? 'border-yellow-400/50 bg-yellow-400/10 glow-text' : 
              entry.rank === 2 ? 'border-gray-300/50 bg-gray-300/10' :
              entry.rank === 3 ? 'border-amber-700/50 bg-amber-700/10' : 'border-white/5'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 overflow-hidden flex items-center justify-center">
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt={entry.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-primary uppercase">{entry.username.substring(0, 2)}</span>
                )}
              </div>
              <div>
                <div className="font-bold text-white text-lg tracking-wide">{entry.username}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{entry.totalWins} Wins</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-black text-xl text-accent glow-text">${entry.totalWinnings.toFixed(2)}</div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-center p-8 text-muted-foreground uppercase tracking-widest">No entries yet</div>
        )}
      </div>
    </div>
  )
}
