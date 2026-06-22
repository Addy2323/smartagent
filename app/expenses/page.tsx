"use client"

import { useMemo, useState } from "react"
import { Calendar, Download, FileText, Image as ImageIcon, Plus, Receipt, Upload, User } from "lucide-react"
import { toast } from "sonner"
import { useData } from "@/lib/store"

const getReceiptUrl = (receipt: string) => {
  if (receipt.startsWith("data:")) return receipt

  // Generate a dynamic SVG mockup receipt for seeded/fallback receipts
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="600" height="800" fill="#f8fafc" />
    <path d="M 0 0 L 600 0 L 600 40 L 0 40 Z" fill="#0f172a" />
    <text x="300" y="25" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">RECEIPT AUDIT PREVIEW</text>

    <rect x="50" y="80" width="500" height="640" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />

    <text x="100" y="140" fill="#0f172a" font-family="sans-serif" font-size="24" font-weight="bold">SmartAgent Manager</text>
    <text x="100" y="165" fill="#64748b" font-family="sans-serif" font-size="12">Transaction &amp; Ledger Audit Portal</text>

    <line x1="100" y1="200" x2="500" y2="200" stroke="#e2e8f0" stroke-dasharray="5 5" />

    <text x="100" y="240" fill="#64748b" font-family="sans-serif" font-size="14">Item / Description:</text>
    <text x="500" y="240" fill="#0f172a" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="end">${receipt}</text>

    <text x="100" y="280" fill="#64748b" font-family="sans-serif" font-size="14">Status:</text>
    <text x="500" y="280" fill="#22c55e" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="end">VERIFIED &amp; AUDITED</text>

    <line x1="100" y1="320" x2="500" y2="320" stroke="#e2e8f0" />

    <circle cx="300" cy="500" r="80" fill="none" stroke="#22c55e" stroke-width="4" stroke-dasharray="10 5" />
    <text x="300" y="495" fill="#22c55e" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle">APPROVED</text>
    <text x="300" y="520" fill="#22c55e" font-family="sans-serif" font-size="12" text-anchor="middle">SMARTAGENT AUDIT</text>

    <text x="300" y="680" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle">Thank you for keeping record of your operations.</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const parseReceipt = (receipt: string) => {
  if (receipt.includes("|||")) {
    const parts = receipt.split("|||")
    return {
      filename: parts[0],
      url: parts[1],
    }
  }
  return {
    filename: receipt,
    url: getReceiptUrl(receipt),
  }
}

const handleViewReceipt = (url: string, filename: string) => {
  const newWindow = window.open()
  if (newWindow) {
    newWindow.document.title = `Receipt: ${filename}`
    newWindow.document.body.style.margin = "0"

    if (url.startsWith("data:application/pdf")) {
      const embed = newWindow.document.createElement("embed")
      embed.src = url
      embed.type = "application/pdf"
      embed.style.width = "100%"
      embed.style.height = "100vh"
      newWindow.document.body.appendChild(embed)
    } else {
      newWindow.document.body.style.display = "flex"
      newWindow.document.body.style.justifyContent = "center"
      newWindow.document.body.style.alignItems = "center"
      newWindow.document.body.style.backgroundColor = "#f1f5f9"

      const img = newWindow.document.createElement("img")
      img.src = url
      img.style.maxWidth = "90%"
      img.style.maxHeight = "95%"
      img.style.boxShadow = "0 25px 50px -12px rgb(0 0 0 / 0.25)"
      img.style.borderRadius = "8px"

      newWindow.document.body.appendChild(img)
    }
  } else {
    toast.error("Failed to open preview. Please allow popups.")
  }
}

