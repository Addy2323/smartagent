"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Calendar, CheckCircle2, Coins, Landmark, Plus, RefreshCw, UserCheck } from "lucide-react"
import { useData } from "@/lib/store"
import { debtOutstanding, debtPaid, debtStatus } from "@/lib/calc"
import { formatDate, formatTZS } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function DebtsPage() {
  const {
    debts,
    addDebt,
    addDebtPayment,
    agentById,
  } = useData()

  // Modal open states
  const [recordOpen, setRecordOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  // Record Debt states
  const [kind, setKind] = useState<"receivable" | "payable">("receivable")
  const [party, setParty] = useState("")
  const [phone, setPhone] = useState("")
  const [principal, setPrincipal] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [description, setDescription] = useState("")
  const [isRecordSubmitting, setIsRecordSubmitting] = useState(false)

  // Payment states
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [isPaySubmitting, setIsPaySubmitting] = useState(false)

  // Calculations
  const stats = useMemo(() => {
    let receivables = 0
    let payables = 0
    let overdue = 0

    const todayStr = new Date().toISOString().slice(0, 10)

    for (const d of debts) {
      const outstanding = debtOutstanding(d)
      if (outstanding <= 0) continue

      if (d.kind === "receivable") {
        receivables += outstanding
      } else {
        payables += outstanding
      }

      if (d.dueDate.slice(0, 10) < todayStr) {
        overdue += outstanding
      }
    }

    return { receivables, payables, overdue }
  }, [debts])

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!party || !principal || isNaN(Number(principal)) || Number(principal) <= 0 || !dueDate) return

    try {
      setIsRecordSubmitting(true)
      await addDebt({
        kind,
        party,
        partyPhone: phone,
        principal: Number(principal),
        description: description || "No notes",
        dueDate: new Date(dueDate).toISOString(),
      })
      setParty("")
      setPhone("")
      setPrincipal("")
      setDueDate("")
      setDescription("")
      setRecordOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsRecordSubmitting(false)
    }
  }

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDebtId || !paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) return

    try {
      setIsPaySubmitting(true)
      await addDebtPayment(selectedDebtId, Number(paymentAmount))
      setPaymentAmount("")
      setSelectedDebtId(null)
      setPayOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsPaySubmitting(false)
    }
  }

  const selectedDebt = useMemo(() => {
    return debts.find((d) => d.id === selectedDebtId)
  }, [debts, selectedDebtId])

  // Filter lists
  const receivablesList = useMemo(() => debts.filter((d) => d.kind === "receivable" && debtOutstanding(d) > 0), [debts])
  const payablesList = useMemo(() => debts.filter((d) => d.kind === "payable" && debtOutstanding(d) > 0), [debts])
  const settledList = useMemo(() => debts.filter((d) => debtOutstanding(d) <= 0), [debts])

  const getStatusBadge = (d: Debt) => {
    const status = debtStatus(d)
    const todayStr = new Date().toISOString().slice(0, 10)
    const isOverdue = d.dueDate.slice(0, 10) < todayStr && debtOutstanding(d) > 0

    if (status === "settled") {
      return (
        <Badge variant="secondary" className="bg-success/10 text-success border-success/20 gap-0.5">
          <CheckCircle2 className="size-3" />
          <span>Paid</span>
        </Badge>
      )
    }
    if (isOverdue) {
      return (
        <Badge variant="destructive" className="gap-0.5">
          <AlertCircle className="size-3" />
          <span>Overdue</span>
        </Badge>
      )
    }
    if (status === "partial") {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/30 gap-0.5">
          <RefreshCw className="size-3 animate-spin-slow" />
          <span>Partial</span>
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-muted-foreground border-muted gap-0.5">
        <AlertCircle className="size-3" />
        <span>Open</span>
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Customer Debt & Advances</h2>
          <p className="text-sm text-muted-foreground">
            Track receivables (money advanced to customers) and payables (credit from float suppliers).
          </p>
        </div>

        <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 h-8">
              <Plus className="size-3.5" />
              <span className="text-xs">Record Debt Log</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Record Debt / Credit</DialogTitle>
              <DialogDescription>
                Create a ledger entry for customer debt (receivable) or supplier credit (payable).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRecordSubmit} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="db-kind">Entry Kind</Label>
                <Select
                  value={kind}
                  onValueChange={(val: "receivable" | "payable") => setKind(val)}
                >
                  <SelectTrigger id="db-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">Customer Debt (Receivable)</SelectItem>
                    <SelectItem value="payable">Supplier Credit (Payable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="db-party">Party / Person Name</Label>
                <Input
                  id="db-party"
                  placeholder="Baraka John"
                  required
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="db-phone">Phone Number</Label>
                <Input
                  id="db-phone"
                  placeholder="0764 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="db-principal">Principal (TZS)</Label>
                  <Input
                    id="db-principal"
                    type="number"
                    placeholder="Principal"
                    required
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="db-due">Due Date</Label>
                  <Input
                    id="db-due"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="db-desc">Notes / Reason</Label>
                <Input
                  id="db-desc"
                  placeholder="Short float covered"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setRecordOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isRecordSubmitting || !party || !principal || !dueDate}>
                  {isRecordSubmitting ? "Saving..." : "Record Debt"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Customer Debts</p>
              <h3 className="text-2xl font-bold mt-1 text-primary">{formatTZS(stats.receivables)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Outstanding receivables from clients</p>
            </div>
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Supplier Credits</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight text-slate-800 dark:text-slate-200">
                {formatTZS(stats.payables)}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Outstanding payables to quick-float vendors</p>
            </div>
            <div className="size-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Landmark className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Overdue Balances</p>
              <h3 className="text-2xl font-bold mt-1 text-destructive">{formatTZS(stats.overdue)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Past due dates (requires follow-up)</p>
            </div>
            <div className="size-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debt Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={(val) => { if(!val) setSelectedDebtId(null); setPayOpen(val); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
            <DialogDescription>
              Log cash payment made toward this debt balance.
            </DialogDescription>
          </DialogHeader>
          {selectedDebt && (
            <form onSubmit={handlePaySubmit} className="flex flex-col gap-4 py-4">
              <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Party:</span>
                  <span className="font-semibold">{selectedDebt.party}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Principal:</span>
                  <span className="font-mono">{formatTZS(selectedDebt.principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-mono font-semibold text-destructive">
                    {formatTZS(debtOutstanding(selectedDebt))}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-amount">Payment Amount (TZS)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  placeholder={`Max ${debtOutstanding(selectedDebt)}`}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => { setPayOpen(false); setSelectedDebtId(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPaySubmitting || !paymentAmount}>
                  {isPaySubmitting ? "Processing..." : "Confirm Payment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Lists Group */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="receivables">
            <div className="px-6 border-b">
              <TabsList className="w-full justify-start h-10 bg-transparent p-0 gap-4">
                <TabsTrigger
                  value="receivables"
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 font-semibold text-xs"
                >
                  Receivables ({receivablesList.length})
                </TabsTrigger>
                <TabsTrigger
                  value="payables"
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 font-semibold text-xs"
                >
                  Payables ({payablesList.length})
                </TabsTrigger>
                <TabsTrigger
                  value="settled"
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 font-semibold text-xs"
                >
                  Settled ({settledList.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="receivables" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party / Client</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivablesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No outstanding receivables found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    receivablesList.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs">{d.party}</span>
                            <span className="text-[10px] text-muted-foreground">{d.phone || d.partyPhone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">{formatTZS(d.principal)}</TableCell>
                        <TableCell className="font-mono text-xs tabular-nums text-success">
                          {formatTZS(debtPaid(d))}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold tabular-nums text-destructive">
                          {formatTZS(debtOutstanding(d))}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(d.dueDate)}
                        </TableCell>
                        <TableCell>{getStatusBadge(d)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDebtId(d.id)
                              setPayOpen(true)
                            }}
                            className="h-7 text-[10px] gap-1"
                          >
                            <Coins className="size-3" />
                            <span>Collect</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="payables" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party / Vendor</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payablesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No outstanding supplier credits found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payablesList.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs">{d.party}</span>
                            <span className="text-[10px] text-muted-foreground">{d.phone || d.partyPhone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">{formatTZS(d.principal)}</TableCell>
                        <TableCell className="font-mono text-xs tabular-nums text-success">
                          {formatTZS(debtPaid(d))}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold tabular-nums text-destructive">
                          {formatTZS(debtOutstanding(d))}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(d.dueDate)}
                        </TableCell>
                        <TableCell>{getStatusBadge(d)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDebtId(d.id)
                              setPayOpen(true)
                            }}
                            className="h-7 text-[10px] gap-1"
                          >
                            <Coins className="size-3" />
                            <span>Repay</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="settled" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Settled On</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settledList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No settled debts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    settledList.map((d) => {
                      const lastPaymentDate = d.payments.length > 0
                        ? formatDate(d.payments[d.payments.length - 1].createdAt)
                        : formatDate(d.createdAt)

                      return (
                        <TableRow key={d.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs">{d.party}</span>
                              <span className="text-[10px] text-muted-foreground">{d.phone || d.partyPhone}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal">
                              {d.kind === "receivable" ? "Customer Receivable" : "Supplier Payable"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs tabular-nums">{formatTZS(d.principal)}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold tabular-nums text-success">
                            {formatTZS(debtPaid(d))}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {lastPaymentDate}
                          </TableCell>
                          <TableCell>{getStatusBadge(d)}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
