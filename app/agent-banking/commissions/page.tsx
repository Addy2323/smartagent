"use client"

import { useMemo, useState } from "react"
import {
  Coins,
  Edit2,
  Lock,
  Save,
  Settings,
  Percent,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
} from "lucide-react"
import { useData } from "@/lib/store"
import { formatTZS } from "@/lib/format"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function BankCommissionsPage() {
  const {
    banks,
    bankCommissionTiers,
    role,
    updateBankCommissionTier,
  } = useData()

  // Selected Bank ID (defaults to the first active bank)
  const [selectedBankId, setSelectedBankId] = useState("crdb")
  
  // Edit Dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editTier, setEditTier] = useState<{
    id: string
    service: string
    min: number
    max: number
    commission: number
  } | null>(null)
  const [editCommissionVal, setEditCommissionVal] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Selected Bank
  const selectedBank = useMemo(() => {
    return banks.find((b) => b.id === selectedBankId)
  }, [banks, selectedBankId])

  // Get tiers for selected bank
  const selectedTiers = useMemo(() => {
    return bankCommissionTiers.filter((t) => t.bankId === selectedBankId)
  }, [bankCommissionTiers, selectedBankId])

  // Group tiers into Banded (Deposit/Withdrawal) and Flat (Others)
  const bandedTiers = useMemo(() => {
    return selectedTiers.filter((t) => ["deposit", "withdrawal"].includes(t.service))
  }, [selectedTiers])

  const flatTiers = useMemo(() => {
    return selectedTiers.filter((t) => !["deposit", "withdrawal"].includes(t.service))
  }, [selectedTiers])

  const handleEditClick = (tier: any) => {
    if (role !== "super_admin") return
    setEditTier(tier)
    setEditCommissionVal(tier.commission.toString())
    setEditOpen(true)
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTier || editCommissionVal === "" || isNaN(Number(editCommissionVal))) return

    try {
      setIsUpdating(true)
      await updateBankCommissionTier(editTier.id, Number(editCommissionVal))
      setEditOpen(false)
      setEditTier(null)
    } catch (err) {
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }

  const serviceNames: Record<string, string> = {
    deposit: "Cash Deposit",
    withdrawal: "Cash Withdrawal",
    balance_inquiry: "Balance Inquiry",
    mini_statement: "Mini Statement",
    cardless_withdrawal: "Cardless Withdrawal",
    account_opening: "Account Opening Assistance",
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Commissions Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Configure partner bank agency commission schedules per transaction range or flat service.
          </p>
        </div>

        {role !== "super_admin" && (
          <Badge variant="outline" className="gap-1 px-2.5 py-1 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 border-slate-200">
            <Lock className="size-3.5" />
            <span>Read-Only Mode (Admins Only)</span>
          </Badge>
        )}
        {role === "super_admin" && (
          <Badge variant="outline" className="gap-1 px-2.5 py-1 text-xs text-success bg-success/5 border-success/20">
            <ShieldCheck className="size-3.5" />
            <span>Administrator Control Active</span>
          </Badge>
        )}
      </div>

      {/* Tabs list for Bank Partners */}
      <Tabs value={selectedBankId} onValueChange={setSelectedBankId} className="w-full">
        <div className="overflow-x-auto pb-1 mb-2">
          <TabsList className="inline-flex min-w-max">
            {banks.map((b) => (
              <TabsTrigger key={b.id} value={b.id} className="text-xs sm:text-sm">
                {b.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {banks.map((b) => (
          <TabsContent key={b.id} value={b.id} className="space-y-6 mt-2">
            
            {/* Header info */}
            <Card>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">{b.name} Rules</h3>
                  <p className="text-xs text-muted-foreground">
                    Define how much commission is paid for {b.name} services.
                  </p>
                </div>
                <div className="text-xs font-mono bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border">
                  <span className="text-muted-foreground">Low Float Limit: </span>
                  <span className="font-semibold text-foreground">{formatTZS(b.threshold)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Banded Commissions (Deposit & Withdrawal) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Percent className="size-4 text-primary" />
                    Banded Commission Schedules
                  </CardTitle>
                  <CardDescription>
                    Applies to cash-in (deposit) and cash-out (withdrawal) transactions based on amount range.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Amount Range</TableHead>
                          <TableHead className="text-right">Agent Commission</TableHead>
                          {role === "super_admin" && <TableHead className="w-[80px]"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bandedTiers.length > 0 ? (
                          bandedTiers.map((tier) => (
                            <TableRow key={tier.id} className="hover:bg-slate-50/50">
                              <TableCell className="align-middle py-3">
                                <Badge variant="outline" className={tier.service === "deposit" ? "bg-blue-50/50 text-blue-700 dark:text-blue-400 border-blue-200" : "bg-emerald-50/50 text-emerald-700 dark:text-emerald-400 border-emerald-200"}>
                                  {serviceNames[tier.service]}
                                </Badge>
                              </TableCell>
                              <TableCell className="align-middle py-3 font-mono text-xs">
                                {formatTZS(tier.min)} - {tier.max >= 999999999 ? "Above" : formatTZS(tier.max)}
                              </TableCell>
                              <TableCell className="align-middle py-3 text-right font-bold font-mono text-sm">
                                {formatTZS(tier.commission)}
                              </TableCell>
                              {role === "super_admin" && (
                                <TableCell className="align-middle py-3 text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditClick(tier)}
                                    className="h-8 w-8 p-0 hover:bg-slate-100"
                                  >
                                    <Edit2 className="size-3.5 text-muted-foreground" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                              No banded commission rules found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Flat-rate Commissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Coins className="size-4 text-success" />
                    Flat-Rate Service Commissions
                  </CardTitle>
                  <CardDescription>
                    Applies flat commissions for non-financial operations or special products.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service / Action</TableHead>
                          <TableHead className="text-right">Commission Reward</TableHead>
                          {role === "super_admin" && <TableHead className="w-[80px]"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flatTiers.length > 0 ? (
                          flatTiers.map((tier) => (
                            <TableRow key={tier.id} className="hover:bg-slate-50/50">
                              <TableCell className="align-middle py-3 font-medium">
                                {serviceNames[tier.service] || tier.service}
                              </TableCell>
                              <TableCell className="align-middle py-3 text-right font-bold font-mono text-sm text-success">
                                {formatTZS(tier.commission)}
                              </TableCell>
                              {role === "super_admin" && (
                                <TableCell className="align-middle py-3 text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditClick(tier)}
                                    className="h-8 w-8 p-0 hover:bg-slate-100"
                                  >
                                    <Edit2 className="size-3.5 text-muted-foreground" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-xs">
                              No flat-rate commission rules found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Tier Commission Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Commission Rate</DialogTitle>
            <DialogDescription>
              Modify the agent commission payment for this rule.
            </DialogDescription>
          </DialogHeader>
          {editTier && (
            <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-4 py-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Service Type</p>
                <p className="text-sm font-semibold">{serviceNames[editTier.service] || editTier.service}</p>
              </div>

              {!["deposit", "withdrawal"].includes(editTier.service) ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Model Type</p>
                  <p className="text-sm">Flat rate reward per execution</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Amount Range Band</p>
                  <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                    {formatTZS(editTier.min)} - {editTier.max >= 999999999 ? "Above" : formatTZS(editTier.max)}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5 mt-2">
                <Label htmlFor="edit-commission">Commission Amount (TZS)</Label>
                <Input
                  id="edit-commission"
                  type="number"
                  placeholder="Enter commission in TZS"
                  required
                  value={editCommissionVal}
                  onChange={(e) => setEditCommissionVal(e.target.value)}
                />
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating || !editCommissionVal}>
                  {isUpdating ? "Saving Changes..." : "Save Rate"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
