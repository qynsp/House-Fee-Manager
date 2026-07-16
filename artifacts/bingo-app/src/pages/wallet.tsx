import { useGetMe, useListDeposits, useListWithdrawals, useCreateDeposit, useCreateWithdrawal, useGetSettings } from '@workspace/api-client-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

const depositSchema = z.object({
  amount: z.coerce.number().min(10, 'Minimum deposit is 10'),
  telebirrNumber: z.string().min(9, 'Valid number required'),
  transactionId: z.string().min(4, 'Transaction ID required'),
})

const withdrawSchema = z.object({
  amount: z.coerce.number().min(10, 'Minimum withdrawal is 10'),
  telebirrNumber: z.string().min(9, 'Valid number required'),
})

export default function Wallet() {
  const { data: user, isLoading: userLoading } = useGetMe()
  const { data: depositsData } = useListDeposits()
  const { data: withdrawalsData } = useListWithdrawals()
  const { data: settings } = useGetSettings()
  
  const createDeposit = useCreateDeposit()
  const createWithdrawal = useCreateWithdrawal()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const depositForm = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: 100, telebirrNumber: '', transactionId: '' }
  })

  const withdrawForm = useForm<z.infer<typeof withdrawSchema>>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { amount: 100, telebirrNumber: '' }
  })

  const onDepositSubmit = (data: z.infer<typeof depositSchema>) => {
    createDeposit.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['deposits'] })
        setDepositOpen(false)
        depositForm.reset()
        toast({ title: 'Deposit request submitted' })
      },
      onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    })
  }

  const onWithdrawSubmit = (data: z.infer<typeof withdrawSchema>) => {
    createWithdrawal.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['withdrawals'] })
        queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
        setWithdrawOpen(false)
        withdrawForm.reset()
        toast({ title: 'Withdrawal request submitted' })
      },
      onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    })
  }

  if (userLoading) return <div className="p-4 space-y-4"><Skeleton className="h-32 w-full" /></div>

  const transactions = [
    ...(depositsData?.data || []).map(d => ({ ...d, type: 'deposit' })),
    ...(withdrawalsData?.data || []).map(w => ({ ...w, type: 'withdraw' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const getStatusIcon = (status: string) => {
    if (status === 'approved' || status === 'completed') return <CheckCircle2 className="w-4 h-4 text-primary" />
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-destructive" />
    return <Clock className="w-4 h-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-black text-white glow-text uppercase tracking-widest">Wallet</h1>
      </div>

      <Card className="border-primary/30 glow-primary bg-primary/5">
        <CardContent className="p-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center glow-primary">
            <WalletIcon className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Available Balance</div>
            <div className="text-5xl font-mono font-black text-white">${user?.balance?.toFixed(2) || '0.00'}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
              <DialogTrigger asChild>
                <Button className="w-full text-lg h-14 uppercase tracking-widest"><ArrowDownToLine className="mr-2 w-5 h-5"/> Deposit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-2xl uppercase tracking-widest text-primary glow-text">Deposit Funds</DialogTitle>
                  <DialogDescription>Send funds to our Telebirr account, then submit the transaction ID.</DialogDescription>
                </DialogHeader>
                
                <div className="p-4 glass-panel rounded-lg mb-4 text-center space-y-2 border border-primary/20">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Official Telebirr Number</div>
                  <div className="text-2xl font-mono font-bold text-white">{settings?.adminTelebirrNumber || 'Loading...'}</div>
                </div>

                <Form {...depositForm}>
                  <form onSubmit={depositForm.handleSubmit(onDepositSubmit)} className="space-y-4">
                    <FormField control={depositForm.control} name="amount" render={({field}) => (
                      <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={depositForm.control} name="telebirrNumber" render={({field}) => (
                      <FormItem><FormLabel>Your Telebirr Number</FormLabel><FormControl><Input placeholder="+251..." {...field} /></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={depositForm.control} name="transactionId" render={({field}) => (
                      <FormItem><FormLabel>Transaction ID</FormLabel><FormControl><Input placeholder="Telebirr TX ID" {...field} /></FormControl><FormMessage/></FormItem>
                    )}/>
                    <Button type="submit" className="w-full mt-4" disabled={createDeposit.isPending}>Submit Request</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full text-lg h-14 uppercase tracking-widest"><ArrowUpFromLine className="mr-2 w-5 h-5"/> Withdraw</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-2xl uppercase tracking-widest text-secondary glow-text">Withdraw Funds</DialogTitle>
                  <DialogDescription>Request a withdrawal to your Telebirr account.</DialogDescription>
                </DialogHeader>
                <Form {...withdrawForm}>
                  <form onSubmit={withdrawForm.handleSubmit(onWithdrawSubmit)} className="space-y-4">
                    <FormField control={withdrawForm.control} name="amount" render={({field}) => (
                      <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" max={user?.balance} {...field} /></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={withdrawForm.control} name="telebirrNumber" render={({field}) => (
                      <FormItem><FormLabel>Your Telebirr Number</FormLabel><FormControl><Input placeholder="+251..." {...field} /></FormControl><FormMessage/></FormItem>
                    )}/>
                    <Button variant="secondary" type="submit" className="w-full mt-4" disabled={createWithdrawal.isPending}>Submit Request</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold uppercase tracking-widest text-muted-foreground text-sm px-2">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <div className="text-center p-8 glass-panel rounded-xl text-muted-foreground">No transactions yet</div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx: any) => (
              <div key={`${tx.type}-${tx.id}`} className="glass-panel p-4 rounded-xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                    {tx.type === 'deposit' ? <ArrowDownToLine className="w-5 h-5"/> : <ArrowUpFromLine className="w-5 h-5"/>}
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wider text-sm">{tx.type}</div>
                    <div className="text-xs text-muted-foreground font-mono">{new Date(tx.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-lg text-white">
                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs uppercase tracking-wider">
                    {getStatusIcon(tx.status)}
                    <span className={
                      tx.status === 'approved' || tx.status === 'completed' ? 'text-primary' :
                      tx.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'
                    }>{tx.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
