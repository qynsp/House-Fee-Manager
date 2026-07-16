import { useListDeposits, useApproveDeposit, useRejectDeposit } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export default function AdminDeposits() {
  const { data: depositsPage, isLoading } = useListDeposits({ limit: 50 })
  const approveDeposit = useApproveDeposit()
  const rejectDeposit = useRejectDeposit()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [rejectReason, setRejectReason] = useState('')
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null)

  const handleApprove = (id: number) => {
    approveDeposit.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['deposits'] })
        toast({ title: "Deposit Approved", description: "Funds added to user balance." })
      }
    })
  }

  const handleReject = () => {
    if (!selectedDeposit || !rejectReason) return
    rejectDeposit.mutate({ id: selectedDeposit.id, data: { reason: rejectReason } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['deposits'] })
        toast({ title: "Deposit Rejected", variant: "destructive" })
        setSelectedDeposit(null)
        setRejectReason('')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-primary glow-text mb-2">Deposit Queue</h1>
        <p className="text-muted-foreground">Review and approve player deposits.</p>
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
                  <TableHead>TX ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositsPage?.data.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="font-bold text-white">{deposit.username || `ID: ${deposit.userId}`}</TableCell>
                    <TableCell className="text-muted-foreground">{deposit.telebirrNumber}</TableCell>
                    <TableCell className="text-muted-foreground font-mono">{deposit.transactionId}</TableCell>
                    <TableCell className="text-right text-lg text-primary glow-text font-black">${deposit.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {deposit.status === 'pending' ? <Badge className="bg-yellow-500 text-black border-transparent"><Clock className="w-3 h-3 mr-1"/> Pending</Badge> :
                       deposit.status === 'approved' ? <Badge className="bg-green-500 text-black border-transparent"><CheckCircle className="w-3 h-3 mr-1"/> Approved</Badge> :
                       <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{new Date(deposit.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {deposit.status === 'pending' && (
                        <>
                          <Button variant="default" size="sm" onClick={() => handleApprove(deposit.id)} disabled={approveDeposit.isPending}>Approve</Button>
                          
                          <Dialog open={selectedDeposit?.id === deposit.id} onOpenChange={(o) => !o && setSelectedDeposit(null)}>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm" onClick={() => setSelectedDeposit(deposit)}>Reject</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="uppercase tracking-widest text-destructive glow-text text-xl">Reject Deposit</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Reason for rejection</label>
                                  <Input placeholder="Invalid TX ID, name mismatch, etc." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                                </div>
                                <Button onClick={handleReject} className="w-full" variant="destructive" disabled={!rejectReason}>Confirm Rejection</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!depositsPage?.data || depositsPage.data.length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center p-8 text-muted-foreground">No deposits found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
