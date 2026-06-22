"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  HandCoins,
  Layers,
  Wallet,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { StatCard } from "@/components/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { dailySeries, isToday, sumCommission, sumVolume } from "@/lib/calc"
import { formatTZS } from "@/lib/format"
import { useData } from "@/lib/store"

const trendConfig = {
  commission: { label: "Commission", color: "var(--chart-1)" },
  expenses: { label: "Expenses", color: "var(--chart-4)" },
} satisfies ChartConfig

const volumeConfig = {
  volume: { label: "Volume", color: "var(--chart-2)" },
} satisfies ChartConfig

export function Dashboard() {
  const { transactions, expenses, networks, cashBalance, networkById, debts, cashEntries } = useData()

  const todayTx = useMemo(() => transactions.filter((t) => isToday(t.createdAt)), [transactions])
  const todayCommission = sumCommission(todayTx)
  const todayVolume = sumVolume(todayTx)
  const totalFloat = networks.reduce((s, n) => s + n.floatBalance, 0)
  const lowFloat = networks.filter((n) => n.floatBalance < n.threshold)

  const series = useMemo(() => dailySeries(transactions, expenses, 14), [transactions, expenses])

  const openingCash = useMemo(() => {
    let opening = 0
    for (const ce of cashEntries) {
      if (!isToday(ce.createdAt)) {
        opening += ce.direction === "in" ? ce.amount : -ce.amount
      }
    }
    for (const tx of transactions) {
      if (!isToday(tx.createdAt)) {
        opening += tx.type === "deposit" ? tx.amount : -tx.amount
      }
    }
    return opening
  }, [cashEntries, transactions])

  const { receivables, payables } = useMemo(() => {
    let rec = 0
    let pay = 0
    for (const d of debts) {
      const outstanding = d.principal - d.payments.reduce((s, p) => s + p.amount, 0)
      if (outstanding <= 0) continue
      if (d.kind === "receivable") rec += outstanding
      else pay += outstanding
    }
    return { receivables: rec, payables: pay }
  }, [debts])

  const byNetwork = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (!isToday(t.createdAt) && !(Date.now() - +new Date(t.createdAt) < 7 * 864e5)) continue
      map.set(t.networkId, (map.get(t.networkId) ?? 0) + t.amount)
    }
    return networks
      .map((n) => ({ network: n.code, name: n.name, volume: map.get(n.id) ?? 0 }))
      .filter((d) => d.volume > 0)
      .sort((a, b) => b.volume - a.volume)
  }, [transactions, networks])

  const recent = transactions.slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      {lowFloat.length > 0 && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <AlertTriangle className="size-5 text-warning-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning-foreground">
                {lowFloat.length} float account{lowFloat.length > 1 ? "s" : ""} below threshold
              </p>
              <p className="text-xs text-warning-foreground/80">
                {lowFloat.map((n) => n.name).join(", ")} need topping up.
              </p>
            </div>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/float">Manage float</Link>} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Commission" value={formatTZS(todayCommission)} icon={HandCoins} tone="success" hint={`${todayTx.length} transactions today`} />
        <StatCard label="Today's Volume" value={formatTZS(todayVolume, { compact: true })} icon={ArrowUpRight} hint="Cash-in + cash-out" />
        <StatCard label="Total Float" value={formatTZS(totalFloat, { compact: true })} icon={Layers} tone={lowFloat.length ? "warning" : "default"} hint={`${networks.length} accounts`} />
        <StatCard label="Cash on Hand" value={formatTZS(cashBalance, { compact: true })} icon={Banknote} hint="Physical cash in drawer" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cash Drawer Status</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Opening Cash</p>
              <p className="text-lg font-bold mt-0.5 font-mono">{formatTZS(openingCash)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Cash</p>
              <p className="text-lg font-bold mt-0.5 font-mono text-primary">{formatTZS(cashBalance)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Credits</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Receivables (Customer)</p>
              <p className="text-lg font-bold mt-0.5 font-mono text-destructive">{formatTZS(receivables)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payables (Supplier)</p>
              <p className="text-lg font-bold mt-0.5 font-mono text-slate-700 dark:text-slate-200">{formatTZS(payables)}</p>
            </div>
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Commission vs Expenses</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[280px] w-full">
              <AreaChart data={series} margin={{ left: 4, right: 4, top: 8 }}>
                <defs>
                  <linearGradient id="fillCommission" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-commission)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-commission)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} width={44} fontSize={11} tickFormatter={(v) => formatTZS(v, { compact: true }).replace("TZS ", "")} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="capitalize text-muted-foreground">{name}</span>
                    <span className="font-medium tabular-nums">{formatTZS(Number(value))}</span>
                  </div>
                )} />} />
                <Area dataKey="commission" type="monotone" stroke="var(--color-commission)" fill="url(#fillCommission)" strokeWidth={2} />
                <Area dataKey="expenses" type="monotone" stroke="var(--color-expenses)" fill="url(#fillExpenses)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume by Network</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={volumeConfig} className="h-[280px] w-full">
              <BarChart data={byNetwork} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="network" tickLine={false} axisLine={false} width={40} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => (
                  <span className="font-medium tabular-nums">{formatTZS(Number(value))}</span>
                )} />} />
                <Bar dataKey="volume" fill="var(--color-volume)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Float Status</CardTitle>
            <CardDescription>Balance against alert threshold</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {networks.map((n) => {
              const pct = Math.min(100, Math.round((n.floatBalance / (n.threshold * 2)) * 100))
              const low = n.floatBalance < n.threshold
              return (
                <div key={n.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{n.name}</span>
                    <span className={low ? "text-destructive" : "text-muted-foreground"}>
                      {formatTZS(n.floatBalance, { compact: true })}
                    </span>
                  </div>
                  <Progress value={pct} className={low ? "[&>div]:bg-destructive" : "[&>div]:bg-success"} />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest activity across all agents</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {recent.map((t) => {
              const net = networkById(t.networkId)
              const deposit = t.type === "deposit"
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-md px-1 py-2">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${deposit ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {deposit ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.customer}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {net?.name} · {deposit ? "Deposit" : "Withdrawal"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">{formatTZS(t.amount, { compact: true })}</p>
                    <Badge variant="secondary" className="mt-0.5 text-[10px]">+{formatTZS(t.commission)}</Badge>
                  </div>
                </div>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full"
              nativeButton={false}
              render={<Link href="/transactions">View all transactions</Link>}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
