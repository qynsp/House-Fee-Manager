import { useGetDashboardStats } from '@workspace/api-client-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, Users, Ticket, Gamepad2, AlertCircle } from 'lucide-react'

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats()

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-white glow-text mb-2">Command Center</h1>
        <p className="text-muted-foreground">Real-time casino metrics and operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/30 glow-primary bg-primary/5">
          <CardContent className="p-6 space-y-2">
            <div className="flex justify-between items-start">
              <div className="text-sm font-bold uppercase tracking-wider text-primary">House Earnings</div>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div className="text-4xl font-black font-mono text-white">${stats?.houseEarnings?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-muted-foreground">All time profit</div>
          </CardContent>
        </Card>

        <Card className="border-secondary/30 glow-secondary bg-secondary/5">
          <CardContent className="p-6 space-y-2">
            <div className="flex justify-between items-start">
              <div className="text-sm font-bold uppercase tracking-wider text-secondary">Total Revenue</div>
              <DollarSign className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-3xl font-black font-mono text-white">${stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-muted-foreground">Gross ticket sales</div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardContent className="p-6 space-y-2">
            <div className="flex justify-between items-start">
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Players</div>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-3xl font-black font-mono text-white">{stats?.totalUsers || 0}</div>
            <div className="text-xs text-muted-foreground">Registered accounts</div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardContent className="p-6 space-y-2">
            <div className="flex justify-between items-start">
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Tickets Sold</div>
              <Ticket className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-3xl font-black font-mono text-white">{stats?.totalTicketsSold || 0}</div>
            <div className="text-xs text-muted-foreground">All time</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-widest text-muted-foreground">Recent Profit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="text-sm font-bold uppercase tracking-widest">Today</div>
              <div className="text-xl font-mono text-primary glow-text">${stats?.dailyProfit?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="text-sm font-bold uppercase tracking-widest">This Week</div>
              <div className="text-xl font-mono text-white">${stats?.weeklyProfit?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="flex justify-between items-center pb-2">
              <div className="text-sm font-bold uppercase tracking-widest">This Month</div>
              <div className="text-xl font-mono text-white">${stats?.monthlyProfit?.toFixed(2) || '0.00'}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-widest text-muted-foreground">Attention Needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg flex justify-between items-center border ${stats?.pendingDeposits ? 'border-secondary/50 bg-secondary/10 text-secondary glow-text' : 'border-white/5 bg-black/20 text-muted-foreground'}`}>
              <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm">
                <AlertCircle className="w-4 h-4"/> Pending Deposits
              </div>
              <div className="text-2xl font-mono font-black">{stats?.pendingDeposits || 0}</div>
            </div>
            
            <div className={`p-4 rounded-lg flex justify-between items-center border ${stats?.pendingWithdrawals ? 'border-accent/50 bg-accent/10 text-accent glow-text' : 'border-white/5 bg-black/20 text-muted-foreground'}`}>
              <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm">
                <AlertCircle className="w-4 h-4"/> Pending Withdrawals
              </div>
              <div className="text-2xl font-mono font-black">{stats?.pendingWithdrawals || 0}</div>
            </div>

            <div className="p-4 rounded-lg flex justify-between items-center border border-primary/20 bg-primary/5 text-primary">
              <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm">
                <Gamepad2 className="w-4 h-4"/> Active Games
              </div>
              <div className="text-2xl font-mono font-black">{stats?.activeGames || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
