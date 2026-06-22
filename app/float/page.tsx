"use client"

import { useMemo, useState } from "react"
import { AlertCircle, AlertTriangle, ArrowRightLeft, Landmark, Layers, Plus, Wallet } from "lucide-react"
import { useData } from "@/lib/store"
import { formatDateTime, formatTZS } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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

export default function FloatPage() {
  const {
    networks,
    floatTopups,
    addFloatTopup,
    networkById,
    agentById,
  } = useData()

  // Modal open states
  const [topupOpen, setTopupOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  // Topup form states
  const [topupNetId, setTopupNetId] = useState("")
  const [topupAmount, setTopupAmount] = useState("")
  const [topupSource, setTopupSource] = useState("Bank Transfer")
  const [topupNote, setTopupNote] = useState("")
  const [fromCash, setFromCash] = useState(false)
  const [isTopupSubmitting, setIsTopupSubmitting] = useState(false)

  // Transfer form states
  const [fromNetId, setFromNetId] = useState("")
  const [toNetId, setToNetId] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferNote, setTransferNote] = useState("")
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false)

  // Calculations
  const lowFloatNets = useMemo(() => {
    return networks.filter((n) => n.floatBalance < n.threshold)
  }, [networks])

  const totalFloatBalance = useMemo(() => {
    return networks.reduce((s, n) => s + n.floatBalance, 0)
  }, [networks])

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topupNetId || !topupAmount || isNaN(Number(topupAmount)) || Number(topupAmount) <= 0) return

    try {
      setIsTopupSubmitting(true)
      await addFloatTopup({
        networkId: topupNetId,
        amount: Number(topupAmount),
        source: topupSource,
        note: topupNote,
        fromCash,
      })
      // Clear form
      setTopupNetId("")
      setTopupAmount("")
      setTopupSource("Bank Transfer")
      setTopupNote("")
      setFromCash(false)
      setTopupOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsTopupSubmitting(false)
    }
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromNetId || !toNetId || !transferAmount || isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) return

    try {
      setIsTransferSubmitting(true)
      
      // Perform transfer (subtract from source, add to destination)
      // We can reuse addFloatTopup:
      // 1. Subtract from source
      await addFloatTopup({
        networkId: fromNetId,
        amount: -Number(transferAmount),
        source: "Float Transfer",
        note: `Transferred to ${networkById(toNetId)?.name}. ${transferNote}`,
        fromCash: false,
      })
      
      // 2. Add to destination
      await addFloatTopup({
        networkId: toNetId,
        amount: Number(transferAmount),
        source: "Float Transfer",
        note: `Transferred from ${networkById(fromNetId)?.name}. ${transferNote}`,
        fromCash: false,
      })

      setFromNetId("")
      setToNetId("")
      setTransferAmount("")
      setTransferNote("")
      setTransferOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsTransferSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Float Management</h2>
          <p className="text-sm text-muted-foreground">
            Monitor and restock digital money float accounts across all providers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Transfer Dialog */}
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1.5 h-8">
                <ArrowRightLeft className="size-3.5" />
                <span className="text-xs">Float Transfer</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Float Transfer</DialogTitle>
                <DialogDescription>
                  Move electronic float between two providers (e.g. Bank Float to M-Pesa).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tf-from">From Account</Label>
                  <Select value={fromNetId} onValueChange={setFromNetId}>
                    <SelectTrigger id="tf-from">
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name} ({formatTZS(n.floatBalance, { compact: true })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tf-to">To Account</Label>
                  <Select value={toNetId} onValueChange={setToNetId}>
                    <SelectTrigger id="tf-to">
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks
                        .filter((n) => n.id !== fromNetId)
                        .map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tf-amount">Transfer Amount (TZS)</Label>
                  <Input
                    id="tf-amount"
                    type="number"
                    placeholder="Enter transfer amount"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tf-note">Description Note</Label>
                  <Input
                    id="tf-note"
                    placeholder="Internal transfer"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                  />
                </div>

                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isTransferSubmitting || !fromNetId || !toNetId || !transferAmount}>
                    {isTransferSubmitting ? "Processing..." : "Transfer Float"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Top-up Dialog */}
          <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 h-8">
                <Plus className="size-3.5" />
                <span className="text-xs">Top-up Float</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Top-up Float</DialogTitle>
                <DialogDescription>
                  Refill electronic float balance for a network provider.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTopupSubmit} className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tu-network">Select Network</Label>
                  <Select value={topupNetId} onValueChange={setTopupNetId}>
                    <SelectTrigger id="tu-network">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tu-amount">Top-up Amount (TZS)</Label>
                  <Input
                    id="tu-amount"
                    type="number"
                    placeholder="Enter refill amount"
                    required
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tu-source">Funding Source</Label>
                  <Select value={topupSource} onValueChange={setTopupSource}>
                    <SelectTrigger id="tu-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer (Direct)</SelectItem>
                      <SelectItem value="Cash Deposit">Cash Deposit (At Branch)</SelectItem>
                      <SelectItem value="Headquarters (HQ)">Headquarters (HQ Credit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Deduct from cash toggle */}
                <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/20">
                  <input
                    type="checkbox"
                    id="tu-deduct"
                    className="size-4 rounded accent-primary"
                    checked={fromCash}
                    onChange={(e) => setFromCash(e.target.checked)}
                  />
                  <div className="grid gap-0.5">
                    <Label htmlFor="tu-deduct" className="text-xs font-semibold cursor-pointer">
                      Deduct from Physical Cash
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      This will automatically subtract the amount from Cash on Hand.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tu-note">Notes (Optional)</Label>
                  <textarea
                    id="tu-note"
                    placeholder="Restock before weekend rush"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 h-16 resize-none"
                    value={topupNote}
                    onChange={(e) => setTopupNote(e.target.value)}
                  />
                </div>

                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={() => setTopupOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isTopupSubmitting || !topupNetId || !topupAmount}>
                    {isTopupSubmitting ? "Saving..." : "Record Top-up"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Card / Alert Banner */}
      {lowFloatNets.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="size-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">
                Critical Low Float Balance Alert
              </p>
              <p className="text-xs text-destructive/90 mt-0.5">
                {lowFloatNets.map((n) => n.name).join(", ")} {lowFloatNets.length > 1 ? "are" : "is"} below their configured alert thresholds. Customers deposits on these providers may fail!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Float Balance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {networks.map((net) => {
          const isLow = net.floatBalance < net.threshold
          // Scale progress bar. We assume threshold * 2 represents a healthy target balance
          const percentage = Math.min(100, Math.round((net.floatBalance / (net.threshold * 2)) * 100))
          
          return (
            <Card key={net.id} className={isLow ? "border-destructive/30" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">{net.name}</CardTitle>
                <Badge variant={isLow ? "destructive" : "secondary"}>
                  {isLow ? "Low Float" : "Healthy"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold tracking-tight">{formatTZS(net.floatBalance)}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Threshold: {formatTZS(net.threshold, { compact: true })}</span>
                      <span>Target: {formatTZS(net.threshold * 2, { compact: true })}</span>
                    </div>
                    <Progress
                      value={percentage}
                      className={isLow ? "[&>div]:bg-destructive" : "[&>div]:bg-success"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Float Ledger History */}
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-sm font-semibold">Float Transaction Ledger</CardTitle>
          <CardDescription>Chronological list of float top-ups, transfers, and corrections.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Account/Network</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Funding Source</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {floatTopups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No float history logs found.
                  </TableCell>
                </TableRow>
              ) : (
                floatTopups.map((log) => {
                  const net = networkById(log.networkId)
                  const isNegative = log.amount < 0
                  const agent = agentById(log.agentId)

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">
                        {net?.name || log.networkId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            isNegative
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-success/10 text-success border-success/20"
                          }
                        >
                          {isNegative ? "Transfer Out" : log.source === "Float Transfer" ? "Transfer In" : "Top-up"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`font-mono text-xs font-semibold text-right tabular-nums pr-6 ${isNegative ? "text-destructive" : "text-success"}`}>
                        {isNegative ? "" : "+"}{formatTZS(log.amount)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{log.source}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.note || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {agent?.name || "System"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
