"use client"

import { useMemo, useState } from "react"
import {
  ArrowLeftRight,
  Plus,
  Search,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  CheckCircle,
  HelpCircle,
  UserCheck,
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
import { Card, CardContent } from "@/components/ui/card"

export default function TransfersPage() {
  const {
    transfers,
    banks,
    networks,
    agents,
    role,
    cashBalance,
    addTransfer,
  } = useData()

  // Modal open state
  const [open, setOpen] = useState(false)

  // Form states
  const [sourceType, setSourceType] = useState<"cash" | "network_float" | "bank_float">("cash")
  const [sourceId, setSourceId] = useState("")
  const [destType, setDestType] = useState<"cash" | "network_float" | "bank_float">("network_float")
  const [destId, setDestId] = useState("")
  const [amount, setAmount] = useState("")
  const [charges, setCharges] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters state
  const [search, setSearch] = useState("")
  const [filterSourceType, setFilterSourceType] = useState("all")
  const [filterDestType, setFilterDestType] = useState("all")

  // Source Available Balance calculation
  const sourceBalance = useMemo(() => {
    if (sourceType === "cash") {
      return cashBalance
    } else if (sourceType === "network_float") {
      const net = networks.find((n) => n.id === sourceId)
      return net ? net.floatBalance : 0
    } else if (sourceType === "bank_float") {
      const bank = banks.find((b) => b.id === sourceId)
      return bank ? bank.floatBalance : 0
    }
    return 0
  }, [sourceType, sourceId, cashBalance, networks, banks])

  // Destination Name (for display helper)
  const getDestBalance = (type: string, id: string) => {
    if (type === "cash") return cashBalance
    if (type === "network_float") {
      const net = networks.find((n) => n.id === id)
      return net ? net.floatBalance : 0
    }
    if (type === "bank_float") {
      const bank = banks.find((b) => b.id === id)
      return bank ? bank.floatBalance : 0
    }
    return 0
  }

  // Same Source & Destination Validation
  const isSameSourceDest = useMemo(() => {
    if (sourceType === destType) {
      if (sourceType === "cash") return true
      if (sourceId && destId && sourceId === destId) return true
    }
    return false
  }, [sourceType, sourceId, destType, destId])

  // Insufficient Balance Validation
  const validationError = useMemo(() => {
    if (isSameSourceDest) {
      return "Validation Error: Source and destination wallets cannot be the same."
    }
    const amtVal = Number(amount)
    if (isNaN(amtVal) || amtVal <= 0) return null

    const chgVal = charges ? Number(charges) : 0
    const totalDeduction = amtVal + chgVal

    if (totalDeduction > sourceBalance) {
      return `Validation Error: Insufficient funds in source wallet. Available: ${formatTZS(sourceBalance)}. Required: ${formatTZS(totalDeduction)} (Amount + Charges).`
    }
    return null
  }, [sourceType, sourceBalance, amount, charges, isSameSourceDest])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validationError) return

    const amtVal = Number(amount)
    if (isNaN(amtVal) || amtVal <= 0) return
    const chgVal = charges ? Number(charges) : 0

    try {
      setIsSubmitting(true)
      await addTransfer({
        sourceType,
        sourceId: sourceType === "cash" ? null : sourceId,
        destType,
        destId: destType === "cash" ? null : destId,
        amount: amtVal,
        charges: chgVal,
      })

      // Reset Form
      setSourceType("cash")
      setSourceId("")
      setDestType("network_float")
      setDestId("")
      setAmount("")
      setCharges("")
      setOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered transfers list
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const sourceName =
        t.sourceType === "cash"
          ? "Cash Drawer"
          : t.sourceType === "network_float"
          ? networks.find((n) => n.id === t.sourceId)?.name || ""
          : banks.find((b) => b.id === t.sourceId)?.name || ""

      const destName =
        t.destType === "cash"
          ? "Cash Drawer"
          : t.destType === "network_float"
          ? networks.find((n) => n.id === t.destId)?.name || ""
          : banks.find((b) => b.id === t.destId)?.name || ""

      const searchStr = search.toLowerCase()
      const matchSearch =
        sourceName.toLowerCase().includes(searchStr) ||
        destName.toLowerCase().includes(searchStr) ||
        t.sourceType.toLowerCase().includes(searchStr) ||
        t.destType.toLowerCase().includes(searchStr)

      const matchSource = filterSourceType === "all" || t.sourceType === filterSourceType
      const matchDest = filterDestType === "all" || t.destType === filterDestType

      return matchSearch && matchSource && matchDest
    })
  }, [transfers, networks, banks, search, filterSourceType, filterDestType])

  // Helper to render wallet names
  const renderWalletName = (type: string, id: string | null) => {
    if (type === "cash") return "Cash Drawer"
    if (type === "network_float") {
      const net = networks.find((n) => n.id === id)
      return `${net?.name || "Mobile Money"} Float`
    }
    if (type === "bank_float") {
      const bank = banks.find((b) => b.id === id)
      return `${bank?.name || "Bank"} Float`
    }
    return type
  }

  const walletBadgeStyle: Record<string, string> = {
    cash: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    network_float: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    bank_float: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  }

  const walletLabelNames: Record<string, string> = {
    cash: "Cash Drawer",
    network_float: "Mobile Float",
    bank_float: "Bank Float",
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Treasury Transfers</h2>
          <p className="text-sm text-muted-foreground">
            Move capital internally between the physical Cash Drawer, Mobile Money Float accounts, and Bank Float accounts.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 shadow-sm">
              <Plus className="size-4" />
              <span>New Internal Transfer</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Internal Fund Transfer</DialogTitle>
              <DialogDescription>
                Transfer funds between internal capital accounts. Deducts principal + charges from the source.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
              
              {/* SOURCE SELECT */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Source Account</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="src-wallet-type">Wallet Type</Label>
                    <Select
                      value={sourceType}
                      onValueChange={(val: any) => {
                        setSourceType(val)
                        setSourceId("") // reset ID
                      }}
                    >
                      <SelectTrigger id="src-wallet-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Drawer</SelectItem>
                        <SelectItem value="network_float">Mobile Money Float</SelectItem>
                        <SelectItem value="bank_float">Bank Float</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {sourceType !== "cash" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="src-wallet-id">Select Provider</Label>
                      <Select value={sourceId} onValueChange={setSourceId}>
                        <SelectTrigger id="src-wallet-id">
                          <SelectValue placeholder="Select one" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceType === "network_float"
                            ? networks.filter((n) => n.active).map((n) => (
                                <SelectItem key={n.id} value={n.id}>
                                  {n.name}
                                </SelectItem>
                              ))
                            : banks.filter((b) => b.active).map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Available Balance:</span>
                  <span className="font-semibold text-foreground">{formatTZS(sourceBalance)}</span>
                </div>
              </div>

              {/* ARROW DECORATION */}
              <div className="flex justify-center -my-2">
                <div className="rounded-full bg-primary/10 p-1.5 text-primary border border-primary/20">
                  <ArrowRight className="size-4 rotate-90" />
                </div>
              </div>

              {/* DESTINATION SELECT */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Destination Account</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="dest-wallet-type">Wallet Type</Label>
                    <Select
                      value={destType}
                      onValueChange={(val: any) => {
                        setDestType(val)
                        setDestId("")
                      }}
                    >
                      <SelectTrigger id="dest-wallet-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Drawer</SelectItem>
                        <SelectItem value="network_float">Mobile Money Float</SelectItem>
                        <SelectItem value="bank_float">Bank Float</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {destType !== "cash" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="dest-wallet-id">Select Provider</Label>
                      <Select value={destId} onValueChange={setDestId}>
                        <SelectTrigger id="dest-wallet-id">
                          <SelectValue placeholder="Select one" />
                        </SelectTrigger>
                        <SelectContent>
                          {destType === "network_float"
                            ? networks.filter((n) => n.active).map((n) => (
                                <SelectItem key={n.id} value={n.id}>
                                  {n.name}
                                </SelectItem>
                              ))
                            : banks.filter((b) => b.active).map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Current Balance:</span>
                  <span className="font-semibold text-foreground">
                    {formatTZS(getDestBalance(destType, destId))}
                  </span>
                </div>
              </div>

              {/* TRANSFER AMOUNT & CHARGES */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="transfer-amt">Transfer Amount (TZS)</Label>
                  <Input
                    id="transfer-amt"
                    type="number"
                    placeholder="Enter amount"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="transfer-charges">Transfer Fee / Charges (Optional)</Label>
                  <Input
                    id="transfer-charges"
                    type="number"
                    placeholder="e.g. 1,000"
                    value={charges}
                    onChange={(e) => setCharges(e.target.value)}
                  />
                </div>
              </div>

              {/* Error messages block */}
              {validationError && (
                <div className="flex gap-2 rounded-md bg-destructive/15 p-3 text-xs font-semibold leading-relaxed text-destructive border border-destructive/20">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !!validationError || !amount || (sourceType !== "cash" && !sourceId) || (destType !== "cash" && !destId)}
                >
                  {isSubmitting ? "Executing..." : "Execute Transfer"}
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
              placeholder="Search source or destination..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <Select value={filterSourceType} onValueChange={setFilterSourceType}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Source Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="cash">Cash Drawer</SelectItem>
                <SelectItem value="network_float">Mobile Float</SelectItem>
                <SelectItem value="bank_float">Bank Float</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDestType} onValueChange={setFilterDestType}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Destination Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Destinations</SelectItem>
                <SelectItem value="cash">Cash Drawer</SelectItem>
                <SelectItem value="network_float">Mobile Float</SelectItem>
                <SelectItem value="bank_float">Bank Float</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Ledger Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date / Time</TableHead>
                  <TableHead>Source Account</TableHead>
                  <TableHead className="w-[40px] text-center"></TableHead>
                  <TableHead>Destination Account</TableHead>
                  <TableHead className="text-right">Transfer Amount</TableHead>
                  <TableHead className="text-right">Charges / Fees</TableHead>
                  <TableHead>Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.length > 0 ? (
                  filteredTransfers.map((transfer) => {
                    const agent = agents.find((a) => a.id === transfer.agentId)
                    return (
                      <TableRow key={transfer.id}>
                        <TableCell className="align-middle font-mono text-xs text-muted-foreground">
                          {formatDateTime(transfer.createdAt)}
                        </TableCell>
                        <TableCell className="align-middle">
                          <p className="font-semibold text-sm">
                            {renderWalletName(transfer.sourceType, transfer.sourceId)}
                          </p>
                          <Badge variant="outline" className={`mt-0.5 font-normal text-[10px] ${walletBadgeStyle[transfer.sourceType]}`}>
                            {walletLabelNames[transfer.sourceType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle text-center">
                          <ArrowRight className="size-4 text-muted-foreground mx-auto" />
                        </TableCell>
                        <TableCell className="align-middle">
                          <p className="font-semibold text-sm">
                            {renderWalletName(transfer.destType, transfer.destId)}
                          </p>
                          <Badge variant="outline" className={`mt-0.5 font-normal text-[10px] ${walletBadgeStyle[transfer.destType]}`}>
                            {walletLabelNames[transfer.destType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle text-right font-bold font-mono text-sm text-primary">
                          {formatTZS(transfer.amount)}
                        </TableCell>
                        <TableCell className="align-middle text-right font-mono text-xs text-muted-foreground">
                          {transfer.charges > 0 ? formatTZS(transfer.charges) : "—"}
                        </TableCell>
                        <TableCell className="align-middle text-xs font-medium">
                          {agent?.name || "Agent"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No internal transfers logged.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
