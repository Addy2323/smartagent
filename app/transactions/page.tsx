"use client"

import { useMemo, useState } from "react"
import { ArrowDownLeft, ArrowUpRight, Plus, Search, ShieldCheck, Pencil } from "lucide-react"
import { useData } from "@/lib/store"
import { formatDateTime, formatTZS } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TransactionsPage() {
  const {
    transactions,
    networks,
    agents,
    role,
    currentAgent,
    addTransaction,
    updateTransaction,
    previewCommission,
    networkById,
    agentById,
  } = useData()

  // Modal open states
  const [open, setOpen] = useState(false)

  // Transaction form states
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit")
  const [networkId, setNetworkId] = useState("")
  const [amount, setAmount] = useState("")
  const [customer, setCustomer] = useState("")
  const [phone, setPhone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<any>(null)
  const [editType, setEditType] = useState<"deposit" | "withdrawal">("deposit")
  const [editAmount, setEditAmount] = useState("")
  const [editCustomer, setEditCustomer] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editRef, setEditRef] = useState("")
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false)

  const startEditTx = (tx: any) => {
    setEditingTx(tx)
    setEditType(tx.type)
    setEditAmount(tx.amount.toString())
    setEditCustomer(tx.customer)
    setEditPhone(tx.customerPhone)
    setEditRef(tx.ref)
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTx || !editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0) return

    try {
      setIsEditingSubmitting(true)
      await updateTransaction(editingTx.id, {
        type: editType,
        amount: Number(editAmount),
        customer: editCustomer || "Walk-in Customer",
        customerPhone: editPhone || "",
        ref: editRef,
      })
      setIsEditOpen(false)
      setEditingTx(null)
    } catch (err) {
      console.error(err)
    } finally {
      setIsEditingSubmitting(false)
    }
  }

  // Filters state
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterNetwork, setFilterNetwork] = useState("all")
  const [filterAgent, setFilterAgent] = useState("all")

  // Live Commission Preview
  const liveCommission = useMemo(() => {
    const amtNum = Number(amount)
    if (!networkId || !amtNum || isNaN(amtNum)) return 0
    return previewCommission(type, networkId, amtNum)
  }, [type, networkId, amount, previewCommission])

  // Float balance check warning
  const floatWarning = useMemo(() => {
    if (type !== "deposit" || !networkId || !amount) return null
    const net = networks.find((n) => n.id === networkId)
    if (!net) return null
    const amtNum = Number(amount)
    if (amtNum > net.floatBalance) {
      return `Warning: Float balance of ${net.name} is insufficient (${formatTZS(net.floatBalance)}). Transaction can still be logged but balance will go negative.`
    }
    return null
  }, [type, networkId, amount, networks])

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        t.ref.toLowerCase().includes(search.toLowerCase()) ||
        t.customer.toLowerCase().includes(search.toLowerCase()) ||
        t.customerPhone.includes(search)
      const matchType = filterType === "all" || t.type === filterType
      const matchNetwork = filterNetwork === "all" || t.networkId === filterNetwork
      const matchAgent = filterAgent === "all" || t.agentId === filterAgent
      return matchSearch && matchType && matchNetwork && matchAgent
    })
  }, [transactions, search, filterType, filterNetwork, filterAgent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!networkId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return

    try {
      setIsSubmitting(true)
      await addTransaction({
        type,
        networkId,
        amount: Number(amount),
        customer: customer || "Walk-in Customer",
        customerPhone: phone || "",
      })
      // Clear form
      setNetworkId("")
      setAmount("")
      setCustomer("")
      setPhone("")
      setOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Transactions Ledger</h2>
          <p className="text-sm text-muted-foreground">
            {role === "super_admin"
              ? "View and manage all transactions performed across all agents"
              : `View and record your transactions (Agent: ${currentAgent?.name})`}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 shadow-sm">
              <Plus className="size-4" />
              <span>Record Transaction</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
              <DialogDescription>
                Perform a new Cash Deposit (Cash-In) or Cash Withdrawal (Cash-Out) transaction.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tx-type">Transaction Type</Label>
                  <Select
                    value={type}
                    onValueChange={(val: "deposit" | "withdrawal") => setType(val)}
                  >
                    <SelectTrigger id="tx-type">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit (Cash-In)</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal (Cash-Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tx-network">Mobile Network</Label>
                  <Select value={networkId} onValueChange={setNetworkId}>
                    <SelectTrigger id="tx-network">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks
                        .filter((n) => n.active)
                        .map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name} ({formatTZS(n.floatBalance, { compact: true })})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tx-amount">Amount (TZS)</Label>
                <Input
                  id="tx-amount"
                  type="number"
                  placeholder="Enter transaction amount"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {floatWarning && (
                <div className="rounded-md bg-warning/15 p-2.5 text-[11px] font-medium leading-relaxed text-warning-foreground">
                  {floatWarning}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tx-customer">Customer Name (Optional)</Label>
                  <Input
                    id="tx-customer"
                    placeholder="Fatuma Said"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tx-phone">Customer Phone (Optional)</Label>
                  <Input
                    id="tx-phone"
                    placeholder="0712 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Commission Preview Card */}
              {liveCommission > 0 && (
                <Card className="border-success/30 bg-success/5 shadow-none">
                  <CardContent className="flex items-center justify-between p-3 text-xs text-success font-medium">
                    <span>Calculated Commission:</span>
                    <span className="text-sm font-semibold">{formatTZS(liveCommission)}</span>
                  </CardContent>
                </Card>
              )}

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !networkId || !amount}>
                  {isSubmitting ? "Saving..." : "Confirm & Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
          <div className="relative w-full sm:min-w-[200px] sm:flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search reference, customer..."
              className="pl-8 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 flex-1 min-w-[120px] sm:flex-initial">
              <span className="text-xs text-muted-foreground">Type:</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[120px] sm:flex-initial">
              <span className="text-xs text-muted-foreground">Network:</span>
              <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Networks</SelectItem>
                  {networks.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {role === "super_admin" && (
              <div className="flex items-center gap-2 flex-1 min-w-[120px] sm:flex-initial">
                <span className="text-xs text-muted-foreground">Agent:</span>
                <Select value={filterAgent} onValueChange={setFilterAgent}>
                  <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table Card */}
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Transactions Log</CardTitle>
            <span className="text-xs text-muted-foreground">
              Showing {filteredTxs.length} of {transactions.length} items
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Reference</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Customer</TableHead>
                  {role === "super_admin" && <TableHead>Agent</TableHead>}
                  <TableHead className="w-[80px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTxs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={role === "super_admin" ? 8 : 7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTxs.map((t) => {
                    const net = networkById(t.networkId)
                    const isDeposit = t.type === "deposit"
                    const ag = agentById(t.agentId)

                    return (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold">{t.ref}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(t.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="gap-1 font-normal">
                            <span className="size-1.5 rounded-full bg-primary" />
                            {net?.name || t.networkId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              isDeposit
                                ? "bg-success/10 text-success border-success/20 gap-1"
                                : "bg-destructive/10 text-destructive border-destructive/20 gap-1"
                            }
                          >
                            {isDeposit ? (
                              <>
                                <ArrowDownLeft className="size-3" />
                                <span>Deposit</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="size-3" />
                                <span>Withdrawal</span>
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-right tabular-nums pr-6">
                          {formatTZS(t.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium text-success text-right tabular-nums pr-6">
                          +{formatTZS(t.commission)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{t.customer}</span>
                            {t.customerPhone && (
                              <span className="text-[10px] text-muted-foreground">
                                {t.customerPhone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {role === "super_admin" && (
                          <TableCell>
                            <Badge variant="secondary" className="gap-1 font-normal text-xs bg-muted">
                              {ag?.name || "Unknown Agent"}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => startEditTx(t)}
                            className="h-8 w-8 p-0 hover:bg-slate-100"
                            disabled={role !== "super_admin" && t.agentId !== currentAgent?.id}
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Correct details or transaction bounds if mistakes were made.
            </DialogDescription>
          </DialogHeader>
          {editingTx && (
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-tx-type">Transaction Type</Label>
                  <Select
                    value={editType}
                    onValueChange={(val: "deposit" | "withdrawal") => setEditType(val)}
                  >
                    <SelectTrigger id="edit-tx-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit (Cash-In)</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal (Cash-Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Mobile Network</Label>
                  <Input value={networkById(editingTx.networkId)?.name || editingTx.networkId} disabled className="bg-slate-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-tx-ref">Reference ID</Label>
                  <Input
                    id="edit-tx-ref"
                    required
                    value={editRef}
                    onChange={(e) => setEditRef(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-tx-amount">Amount (TZS)</Label>
                  <Input
                    id="edit-tx-amount"
                    type="number"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-tx-customer">Customer Name</Label>
                  <Input
                    id="edit-tx-customer"
                    value={editCustomer}
                    onChange={(e) => setEditCustomer(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-tx-phone">Customer Phone</Label>
                  <Input
                    id="edit-tx-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditingSubmitting || !editAmount}>
                  {isEditingSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
