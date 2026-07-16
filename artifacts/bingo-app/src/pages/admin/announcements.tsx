import { useListAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '@workspace/api-client-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Megaphone } from 'lucide-react'

const announcementSchema = z.object({
  title: z.string().min(1, 'Title required'),
  message: z.string().min(1, 'Message required'),
})

export default function AdminAnnouncements() {
  const { data: announcements, isLoading } = useListAnnouncements()
  const createAnnouncement = useCreateAnnouncement()
  const deleteAnnouncement = useDeleteAnnouncement()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', message: '' }
  })

  const onSubmit = (data: z.infer<typeof announcementSchema>) => {
    createAnnouncement.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['announcements'] })
        toast({ title: "Announcement broadcasted" })
        form.reset()
      }
    })
  }

  const handleDelete = (id: number) => {
    deleteAnnouncement.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['announcements'] })
        toast({ title: "Announcement deleted" })
      }
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-white glow-text mb-2">Broadcast System</h1>
        <p className="text-muted-foreground">Send global alerts to all players.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-panel border-white/10 h-fit border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary uppercase tracking-widest">
              <Megaphone className="w-5 h-5"/> New Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({field}) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Maintenance, Bonus, etc." {...field} /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="message" render={({field}) => (
                  <FormItem>
                    <FormLabel>Message Content</FormLabel>
                    <FormControl>
                      <textarea 
                        {...field} 
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 glass-panel font-mono"
                        placeholder="Message to display to players..."
                      />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <Button type="submit" className="w-full" disabled={createAnnouncement.isPending}>Broadcast Message</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-bold uppercase tracking-widest text-muted-foreground px-1">Active Broadcasts</h3>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : announcements?.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-xl text-muted-foreground">No active announcements</div>
          ) : (
            announcements?.map(a => (
              <Card key={a.id} className="glass-panel border-white/5 bg-black/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white tracking-wide">{a.title}</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/20 hover:text-destructive" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{a.message}</p>
                  <div className="text-xs font-mono text-primary/50">{new Date(a.createdAt).toLocaleString()}</div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
