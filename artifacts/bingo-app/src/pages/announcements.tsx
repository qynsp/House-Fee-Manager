import { useListAnnouncements } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Megaphone } from 'lucide-react'

export default function Announcements() {
  const { data: announcements, isLoading } = useListAnnouncements()

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-2 mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center glow-secondary mb-4">
          <Bell className="h-8 w-8 text-secondary" />
        </div>
        <h1 className="text-3xl font-black text-white glow-text uppercase tracking-widest">Broadcasts</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">System Messages</p>
      </div>

      <div className="space-y-4">
        {announcements?.length === 0 ? (
          <div className="text-center p-12 glass-panel rounded-xl space-y-4">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
            <h3 className="text-lg font-bold uppercase tracking-widest text-muted-foreground">No Broadcasts</h3>
          </div>
        ) : (
          announcements?.map((a) => (
            <Card key={a.id} className="glass-panel border-white/10 bg-black/20 hover:border-secondary/50 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-lg tracking-wide uppercase">{a.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed pl-11">{a.message}</p>
                <div className="text-right text-xs font-mono text-secondary/50 pt-2 border-t border-white/5">
                  {new Date(a.createdAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
