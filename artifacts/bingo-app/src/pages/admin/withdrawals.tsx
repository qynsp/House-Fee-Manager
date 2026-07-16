import { useListWithdrawals, useApproveWithdrawal, useCompleteWithdrawal, useRejectWithdrawal } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export default function AdminWithdrawals() {
  const { data: withdrawalsPage, isLoading } = useListWithdrawals({ limit: 50 })
  const approveWithdrawal = useApproveWithdrawal()
  const completeWithdrawal = useCompleteWithdrawal()
  const rejectWithdrawal = useRejectWithdrawal()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [rejectReason, setRejectReason] = useState('')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null)

  const handleApprove = (id: number) => {
    approveWithdrawal.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['withdrawals'] })
        toast({ title: "Withdrawal Approved", description: "Now ready for transfer." })
      }
    })
  }

  const handleComplete = (id: number) => {
    completeWithdrawal.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['withdrawals'] })
        toast({ title: "Withdrawal Completed", description: "Marked as paid." })
      }
    })
  }

  const handleReject = () => {
    if (!selectedWithdrawal || !rejectReason) return
    rejectWithdrawal.mutate({ id: selectedWithdrawal.id, data: { reason: rejectReason } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['withdrawals'] })
        toast({ title: "Withdrawal Rejected", description: "Funds returned to user.", variant: "destructive" })
        setSelectedWithdrawal(null)
        setRejectReason('')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-secondary glow-text mb-2">Withdrawal Queue</h1>
        <p className="text-muted-foreground">Process player cashouts.</p>
      </div>

      <Card className="glass-panel border-white/10">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Telebirr #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawalsPage?.data.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-bold text-white">{withdrawal.username || `ID: ${withdrawal.userId}`}</TableCell>
                    <TableCell className="text-muted-foreground font-mono">{withdrawal.telebirrNumber}</TableCell>
                    <TableCell className="text-right text-lg text-secondary glow-text font-black">${withdrawal.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {withdrawal.status === 'pending' ? <Badge className="bg-yellow-500 text-black border-transparent"><Clock className="w-3 h-3 mr-1"/> Pending Review</Badge> :
                       withdrawal.status === 'approved' ? <Badge className="bg-blue-500 text-black border-transparent"><ArrowRight className="w-3 h-3 mr-1"/> Ready to Pay</Badge> :
                       withdrawal.status === 'completed' ? <Badge className="bg-green-500 text-black border-transparent"><CheckCircle className="w-3 h-3 mr-1"/> Paid</Badge> :
                       <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{new Date(withdrawal.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {withdrawal.status === 'pending' && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => handleApprove(withdrawal.id)} disabled={approveWithdrawal.isPending}>Approve</Button>
                          <Dialog open={selectedWithdrawal?.id === withdrawal.id} onOpenChange={(o) => !o && setSelectedWithdrawal(null)}>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm" onClick={() => setSelectedWithdrawal(withdrawal)}>Reject</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="uppercase tracking-widest text-destructive glow-text text-xl">Reject Withdrawal</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Reason for rejection (Funds will be returned)</label>
                                  <Input placeholder="Invalid number, suspicious activity, etc." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                                </div>
                                <Button onClick={handleReject} className="w-full" variant="destructive" disabled={!rejectReason}>Confirm Rejection</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      {withdrawal.status === 'approved' && (
                        <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => handleComplete(withdrawal.id)} disabled={completeWithdrawal.isPending}>
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!withdrawalsPage?.data || withdrawalsPage.data.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center p-8 text-muted-foreground">No withdrawals found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
