import { useListUsers, useBanUser, useAdjustBalance } from '@workspace/api-client-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useState } from 'react'
import { Search, Ban, CheckCircle, Plus, Minus, UserCog } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const { data: usersPage, isLoading } = useListUsers({ search: debouncedSearch, limit: 50 })
  const banUser = useBanUser()
  const adjustBalance = useAdjustBalance()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)

  // Quick and dirty debounce
  useState(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(t)
  }, [search])

  const handleBanToggle = (userId: number, isBanned: boolean) => {
    banUser.mutate({ id: userId, data: { banned: !isBanned } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] })
        toast({ title: isBanned ? "User Unbanned" : "User Banned" })
      }
    })
  }

  const handleAdjustBalance = () => {
    if (!selectedUser || !adjustAmount) return
    adjustBalance.mutate({ id: selectedUser.id, data: { amount: parseFloat(adjustAmount), reason: adjustReason || 'Admin Adjustment' } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] })
        toast({ title: "Balance Adjusted" })
        setSelectedUser(null)
        setAdjustAmount('')
        setAdjustReason('')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-white glow-text mb-2">User Database</h1>
          <p className="text-muted-foreground">Manage players, bans, and balances.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search username..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Total Wins</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersPage?.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30">
                          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover"/> : <span className="font-bold text-xs text-primary">{user.username.substring(0,2).toUpperCase()}</span>}
                        </div>
                        <div>
                          <div className="font-bold text-white">{user.username}</div>
                          <div className="text-xs text-muted-foreground">ID: {user.telegramId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'secondary' : 'outline'}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-lg text-primary glow-text font-black">${user.balance.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${user.totalWinnings?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-center">
                      {user.isBanned ? <Badge variant="destructive">Banned</Badge> : <Badge className="bg-green-500 text-black border-transparent">Active</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Dialog open={selectedUser?.id === user.id} onOpenChange={(o) => !o && setSelectedUser(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setSelectedUser(user)}>
                            <UserCog className="h-4 w-4 text-secondary" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="uppercase tracking-widest text-secondary glow-text text-xl">Adjust Balance</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="font-bold text-white">{user.username}</span>
                              <span className="text-muted-foreground">• Current: ${user.balance.toFixed(2)}</span>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs uppercase tracking-widest text-muted-foreground">Amount (Use +/-)</label>
                              <Input type="number" placeholder="+100 or -50" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs uppercase tracking-widest text-muted-foreground">Reason</label>
                              <Input placeholder="e.g. Refund, Bonus" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
                            </div>
                            <Button onClick={handleAdjustBalance} className="w-full" variant="secondary">Apply Adjustment</Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant={user.isBanned ? "outline" : "destructive"} 
                        size="icon"
                        onClick={() => handleBanToggle(user.id, user.isBanned)}
                      >
                        {user.isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
