"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  CheckCircle,
  FileText,
  User,
  CreditCard,
  Phone,
  AlertTriangle,
  Pencil,
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
import type { BankTxType } from "@/lib/types"

export default function BankTransactionsPage() {
  const {
    bankTransactions,
    banks,
    agents,
    role,
    currentAgent,
    addBankTransaction,
    updateBankTransaction,
    previewBankCommission,
  } = useData()

  // Modal open state
  const [open, setOpen] = useState(false)

  // Transaction form states
  const [type, setType] = useState<BankTxType>("deposit")
  const [bankId, setBankId] = useState("")
  const [amount, setAmount] = useState("")
  const [fee, setFee] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [tellerNumber, setTellerNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [notes, setNotes] = useState("")
  // Reset form
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<any>(null)
  const [editType, setEditType] = useState<BankTxType>("deposit")
  const [editBankId, setEditBankId] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editFee, setEditFee] = useState("")
  const [editAccountNumber, setEditAccountNumber] = useState("")
  const [editAccountName, setEditAccountName] = useState("")
  const [editTellerNumber, setEditTellerNumber] = useState("")
  const [editCustomerName, setEditCustomerName] = useState("")
  const [editCustomerPhone, setEditCustomerPhone] = useState("")
  const [editReferenceNumber, setEditReferenceNumber] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false)

  const startEditTx = (tx: any) => {
    setEditingTx(tx)
    setEditType(tx.type)
    setEditBankId(tx.bankId)
    setEditAmount(tx.amount.toString())
    setEditFee(tx.fee.toString())
    setEditAccountNumber(tx.accountNumber || "")
    setEditAccountName(tx.accountName || "")
    setEditTellerNumber(tx.tellerNumber || "")
    setEditCustomerName(tx.customerName || "")
    setEditCustomerPhone(tx.customerPhone || "")
    setEditReferenceNumber(tx.referenceNumber || "")
    setEditNotes(tx.notes || "")
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTx || !editBankId) return

    const amtNum = ["deposit", "withdrawal", "cardless_withdrawal"].includes(editType) ? Number(editAmount) : 0
    if (["deposit", "withdrawal", "cardless_withdrawal"].includes(editType) && (isNaN(amtNum) || amtNum <= 0)) return

    try {
      setIsEditingSubmitting(true)
      await updateBankTransaction(editingTx.id, {
        type: editType,
        accountNumber: editAccountNumber || null,
        accountName: editAccountName || null,
        amount: amtNum,
        fee: editFee ? Number(editFee) : 0,
        tellerNumber: editTellerNumber || null,
        customerName: editCustomerName || null,
        customerPhone: editCustomerPhone || null,
        referenceNumber: editReferenceNumber || null,
        notes: editNotes || null,
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
  const [filterBank, setFilterBank] = useState("all")
  const [filterAgent, setFilterAgent] = useState("all")

  // Selected Bank Object
  const selectedBank = useMemo(() => {
    return banks.find((b) => b.id === bankId)
  }, [banks, bankId])

  // Needs Amount Input
  const showAmount = useMemo(() => {
    return ["deposit", "withdrawal", "cardless_withdrawal"].includes(type)
  }, [type])

  // Live Commission Preview
  const liveCommission = useMemo(() => {
    if (!bankId) return 0
    const amtNum = showAmount ? Number(amount) : 0
    if (showAmount && (!amtNum || isNaN(amtNum))) return 0
    return previewBankCommission(type, bankId, amtNum)
  }, [type, bankId, amount, showAmount, previewBankCommission])

  // Bank Float Validation
  const floatValidation = useMemo(() => {
    if (type !== "deposit" || !selectedBank || !amount) return { isBlocked: false, message: null }
    const amtNum = Number(amount)
    if (isNaN(amtNum) || amtNum <= 0) return { isBlocked: false, message: null }
    
    if (amtNum > selectedBank.floatBalance) {
      return {
        isBlocked: true,
        message: `Blocked: Insufficient bank float. Available float: ${formatTZS(selectedBank.floatBalance)}. Required: ${formatTZS(amtNum)}. Please top up the bank float first.`,
      }
    }
    return { isBlocked: false, message: null }
  }, [type, selectedBank, amount])

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return bankTransactions.filter((t) => {
      const bank = banks.find((b) => b.id === t.bankId)
      const agent = agents.find((a) => a.id === t.agentId)
      
      const searchStr = search.toLowerCase()
      const matchSearch =
        t.ref.toLowerCase().includes(searchStr) ||
        (t.accountNumber && t.accountNumber.includes(searchStr)) ||
        (t.accountName && t.accountName.toLowerCase().includes(searchStr)) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchStr)) ||
        (t.customerPhone && t.customerPhone.includes(searchStr)) ||
        (t.referenceNumber && t.referenceNumber.toLowerCase().includes(searchStr)) ||
        (bank && bank.name.toLowerCase().includes(searchStr))

      const matchType = filterType === "all" || t.type === filterType
      const matchBank = filterBank === "all" || t.bankId === filterBank
      const matchAgent = filterAgent === "all" || t.agentId === filterAgent

      return matchSearch && matchType && matchBank && matchAgent
    })
  }, [bankTransactions, banks, agents, search, filterType, filterBank, filterAgent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bankId) return
    if (floatValidation.isBlocked) return

    const amtNum = showAmount ? Number(amount) : 0
    if (showAmount && (isNaN(amtNum) || amtNum <= 0)) return

    const feeNum = fee ? Number(fee) : 0

    try {
      setIsSubmitting(true)
      await addBankTransaction({
        type,
        bankId,
        accountNumber: accountNumber || null,
        accountName: accountName || null,
        amount: amtNum,
        fee: feeNum,
        tellerNumber: tellerNumber || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
      })

      // Reset form
      setBankId("")
      setAmount("")
      setFee("")
      setAccountNumber("")
      setAccountName("")
      setTellerNumber("")
      setCustomerName("")
      setCustomerPhone("")
      setReferenceNumber("")
      setNotes("")
      setOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const txTypeNames: Record<string, string> = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    balance_inquiry: "Balance Inquiry",
    mini_statement: "Mini Statement",
    cardless_withdrawal: "Cardless Withdrawal",
    account_opening: "Account Opening Assist",
  }

  const typeColorMap: Record<string, string> = {
    deposit: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    withdrawal: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    balance_inquiry: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    mini_statement: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    cardless_withdrawal: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
    account_opening: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Bank Transactions</h2>
          <p className="text-sm text-muted-foreground">
            {role === "super_admin"
              ? "View and record all agency banking transactions across CRDB, NMB, NBC, TPB, Equity"
              : `Record agency banking transactions for clients (Agent: ${currentAgent?.name})`}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 shadow-sm">
              <Plus className="size-4" />
              <span>Record Transaction</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Record Bank Transaction</DialogTitle>
              <DialogDescription>
                Select the service type and partner bank to record the agency banking transaction.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="srv-type" className="text-xs font-semibold">Service Type</Label>
                  <Select
                    value={type}
                    onValueChange={(val: BankTxType) => {
                      setType(val)
                      // Reset fields that might not be needed
                      setAmount("")
                      setFee("")
                    }}
                  >
                    <SelectTrigger id="srv-type" className="h-8 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Cash Deposit</SelectItem>
                      <SelectItem value="withdrawal">Cash Withdrawal</SelectItem>
                      <SelectItem value="balance_inquiry">Balance Inquiry</SelectItem>
                      <SelectItem value="mini_statement">Mini Statement</SelectItem>
                      <SelectItem value="cardless_withdrawal">Cardless Withdrawal</SelectItem>
                      <SelectItem value="account_opening">Account Opening Assistance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="srv-bank" className="text-xs font-semibold">Bank Partner</Label>
                  <Select value={bankId} onValueChange={setBankId}>
                    <SelectTrigger id="srv-bank" className="h-8 text-xs">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks
                        .filter((b) => b.active)
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} ({formatTZS(b.floatBalance, { compact: true })})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* DYNAMIC FIELDS */}
                {/* Account Number field (Deposits, Withdrawals, Inquiries, Statements) */}
                {["deposit", "withdrawal", "balance_inquiry", "mini_statement"].includes(type) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="srv-acct" className="text-xs font-semibold">Account Number</Label>
                    <Input
                      id="srv-acct"
                      placeholder="Customer account number"
                      required
                      className="h-8 text-xs"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>
                )}

                {/* Account Name (Only Deposit) */}
                {type === "deposit" && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="srv-name" className="text-xs font-semibold">Account Holder Name</Label>
                    <Input
                      id="srv-name"
                      placeholder="Customer account name"
                      required
                      className="h-8 text-xs"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                    />
                  </div>
                )}

                {/* Customer Name (Cardless, Account Opening) */}
                {["cardless_withdrawal", "account_opening"].includes(type) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="srv-cust-name" className="text-xs font-semibold">Customer Name</Label>
                    <Input
                      id="srv-cust-name"
                      placeholder="Jane Doe"
                      required
                      className="h-8 text-xs"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                )}

                {/* Customer Phone (Cardless, Account Opening) */}
                {["cardless_withdrawal", "account_opening"].includes(type) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="srv-cust-phone" className="text-xs font-semibold">Customer Phone</Label>
                    <Input
                      id="srv-cust-phone"
                      placeholder="0765 000 000"
                      required={type === "account_opening"}
                      className="h-8 text-xs"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                )}

                {/* Amount (Deposit, Withdrawal, Cardless) */}
                {showAmount && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="srv-amt" className="text-xs font-semibold">Amount (TZS)</Label>
                    <Input
                      id="srv-amt"
                      type="number"
                      placeholder="Enter amount"
                      required
                      className="h-8 text-xs"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                )}

                {/* Fee (Withdrawal, Inquiry, Statement, Cardless) */}
                {["withdrawal", "balance_inquiry", "mini_statement", "cardless_withdrawal"].includes(type) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="srv-fee" className="text-xs font-semibold">Fee Charged</Label>
                    <Input
                      id="srv-fee"
                      type="number"
                      placeholder="e.g. 500"
                      className="h-8 text-xs"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                    />
                  </div>
                )}

                {/* Teller Number (Deposit, Withdrawal) */}
                {["deposit", "withdrawal"].includes(type) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="srv-teller" className="text-xs font-semibold">Teller / POS Number</Label>
                    <Input
                      id="srv-teller"
                      placeholder="e.g. TL-9923"
                      className="h-8 text-xs"
                      value={tellerNumber}
                      onChange={(e) => setTellerNumber(e.target.value)}
                    />
                  </div>
                )}

                {/* Reference / OTP */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="srv-ref" className="text-xs font-semibold">
                    {type === "cardless_withdrawal"
                      ? "OTP / Withdrawal Code"
                      : type === "account_opening"
                      ? "Application Ref"
                      : "Bank Reference"}
                  </Label>
                  <Input
                    id="srv-ref"
                    placeholder="e.g. REF12938472"
                    className="h-8 text-xs"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>

                {/* Notes (Full width) */}
                <div className="flex flex-col gap-1 col-span-2">
                  <Label htmlFor="srv-notes" className="text-xs font-semibold">Notes / Remarks</Label>
                  <Input
                    id="srv-notes"
                    placeholder="Additional transaction info"
                    className="h-8 text-xs"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Float Insufficient Warning Block */}
              {floatValidation.isBlocked && (
                <div className="flex gap-2 rounded-md bg-destructive/15 p-3 text-xs font-semibold leading-relaxed text-destructive border border-destructive/20">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{floatValidation.message}</span>
                </div>
              )}

              {/* Commission Preview Card */}
              {liveCommission > 0 && (
                <Card className="border-success/30 bg-success/5 shadow-none">
                  <CardContent className="flex items-center justify-between p-3 text-xs text-success font-medium">
                    <span>Expected Agent Commission:</span>
                    <span className="text-sm font-bold">{formatTZS(liveCommission)}</span>
                  </CardContent>
                </Card>
              )}

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !bankId || floatValidation.isBlocked}
                >
                  {isSubmitting ? "Processing..." : "Submit Transaction"}
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
              placeholder="Search reference, account, customer..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                <SelectItem value="balance_inquiry">Inquiry</SelectItem>
                <SelectItem value="mini_statement">Statement</SelectItem>
                <SelectItem value="cardless_withdrawal">Cardless</SelectItem>
                <SelectItem value="account_opening">Opening Assist</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBank} onValueChange={setFilterBank}>
              <SelectTrigger className="w-full sm:w-[160px]">
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

            {role === "super_admin" && (
              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Agents" />
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Ref / Date</TableHead>
                  <TableHead>Bank / Service</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount & Fee</TableHead>
                  <TableHead className="text-right text-success">Commission</TableHead>
                  {role === "super_admin" && <TableHead>Agent</TableHead>}
                  <TableHead className="w-[80px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTxs.length > 0 ? (
                  filteredTxs.map((tx) => {
                    const bank = banks.find((b) => b.id === tx.bankId)
                    const agent = agents.find((a) => a.id === tx.agentId)
                    
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="align-top">
                          <p className="font-semibold text-xs font-mono">{tx.ref}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                            {formatDateTime(tx.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell className="align-top">
                          <p className="font-medium text-sm">{bank?.name || "Unknown Bank"}</p>
                          <Badge variant="outline" className={`mt-1 font-normal text-[11px] ${typeColorMap[tx.type] || ""}`}>
                            {txTypeNames[tx.type] || tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top text-xs max-w-[200px]">
                          {tx.accountNumber && (
                            <p className="flex items-center gap-1">
                              <CreditCard className="size-3 text-muted-foreground shrink-0" />
                              <span>A/C: <span className="font-mono">{tx.accountNumber}</span></span>
                            </p>
                          )}
                          {tx.accountName && (
                            <p className="text-muted-foreground mt-0.5 truncate">Name: {tx.accountName}</p>
                          )}
                          {(tx.customerName || tx.customerPhone) && (
                            <div className="mt-1 space-y-0.5 border-t border-slate-100 pt-1 dark:border-slate-800">
                              {tx.customerName && (
                                <p className="flex items-center gap-1 text-[11px]">
                                  <User className="size-3 text-muted-foreground shrink-0" />
                                  <span>{tx.customerName}</span>
                                </p>
                              )}
                              {tx.customerPhone && (
                                <p className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                                  <Phone className="size-3 text-muted-foreground shrink-0" />
                                  <span>{tx.customerPhone}</span>
                                </p>
                              )}
                            </div>
                          )}
                          {tx.tellerNumber && (
                            <p className="text-[10px] text-muted-foreground mt-1 bg-slate-50 dark:bg-slate-900 px-1 py-0.5 rounded inline-block font-mono">
                              Teller: {tx.tellerNumber}
                            </p>
                          )}
                          {tx.referenceNumber && (
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">
                              Ref No: <span className="font-mono">{tx.referenceNumber}</span>
                            </p>
                          )}
                          {tx.notes && (
                            <p className="text-[10px] text-slate-400 mt-0.5 italic">
                              "{tx.notes}"
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <p className="font-semibold font-mono text-sm">
                            {formatTZS(tx.amount)}
                          </p>
                          {tx.fee > 0 && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              Fee: {formatTZS(tx.fee)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-right font-semibold font-mono text-sm text-success">
                          {formatTZS(tx.commission)}
                        </TableCell>
                        {role === "super_admin" && (
                          <TableCell className="align-top text-xs font-medium">
                            {agent?.name || "Unknown Agent"}
                          </TableCell>
                        )}
                        <TableCell className="align-top text-center">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => startEditTx(tx)}
                            className="h-8 w-8 p-0 hover:bg-slate-100"
                            disabled={role !== "super_admin" && tx.agentId !== currentAgent?.id}
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={role === "super_admin" ? 7 : 6} className="h-24 text-center text-muted-foreground">
                      No bank transactions matching filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Bank Transaction Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Bank Transaction</DialogTitle>
            <DialogDescription>
              Modify bank transaction fields or correct values if mistakes were made.
            </DialogDescription>
          </DialogHeader>
          {editingTx && (
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="edit-srv-type" className="text-xs font-semibold">Service Type</Label>
                  <Select
                    value={editType}
                    onValueChange={(val: BankTxType) => setEditType(val)}
                  >
                    <SelectTrigger id="edit-srv-type" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Cash Deposit</SelectItem>
                      <SelectItem value="withdrawal">Cash Withdrawal</SelectItem>
                      <SelectItem value="balance_inquiry">Balance Inquiry</SelectItem>
                      <SelectItem value="mini_statement">Mini Statement</SelectItem>
                      <SelectItem value="cardless_withdrawal">Cardless Withdrawal</SelectItem>
                      <SelectItem value="account_opening">Account Opening Assistance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-semibold">Bank Partner</Label>
                  <Input value={banks.find((b) => b.id === editingTx.bankId)?.name || editingTx.bankId} disabled className="h-8 text-xs bg-slate-50" />
                </div>

                {/* Account Number field (Deposits, Withdrawals, Inquiries, Statements) */}
                {["deposit", "withdrawal", "balance_inquiry", "mini_statement"].includes(editType) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-srv-acct" className="text-xs font-semibold">Account Number</Label>
                    <Input
                      id="edit-srv-acct"
                      placeholder="Customer account number"
                      required
                      className="h-8 text-xs"
                      value={editAccountNumber}
                      onChange={(e) => setEditAccountNumber(e.target.value)}
                    />
                  </div>
                )}

                {/* Account Name (Only Deposit) */}
                {editType === "deposit" && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-srv-name" className="text-xs font-semibold">Account Holder Name</Label>
                    <Input
                      id="edit-srv-name"
                      placeholder="Customer account name"
                      required
                      className="h-8 text-xs"
                      value={editAccountName}
                      onChange={(e) => setEditAccountName(e.target.value)}
                    />
                  </div>
                )}

                {/* Customer Name (Cardless, Account Opening) */}
                {["cardless_withdrawal", "account_opening"].includes(editType) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-srv-cust-name" className="text-xs font-semibold">Customer Name</Label>
                    <Input
                      id="edit-srv-cust-name"
                      placeholder="Jane Doe"
                      required
                      className="h-8 text-xs"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                    />
                  </div>
                )}

                {/* Customer Phone (Cardless, Account Opening) */}
                {["cardless_withdrawal", "account_opening"].includes(editType) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-srv-cust-phone" className="text-xs font-semibold">Customer Phone</Label>
                    <Input
                      id="edit-srv-cust-phone"
                      placeholder="0765 000 000"
                      required={editType === "account_opening"}
                      className="h-8 text-xs"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                    />
                  </div>
                )}

                {/* Amount (Deposit, Withdrawal, Cardless) */}
                {["deposit", "withdrawal", "cardless_withdrawal"].includes(editType) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-srv-amt" className="text-xs font-semibold">Amount (TZS)</Label>
                    <Input
                      id="edit-srv-amt"
                      type="number"
                      placeholder="Enter amount"
                      required
                      className="h-8 text-xs"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                  </div>
                )}

                {/* Fee (Withdrawal, Inquiry, Statement, Cardless) */}
                {["withdrawal", "balance_inquiry", "mini_statement", "cardless_withdrawal"].includes(editType) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-srv-fee" className="text-xs font-semibold">Fee Charged</Label>
                    <Input
                      id="edit-srv-fee"
                      type="number"
                      placeholder="e.g. 500"
                      className="h-8 text-xs"
                      value={editFee}
                      onChange={(e) => setEditFee(e.target.value)}
                    />
                  </div>
                )}

                {/* Teller Number (Deposit, Withdrawal) */}
                {["deposit", "withdrawal"].includes(editType) && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-srv-teller" className="text-xs font-semibold">Teller / POS Number</Label>
                    <Input
                      id="edit-srv-teller"
                      placeholder="e.g. TL-9923"
                      className="h-8 text-xs"
                      value={editTellerNumber}
                      onChange={(e) => setEditTellerNumber(e.target.value)}
                    />
                  </div>
                )}

                {/* Reference / OTP */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="edit-srv-ref" className="text-xs font-semibold">
                    {editType === "cardless_withdrawal"
                      ? "OTP / Withdrawal Code"
                      : editType === "account_opening"
                      ? "Application Ref"
                      : "Bank Reference"}
                  </Label>
                  <Input
                    id="edit-srv-ref"
                    placeholder="e.g. REF12938472"
                    className="h-8 text-xs"
                    value={editReferenceNumber}
                    onChange={(e) => setEditReferenceNumber(e.target.value)}
                  />
                </div>

                {/* Notes (Full width) */}
                <div className="flex flex-col gap-1 col-span-2">
                  <Label htmlFor="edit-srv-notes" className="text-xs font-semibold">Notes / Remarks</Label>
                  <Input
                    id="edit-srv-notes"
                    placeholder="Additional transaction info"
                    className="h-8 text-xs"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditingSubmitting}>
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
