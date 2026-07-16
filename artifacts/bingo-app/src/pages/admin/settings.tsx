import { useGetSettings, useUpdateSettings } from '@workspace/api-client-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { useEffect } from 'react'
import { Settings2, Save } from 'lucide-react'

const settingsSchema = z.object({
  houseFeePct: z.coerce.number().min(0).max(100),
  ticketPrice: z.coerce.number().min(1),
  drawIntervalMs: z.coerce.number().min(1000),
  countdownSecs: z.coerce.number().min(5),
  minPlayers: z.coerce.number().min(1),
  maxPlayers: z.coerce.number().min(2),
  adminTelebirrNumber: z.string().min(9),
})

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetSettings()
  const updateSettings = useUpdateSettings()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        houseFeePct: settings.houseFeePct,
        ticketPrice: settings.ticketPrice,
        drawIntervalMs: settings.drawIntervalMs,
        countdownSecs: settings.countdownSecs,
        minPlayers: settings.minPlayers,
        maxPlayers: settings.maxPlayers,
        adminTelebirrNumber: settings.adminTelebirrNumber || '',
      })
    }
  }, [settings, form])

  const onSubmit = (data: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['settings'] })
        toast({ title: "Settings Updated", description: "Changes apply to the next game round." })
      },
      onError: (err: any) => {
        toast({ title: "Update Failed", description: err.message, variant: "destructive" })
      }
    })
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-white glow-text mb-2">House Engine</h1>
        <p className="text-muted-foreground">Configure game economics and operational parameters.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary uppercase tracking-widest"><Settings2 className="w-5 h-5"/> Economics</CardTitle>
              <CardDescription>Controls ticket pricing and house cut.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="ticketPrice" render={({field}) => (
                <FormItem>
                  <FormLabel>Ticket Price ($)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>Cost per bingo ticket.</FormDescription>
                  <FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="houseFeePct" render={({field}) => (
                <FormItem>
                  <FormLabel>House Edge (%)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>Percentage of pot kept by house (0-100). Remaining goes to prize pool.</FormDescription>
                  <FormMessage/>
                </FormItem>
              )}/>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="text-secondary uppercase tracking-widest">Game Pacing</CardTitle>
              <CardDescription>Timings and player limits.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="drawIntervalMs" render={({field}) => (
                <FormItem>
                  <FormLabel>Draw Interval (ms)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>Milliseconds between each number draw.</FormDescription>
                  <FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="countdownSecs" render={({field}) => (
                <FormItem>
                  <FormLabel>Lobby Countdown (s)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>Seconds to wait in lobby before starting.</FormDescription>
                  <FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="minPlayers" render={({field}) => (
                <FormItem>
                  <FormLabel>Min Players</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>Minimum tickets needed to start a game.</FormDescription>
                  <FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="maxPlayers" render={({field}) => (
                <FormItem>
                  <FormLabel>Max Players</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>Maximum tickets per game.</FormDescription>
                  <FormMessage/>
                </FormItem>
              )}/>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="text-accent uppercase tracking-widest">Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="adminTelebirrNumber" render={({field}) => (
                <FormItem className="max-w-md">
                  <FormLabel>House Telebirr Number</FormLabel>
                  <FormControl><Input placeholder="+251..." {...field} /></FormControl>
                  <FormDescription>The number users should send deposits to.</FormDescription>
                  <FormMessage/>
                </FormItem>
              )}/>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={updateSettings.isPending} className="w-full md:w-auto px-12 h-14 text-lg">
              <Save className="mr-2 w-5 h-5"/>
              Deploy Core Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
