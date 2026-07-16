import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAdminLogin } from '@workspace/api-client-react'
import { setToken } from '@/lib/auth'
import { useLocation } from 'wouter'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Gamepad2 } from 'lucide-react'

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required')
})

export default function AdminLogin() {
  const [, setLocation] = useLocation()
  const adminLogin = useAdminLogin()

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' }
  })

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    adminLogin.mutate(
      { data: { password: data.password } },
      {
        onSuccess: (res) => {
          setToken(res.token)
          setLocation('/admin')
        },
        onError: () => {
          form.setError('password', { message: 'Invalid credentials' })
        }
      }
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background">
      <Card className="w-full max-w-sm border-primary/20 glow-primary">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center glow-primary">
            <Gamepad2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-widest text-primary glow-text">Admin Access</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Code</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="text-center text-xl tracking-widest" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={adminLogin.isPending}>
                {adminLogin.isPending ? 'Authenticating...' : 'Enter Mainframe'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
