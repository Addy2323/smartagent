"use client"

import { useMemo, useState } from "react"
import { Coins, Edit2, HandCoins, Info, Save, TrendingUp } from "lucide-react"
import { useData } from "@/lib/store"
import { formatTZS } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function CommissionsPage() {
  const {
    transactions,
    networks,
    commissionTiers,
    role,
    updateTier,
  } = useData()

  // Editing state for tiers
  const [editingTierId, setEditingTierId] = useState<string | null>(null)
  const [editDep, setEditDep] = useState("")
  const [editWd, setEditWd] = useState("")

  // Selected network in rate configurator
  const [selectedConfigNet, setSelectedConfigNet] = useState(networks[0]?.id || "mp")

  // Statistics
  const stats = useMemo(() => {
    const total = transactions.reduce((sum, tx) => sum + tx.commission, 0)
    const avg = transactions.length > 0 ? total / transactions.length : 0
    
    // Find network with highest commission
    const netMap = new Map<string, number>()
    for (const tx of transactions) {
      netMap.set(tx.networkId, (netMap.get(tx.networkId) ?? 0) + tx.commission)
    }
    let topNetName = "N/A"
    let topNetComm = 0
    netMap.forEach((comm, netId) => {
      const net = networks.find((n) => n.id === netId)
      if (net && comm > topNetComm) {
        topNetComm = comm
        topNetName = net.name
      }
    })

    return { total, avg, topNetName, topNetComm }
  }, [transactions, networks])

  // Daily aggregate report
  const dailyReport = useMemo(() => {
    const daysMap = new Map<string, { date: string; volume: number; commission: number; count: number }>()
    for (const tx of transactions) {
      const dateStr = new Date(tx.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      const current = daysMap.get(dateStr) || { date: dateStr, volume: 0, commission: 0, count: 0 }
      current.volume += tx.amount
      current.commission += tx.commission
      current.count += 1
      daysMap.set(dateStr, current)
    }
    return Array.from(daysMap.values()).sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [transactions])

  // Monthly aggregate report
  const monthlyReport = useMemo(() => {
    const monthsMap = new Map<string, { month: string; volume: number; commission: number; count: number }>()
    for (const tx of transactions) {
      const monthStr = new Date(tx.createdAt).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
      const current = monthsMap.get(monthStr) || { month: monthStr, volume: 0, commission: 0, count: 0 }
      current.volume += tx.amount
      current.commission += tx.commission
      current.count += 1
      monthsMap.set(monthStr, current)
    }
    return Array.from(monthsMap.values())
  }, [transactions])

  const handleEditTier = (tierId: string, currentDep: number, currentWd: number) => {
    setEditingTierId(tierId)
    setEditDep(String(currentDep))
    setEditWd(String(currentWd))
  }

  const handleSaveTier = async (tierId: string) => {
    const depVal = Number(editDep)
    const wdVal = Number(editWd)
    if (isNaN(depVal) || isNaN(wdVal)) return

    await updateTier(tierId, depVal, wdVal)
    setEditingTierId(null)
  }

  const selectedTiers = useMemo(() => {
    return commissionTiers.filter((t) => t.networkId === selectedConfigNet)
  }, [commissionTiers, selectedConfigNet])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Commission Management</h2>
        <p className="text-sm text-muted-foreground">
          Monitor your daily commission revenue and configure network payout structures.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Commission Earned</p>
              <h3 className="text-2xl font-bold mt-1 text-success">{formatTZS(stats.total)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Across all networks and agents</p>
            </div>
            <div className="size-10 rounded-lg bg-success/15 text-success flex items-center justify-center">
              <HandCoins className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Average per Transaction</p>
              <h3 className="text-2xl font-bold mt-1 text-primary">{formatTZS(stats.avg)}</h3>
              <p className="text-xs text-muted-foreground mt-1">From {transactions.length} total txs</p>
            </div>
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Coins className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Top Network Payout</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight truncate max-w-[180px]">
                {stats.topNetName}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Generated {formatTZS(stats.topNetComm, { compact: true })}
              </p>
            </div>
            <div className="size-10 rounded-lg bg-warning/15 text-warning-foreground flex items-center justify-center">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Configurator */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Commission Rate Configurator</CardTitle>
            <CardDescription>
              {role === "super_admin"
                ? "Configure flat agent commission rates (TZS) per transaction volume band."
                : "View commission rate bands for each provider (editing requires Super Admin role)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {networks.map((net) => (
                <Button
                  key={net.id}
                  variant={selectedConfigNet === net.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedConfigNet(net.id)
                    setEditingTierId(null)
                  }}
                  className="h-8"
                >
                  {net.name}
                </Button>
              ))}
            </div>

            <div className="rounded-md border mt-2 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Volume Tier (TZS)</TableHead>
                    <TableHead className="text-right">Deposit Comm (TZS)</TableHead>
                    <TableHead className="text-right">Withdrawal Comm (TZS)</TableHead>
                    {role === "super_admin" && <TableHead className="w-[100px] text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTiers.map((tier) => {
                    const isEditing = editingTierId === tier.id

                    return (
                      <TableRow key={tier.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold">
                          {formatTZS(tier.min)} - {formatTZS(tier.max)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="h-7 w-24 ml-auto text-right font-mono text-xs"
                              value={editDep}
                              onChange={(e) => setEditDep(e.target.value)}
                            />
                          ) : (
                            formatTZS(tier.deposit)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="h-7 w-24 ml-auto text-right font-mono text-xs"
                              value={editWd}
                              onChange={(e) => setEditWd(e.target.value)}
                            />
                          ) : (
                            formatTZS(tier.withdrawal)
                          )}
                        </TableCell>
                        {role === "super_admin" && (
                          <TableCell className="text-center">
                            {isEditing ? (
                              <Button
                                size="icon-xs"
                                variant="default"
                                onClick={() => handleSaveTier(tier.id)}
                                className="size-7"
                              >
                                <Save className="size-3.5" />
                              </Button>
                            ) : (
                              <Button
                                size="icon-xs"
                                variant="outline"
                                onClick={() =>
                                  handleEditTier(tier.id, tier.deposit, tier.withdrawal)
                                }
                                className="size-7"
                              >
                                <Edit2 className="size-3" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Commission Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Commission Statements</CardTitle>
            <CardDescription>Consolidated statements for daily/monthly payouts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="daily">
              <div className="px-6 border-b">
                <TabsList className="w-full justify-start h-9 bg-transparent p-0 gap-4">
                  <TabsTrigger
                    value="daily"
                    className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 font-semibold text-xs"
                  >
                    Daily Reports
                  </TabsTrigger>
                  <TabsTrigger
                    value="monthly"
                    className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 font-semibold text-xs"
                  >
                    Monthly Reports
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="daily" className="m-0">
                <div className="max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 border-b">
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-right text-xs pr-4">Txs</TableHead>
                        <TableHead className="text-right text-xs pr-4">Total Comm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-xs">
                            No statements available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        dailyReport.map((day, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-medium">{day.date}</TableCell>
                            <TableCell className="text-right text-xs tabular-nums pr-4">
                              {day.count}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-semibold text-success tabular-nums pr-4">
                              {formatTZS(day.commission)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="monthly" className="m-0">
                <div className="max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 border-b">
                      <TableRow>
                        <TableHead className="text-xs">Month</TableHead>
                        <TableHead className="text-right text-xs pr-4">Txs</TableHead>
                        <TableHead className="text-right text-xs pr-4">Total Comm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-xs">
                            No statements available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthlyReport.map((m, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-medium">{m.month}</TableCell>
                            <TableCell className="text-right text-xs tabular-nums pr-4">
                              {m.count}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-semibold text-success tabular-nums pr-4">
                              {formatTZS(m.commission)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
