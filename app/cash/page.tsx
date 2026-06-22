"use client"

import { useMemo, useState } from "react"
import { ArrowDownLeft, ArrowUpRight, Banknote, HelpCircle, Import, Plus } from "lucide-react"
import { useData } from "@/lib/store"
import { formatDateTime, formatTZS } from "@/lib/format"
import { isToday } from "@/lib/calc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function CashPage() {
  const {
    cashBalance,
    cashEntries,
    transactions,
    addCashEntry,
    agentById,
  } = useData()

  // Modal open states
  const [open, setOpen] = useState(false)

  // Form states
  const [direction, setDirection] = useState<"in" | "out">("in")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculations for today's cash inflows/outflows
  const cashStats = useMemo(() => {
    let opening = 0 // SEED_CASH_BALANCE
    let todayIn = 0
    let todayOut = 0

    // Filter historical totals (everything before today) to find opening cash for today
    for (const ce of cashEntries) {
      if (isToday(ce.createdAt)) {
        if (ce.direction === "in") todayIn += ce.amount
        else todayOut += ce.amount
      } else {
        // Adjust opening balance by historical logs
        opening += ce.direction === "in" ? ce.amount : -ce.amount
      }
    }

    for (const tx of transactions) {
      if (isToday(tx.createdAt)) {
        if (tx.type === "deposit") todayIn += tx.amount
        else todayOut += tx.amount
      } else {
        opening += tx.type === "deposit" ? tx.amount : -tx.amount
      }
    }

    return {
      opening,
      inflows: todayIn,
      outflows: todayOut,
    }
  }, [cashEntries, transactions])

  // Aggregate cash ledger combining manual cash entries and transactions
  const combinedLedger = useMemo(() => {
    const list: Array<{
      id: string
      date: string
      type: "transaction" | "adjustment"
      direction: "in" | "out"
      amount: number
      reason: string
      agentId: string
    }> = []

    for (const ce of cashEntries) {
      list.push({
        id: ce.id,
        date: ce.createdAt,
        type: "adjustment",
        direction: ce.direction,
        amount: ce.amount,
        reason: ce.reason,
        agentId: ce.agentId,
      })
    }

    for (const tx of transactions) {
      list.push({
        id: tx.id,
        date: tx.createdAt,
        type: "transaction",
        direction: tx.type === "deposit" ? "in" : "out", // deposit increases drawer cash
        amount: tx.amount,
        reason: `${tx.type === "deposit" ? "Deposit Received" : "Withdrawal Disbursed"} (${tx.ref})`,
        agentId: tx.agentId,
      })
    }

    return list.sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [cashEntries, transactions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !reason) return

    try {
      setIsSubmitting(true)
      await addCashEntry({
        direction,
        amount: Number(amount),
        reason,
      })
      setAmount("")
      setReason("")
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
          <h2 className="text-xl font-bold tracking-tight">Cash Management</h2>
          <p className="text-sm text-muted-foreground">
            Track and reconcile physical paper cash inside the shop drawer.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 h-8">
              <Plus className="size-3.5" />
              <span className="text-xs">Adjust Cash Ledger</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Cash Ledger Adjustment</DialogTitle>
              <DialogDescription>
                Record manual physical cash additions or removals (e.g. banking excess cash, cash corrections).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="adj-direction">Adjustment Direction</Label>
                <Select
                  value={direction}
                  onValueChange={(val: "in" | "out") => setDirection(val)}
                >
                  <SelectTrigger id="adj-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Cash In (Receive Cash)</SelectItem>
                    <SelectItem value="out">Cash Out (Pay/Deposit Cash)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="adj-amount">Cash Amount (TZS)</Label>
                <Input
                  id="adj-amount"
                  type="number"
                  placeholder="Enter amount"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="adj-reason">Reason Description</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="adj-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Opening Cash Balance">Opening Cash Balance Adjustment</SelectItem>
                    <SelectItem value="Bank Deposit (Excess Cash)">Bank Deposit (Excess cash from shop)</SelectItem>
                    <SelectItem value="Owner Withdrawal (Profit take)">Owner Cash Takeout (Profit)</SelectItem>
                    <SelectItem value="Cash Refill (From HQ/Owner)">Cash Refill (From Owner)</SelectItem>
                    <SelectItem value="Cash Drawer Discrepancy Correction">Drawer Correction / Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !amount || !reason}>
                  {isSubmitting ? "Processing..." : "Save Entry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cash drawer summary board */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Main cash drawer indicator */}
        <Card className="relative overflow-hidden bg-primary text-primary-foreground sm:col-span-2 lg:col-span-1">
          <div className="absolute right-3 top-3 size-20 text-primary-foreground/10 pointer-events-none">
            <Banknote className="w-full h-full" />
          </div>
          <CardHeader className="pb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/80">Cash on Hand (Drawer)</p>
          </CardHeader>
          <CardContent>
            <h3 className="text-3xl font-extrabold tracking-tight">{formatTZS(cashBalance)}</h3>
            <p className="text-[10px] text-primary-foreground/80 mt-1">Total physical cash inside the shop drawer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Today's Opening Cash</p>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold">{formatTZS(cashStats.opening)}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Starting cash balance at 00:00 today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Today's Cash Inflows</p>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-success">+{formatTZS(cashStats.inflows)}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">From deposits, receipts, and additions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Today's Cash Outflows</p>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-destructive">-{formatTZS(cashStats.outflows)}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">From withdrawals, expenses, and banking</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Ledger History */}
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-sm font-semibold">Cash Flow Ledger</CardTitle>
          <CardDescription>Chronological log of physical cash inflows and outflows inside the drawer.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Ledger Type</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead className="text-right">Amount (TZS)</TableHead>
                  <TableHead>Reason Description</TableHead>
                  <TableHead>Logged By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No cash movements recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  combinedLedger.map((ce) => {
                    const isIn = ce.direction === "in"
                    const ag = agentById(ce.agentId)

                    return (
                      <TableRow key={ce.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(ce.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal text-xs">
                            {ce.type === "transaction" ? "Transaction Log" : "Cash Adjustment"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              isIn
                                ? "bg-success/10 text-success border-success/20 gap-0.5"
                                : "bg-destructive/10 text-destructive border-destructive/20 gap-0.5"
                            }
                          >
                            {isIn ? (
                              <>
                                <ArrowDownLeft className="size-3" />
                                <span>Cash In</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="size-3" />
                                <span>Cash Out</span>
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-mono text-xs font-semibold text-right pr-6 tabular-nums ${isIn ? "text-success" : "text-destructive"}`}>
                          {isIn ? "+" : "-"}{formatTZS(ce.amount)}
                        </TableCell>
                        <TableCell className="text-xs max-w-[250px] truncate">
                          {ce.reason}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {ag?.name || "System"}
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
    </div>
  )
}