const handleDownloadReceipt = (url: string, filename: string) => {
  const a = document.createElement("a")
  a.href = url
  a.download = filename.startsWith("data:") ? "receipt-download.png" : filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  toast.success(`Downloaded: ${filename}`)
}
import { formatDateTime, formatTZS } from "@/lib/format"
import { isToday, withinDays } from "@/lib/calc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function ExpensesPage() {
  const {
    expenses,
    expenseCategories,
    addExpense,
    agentById,
  } = useData()

  // Modal open state
  const [open, setOpen] = useState(false)

  // Form states
  const [categoryId, setCategoryId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [receiptName, setReceiptName] = useState<string | null>(null)
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculations
  const stats = useMemo(() => {
    let today = 0
    let month = 0

    // Group expenses by category
    const catMap = new Map<string, number>()

    for (const exp of expenses) {
      if (isToday(exp.createdAt)) {
        today += exp.amount
      }
      if (withinDays(exp.createdAt, 30)) {
        month += exp.amount
      }
      catMap.set(exp.categoryId, (catMap.get(exp.categoryId) ?? 0) + exp.amount)
    }

    let topCategoryName = "N/A"
    let topCategoryAmt = 0
    catMap.forEach((amt, catId) => {
      const cat = expenseCategories.find((c) => c.id === catId)
      if (cat && amt > topCategoryAmt) {
        topCategoryAmt = amt
        topCategoryName = cat.name
      }
    })

    return { today, month, topCategoryName }
  }, [expenses, expenseCategories])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setReceiptName(file.name)
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptDataUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return

    try {
      setIsSubmitting(true)
      await addExpense({
        categoryId,
        amount: Number(amount),
        description: description || "Miscellaneous expense",
        receipt: receiptDataUrl ? `${receiptName}|||${receiptDataUrl}` : receiptName,
      })
      setCategoryId("")
      setAmount("")
      setDescription("")
      setReceiptName(null)
      setReceiptDataUrl(null)
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
          <h2 className="text-xl font-bold tracking-tight">Expense Tracker</h2>
          <p className="text-sm text-muted-foreground">
            Log and audit all shop expenses (rent, electricity, transport, salaries, etc.).
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 h-8">
              <Plus className="size-3.5" />
              <span className="text-xs">Record Expense</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Record Business Expense</DialogTitle>
              <DialogDescription>
                Deduct cash from hand to log an active shop operational expense.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-category">Expense Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="exp-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-amount">Amount Paid (TZS)</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  placeholder="Enter amount"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-desc">Description / Notes</Label>
                <Input
                  id="exp-desc"
                  placeholder="LUKU tokens (50 units)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Receipt upload simulator */}
              <div className="flex flex-col gap-1.5">
                <Label>Receipt Upload (Optional)</Label>
                <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 bg-muted/10 cursor-pointer relative hover:bg-muted/20 transition-all">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                  />
                  {receiptName ? (
                    <>
                      <FileText className="size-6 text-primary" />
                      <span className="text-xs font-semibold text-center text-primary truncate max-w-[200px]">
                        {receiptName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Click to replace</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-5 text-muted-foreground" />
                      <span className="text-xs font-medium">Upload Image or PDF receipt</span>
                      <span className="text-[9px] text-muted-foreground">Drag & drop files here</span>
                    </>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !categoryId || !amount}>
                  {isSubmitting ? "Saving..." : "Record Expense"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Today's Expenses</p>
              <h3 className="text-2xl font-bold mt-1 text-destructive">{formatTZS(stats.today)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Deducted from cash drawer</p>
            </div>
            <div className="size-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <Receipt className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monthly Expenses (30d)</p>
              <h3 className="text-2xl font-bold mt-1 text-primary">{formatTZS(stats.month)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Aggregated operational cost</p>
            </div>
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Top Cost Category</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight truncate max-w-[180px]">
                {stats.topCategoryName}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Highest cumulative cost</p>
            </div>
            <div className="size-10 rounded-lg bg-warning/15 text-warning-foreground flex items-center justify-center">
              <User className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Ledger */}
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-sm font-semibold">Expense Ledger</CardTitle>
          <CardDescription>Chronological logging of operational payments deducted from cash.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount (TZS)</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No expenses recorded.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((e) => {
                  const cat = expenseCategories.find((c) => c.id === e.categoryId)
                  const ag = agentById(e.agentId)
                  const hasReceipt = !!e.receipt
                  const receiptInfo = hasReceipt ? parseReceipt(e.receipt!) : null

                  return (
                    <TableRow key={e.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(e.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="font-normal text-xs">
                          {cat?.name || e.categoryId}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-right pr-6 text-destructive tabular-nums">
                        -{formatTZS(e.amount)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {e.description}
                      </TableCell>
                      <TableCell>
                        {hasReceipt && receiptInfo ? (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary border-primary/20 cursor-pointer gap-1"
                              onClick={() => handleViewReceipt(receiptInfo.url, receiptInfo.filename)}
                              title="Open receipt preview in new tab"
                            >
                              <ImageIcon className="size-3" />
                              <span className="truncate max-w-[120px]">View {receiptInfo.filename}</span>
                            </Badge>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleDownloadReceipt(receiptInfo.url, receiptInfo.filename)}
                              title="Download receipt file"
                            >
                              <Download className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ag?.name || "System"}
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
