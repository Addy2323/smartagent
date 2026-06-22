"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Wallet,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Coins,
} from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function BankFloatPage() {
  const {
    bankFloatTopups,
    banks,
    agents,
    role,
    currentAgent,
    addBankFloatTopup,
    reconcileBankFloat,
    cashBalance,
  } = useData()

  // Modal open states
  const [topupOpen, setTopupOpen] = useState(false)
  const [reconOpen, setReconOpen] = useState(false)

  // Topup Form states
  const [topupBankId, setTopupBankId] = useState("")
  const [topupAmount, setTopupAmount] = useState("")
  const [topupSource, setTopupSource] = useState("bank_transfer")
  const [topupFromCash, setTopupFromCash] = useState(false)
  const [topupNote, setTopupNote] = useState("")
  const [isTopupSubmitting, setIsTopupSubmitting] = useState(false)

  // Reconciliation Form states
  const [reconBankId, setReconBankId] = useState("")
  const [reconPortalBalance, setReconPortalBalance] = useState("")
  const [reconNotes, setReconNotes] = useState("")
  const [isReconSubmitting, setIsReconSubmitting] = useState(false)
  const [reconResult, setReconResult] = useState<{
    success: boolean
    bankId: string
    portalBalance: number
    systemBalance: number
    discrepancy: number
    message: string
  } | null>(null)

  // Filters state
  const [search, setSearch] = useState("")
  const [filterBank, setFilterBank] = useState("all")

  // Selected Bank for Topup
  const selectedTopupBank = useMemo(() => {
    return banks.find((b) => b.id === topupBankId)
  }, [banks, topupBankId])

  // Cash validation warning
  const cashWarning = useMemo(() => {
    if (!topupFromCash || !topupAmount) return null
    const amt = Number(topupAmount)
    if (isNaN(amt) || amt <= 0) return null
    if (amt > cashBalance) {
      return `Warning: Cash drawer has insufficient funds (${formatTZS(cashBalance)}). Cash drawer balance will go negative.`
    }
    return null
  }, [topupFromCash, topupAmount, cashBalance])

  // Filtered Topups
  const filteredTopups = useMemo(() => {
    return bankFloatTopups.filter((f) => {
      const bank = banks.find((b) => b.id === f.bankId)
      const searchStr = search.toLowerCase()
      
      const matchSearch =
        (bank && bank.name.toLowerCase().includes(searchStr)) ||
        f.source.toLowerCase().includes(searchStr) ||
        f.note.toLowerCase().includes(searchStr)

      const matchBank = filterBank === "all" || f.bankId === filterBank
      return matchSearch && matchBank
    })
  }, [bankFloatTopups, banks, search, filterBank])

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topupBankId || !topupAmount || isNaN(Number(topupAmount)) || Number(topupAmount) <= 0) return

    try {
      setIsTopupSubmitting(true)
      await addBankFloatTopup({
        bankId: topupBankId,
        amount: Number(topupAmount),
        source: topupSource,
        note: topupNote,
        fromCash: topupFromCash,
      })

      // Reset Form
      setTopupBankId("")
      setTopupAmount("")
      setTopupSource("bank_transfer")
      setTopupFromCash(false)
      setTopupNote("")
      setTopupOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsTopupSubmitting(false)
    }
  }

  const handleReconSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reconBankId || reconPortalBalance === "" || isNaN(Number(reconPortalBalance))) return

    try {
      setIsReconSubmitting(true)
      const res = await reconcileBankFloat(
        reconBankId,
        Number(reconPortalBalance),
        reconNotes
      )
      setReconResult(res)
    } catch (err) {
      console.error(err)
    } finally {
      setIsReconSubmitting(false)
    }
  }

  const totalBankFloat = useMemo(() => {
    return banks.reduce((sum, b) => sum + b.floatBalance, 0)
  }, [banks])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Bank Float Management</h2>
          <p className="text-sm text-muted-foreground">
            Top up electronic bank float balances, view top-up ledgers, and reconcile system balances with bank portals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={reconOpen} onOpenChange={(open) => {
            setReconOpen(open)
            if (!open) setReconResult(null)
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1.5 shadow-sm">
                <RefreshCw className="size-4" />
                <span>Portal Reconciliation</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Portal Balance Reconciliation</DialogTitle>
                <DialogDescription>
                  Compare physical bank portal balance with internal float balance to identify discrepancies.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleReconSubmit} className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recon-bank">Select Bank</Label>
                  <Select value={reconBankId} onValueChange={setReconBankId}>
                    <SelectTrigger id="recon-bank">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recon-portal">Portal Current Balance (TZS)</Label>
                  <Input
                    id="recon-portal"
                    type="number"
                    placeholder="Enter balance from bank portal"
                    required
                    value={reconPortalBalance}
                    onChange={(e) => setReconPortalBalance(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recon-notes">Notes / Observations</Label>
                  <Input
                    id="recon-notes"
                    placeholder="Describe discrepancy reasons, if any"
                    value={reconNotes}
                    onChange={(e) => setReconNotes(e.target.value)}
                  />
                </div>

                {reconResult && (
                  <Card className={`border shadow-none ${reconResult.discrepancy === 0 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <CardContent className="p-4 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        {reconResult.discrepancy === 0 ? (
                          <CheckCircle className="size-4 text-success" />
                        ) : (
                          <AlertTriangle className="size-4 text-destructive" />
                        )}
                        <span className={`font-semibold ${reconResult.discrepancy === 0 ? "text-success" : "text-destructive"}`}>
                          {reconResult.discrepancy === 0 ? "Float Reconciled!" : "Discrepancy Detected!"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mt-2 text-[11px] text-muted-foreground font-mono">
                        <span>Internal Balance:</span>
                        <span className="text-right text-foreground">{formatTZS(reconResult.systemBalance)}</span>
                        <span>Portal Balance:</span>
                        <span className="text-right text-foreground">{formatTZS(reconResult.portalBalance)}</span>
                        <span className="font-semibold text-foreground">Discrepancy:</span>
                        <span className={`text-right font-bold ${reconResult.discrepancy === 0 ? "text-success" : "text-destructive"}`}>
                          {formatTZS(reconResult.discrepancy)}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 italic text-muted-foreground">{reconResult.message}</p>
                    </CardContent>
                  </Card>
                )}

                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={() => setReconOpen(false)}>
                    Close
                  </Button>
                  <Button type="submit" disabled={isReconSubmitting || !reconBankId || !reconPortalBalance}>
                    {isReconSubmitting ? "Calculating..." : "Check Discrepancy"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 shadow-sm">
                <Plus className="size-4" />
                <span>Top up Float</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Top up Bank Float</DialogTitle>
                <DialogDescription>
                  Add electronic float to a bank partner account.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTopupSubmit} className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topup-bank">Select Bank</Label>
                  <Select value={topupBankId} onValueChange={setTopupBankId}>
                    <SelectTrigger id="topup-bank">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({formatTZS(b.floatBalance, { compact: true })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topup-amt">Amount (TZS)</Label>
                  <Input
                    id="topup-amt"
                    type="number"
                    placeholder="Enter top-up amount"
                    required
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topup-src">Top up Source</Label>
                  <Select value={topupSource} onValueChange={setTopupSource}>
                    <SelectTrigger id="topup-src">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer (Wakala Agent App)</SelectItem>
                      <SelectItem value="cash">Cash Payment</SelectItem>
                      <SelectItem value="hq">Headquarters (HQ Allocation)</SelectItem>
                      <SelectItem value="other">Other / Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 border rounded-md p-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <input
                    id="topup-cash"
                    type="checkbox"
                    checked={topupFromCash}
                    onChange={(e) => setTopupFromCash(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="topup-cash"
                      className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Deduct from Cash Drawer
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Enable if physical cash was taken from the drawer to top up this float.
                    </p>
                  </div>
                </div>

                {cashWarning && (
                  <div className="flex gap-2 rounded-md bg-warning/15 p-2.5 text-[11px] font-medium leading-relaxed text-warning-foreground border border-warning/20">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>{cashWarning}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topup-note">Reference / Note</Label>
                  <Input
                    id="topup-note"
                    placeholder="e.g. Deposit slip ref or notes"
                    value={topupNote}
                    onChange={(e) => setTopupNote(e.target.value)}
                  />
                </div>

                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={() => setTopupOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isTopupSubmitting || !topupBankId || !topupAmount}>
                    {isTopupSubmitting ? "Saving..." : "Confirm Top-up"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wallet className="size-3.5 text-primary" />
              Total Bank Float
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{formatTZS(totalBankFloat)}</p>
            <p className="text-xs text-muted-foreground mt-1">Available float across all partners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Coins className="size-3.5 text-success" />
              Cash Drawer Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatTZS(cashBalance)}</p>
            <p className="text-xs text-muted-foreground mt-1">Liquid cash in drawer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-warning-foreground" />
              Low Float Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {banks.filter((b) => b.floatBalance < b.threshold).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Bank accounts below threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Float Positions List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Bank Float Positions</CardTitle>
            <CardDescription>Available balances and thresholds</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {banks.map((b) => {
              const low = b.floatBalance < b.threshold
              return (
                <div key={b.id} className="border-b pb-3 last:border-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{b.name}</span>
                    <Badge variant={low ? "destructive" : "secondary"}>
                      {low ? "Low Float" : "Good"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-baseline text-xs font-mono">
                    <span className="text-muted-foreground">Balance:</span>
                    <span className={low ? "text-destructive font-semibold" : "text-foreground"}>
                      {formatTZS(b.floatBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-[11px] font-mono text-muted-foreground">
                    <span>Min Alert:</span>
                    <span>{formatTZS(b.threshold)}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Top-up History Ledger */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Float Topup Ledger</CardTitle>
            <CardDescription>History of all float additions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Filters Row */}
            <div className="flex items-center gap-3 p-4 border-b">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search topups (source, note)..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterBank} onValueChange={setFilterBank}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bank / Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTopups.length > 0 ? (
                    filteredTopups.map((topup) => {
                      const bank = banks.find((b) => b.id === topup.bankId)
                      const agent = agents.find((a) => a.id === topup.agentId)
                      
                      return (
                        <TableRow key={topup.id}>
                          <TableCell>
                            <p className="font-semibold text-sm">{bank?.name || "Bank"}</p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {formatDateTime(topup.createdAt)}
                            </p>
                          </TableCell>
                          <TableCell className="capitalize text-xs font-medium">
                            {topup.source.replace("_", " ")}
                          </TableCell>
                          <TableCell className="text-right font-bold font-mono text-sm">
                            {formatTZS(topup.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                            {topup.note || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {agent?.name || "Agent"}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No float top-ups recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
