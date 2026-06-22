"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  HandCoins,
  Layers,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
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
import { isToday, withinDays } from "@/lib/calc"
import { formatTZS, formatDateTime } from "@/lib/format"
import { useData } from "@/lib/store"
import { dayKey } from "@/lib/format"

const trendConfig = {
  commission: { label: "Commission", color: "var(--chart-1)" },
} satisfies ChartConfig

const volumeConfig = {
  volume: { label: "Volume", color: "var(--chart-2)" },
} satisfies ChartConfig

export default function AgentBankingDashboard() {
  const {
    bankTransactions,
    banks,
    cashBalance,
    role,
    currentAgent,
  } = useData()

  // Filter transactions for today
  const todayTx = useMemo(() => {
    return bankTransactions.filter((t) => isToday(t.createdAt))
  }, [bankTransactions])

  const todayCommission = useMemo(() => {
    return todayTx.reduce((sum, t) => sum + t.commission, 0)
  }, [todayTx])

  const todayVolume = useMemo(() => {
    return todayTx.reduce((sum, t) => sum + t.amount, 0)
  }, [todayTx])

  const totalFloat = useMemo(() => {
    return banks.reduce((sum, b) => sum + b.floatBalance, 0)
  }, [banks])

  const lowFloat = useMemo(() => {
    return banks.filter((b) => b.active && b.floatBalance < b.threshold)
  }, [banks])

  // Get last 14 days daily series for agent banking
  const series = useMemo(() => {
    const buckets: { date: string; label: string; commission: number; volume: number }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = dayKey(d.toISOString())
      buckets.push({
        date: key,
        label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        commission: 0,
        volume: 0,
      })
    }

    const idx = new Map(buckets.map((b, i) => [b.date, i]))
    for (const t of bankTransactions) {
      const i = idx.get(dayKey(t.createdAt))
      if (i === undefined) continue
      buckets[i].commission += t.commission
      buckets[i].volume += t.amount
    }
    return buckets
  }, [bankTransactions])

  // Get volume by bank for last 7 days
  const byBank = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of bankTransactions) {
      if (!withinDays(t.createdAt, 7)) continue
      const bank = banks.find((b) => b.id === t.bankId)
      if (!bank) continue
      map.set(bank.name, (map.get(bank.name) ?? 0) + t.amount)
    }

    return banks
      .map((b) => ({ bank: b.name.replace(" Wakala", "").replace(" Agent Banking", ""), volume: map.get(b.name) ?? 0 }))
      .filter((d) => d.volume > 0)
      .sort((a, b) => b.volume - a.volume)
  }, [bankTransactions, banks])

  const recent = useMemo(() => {
    return [...bankTransactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [bankTransactions])

  const txTypeNames: Record<string, string> = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    balance_inquiry: "Inquiry",
    mini_statement: "Statement",
    cardless_withdrawal: "Cardless",
    account_opening: "Opening Assist",
  }

  return (
    <div className="flex flex-col gap-6">
      {lowFloat.length > 0 && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <AlertTriangle className="size-5 text-warning-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning-foreground">
                {lowFloat.length} bank partner account{lowFloat.length > 1 ? "s" : ""} below threshold
              </p>
              <p className="text-xs text-warning-foreground/80">
                {lowFloat.map((b) => b.name).join(", ")} need topping up.
              </p>
            </div>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/agent-banking/float">Manage Float</Link>} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Bank Commission"
          value={formatTZS(todayCommission)}
          icon={HandCoins}
          tone="success"
          hint={`${todayTx.length} transactions today`}
        />
        <StatCard
          label="Today's Bank Volume"
          value={formatTZS(todayVolume, { compact: true })}
          icon={ArrowUpRight}
          hint="Deposit + withdrawal volume"
        />
        <StatCard
          label="Total Bank Float"
          value={formatTZS(totalFloat, { compact: true })}
          icon={Layers}
          tone={lowFloat.length ? "warning" : "default"}
          hint={`${banks.length} bank partners`}
        />
        <StatCard
          label="Cash on Hand"
          value={formatTZS(cashBalance, { compact: true })}
          icon={Banknote}
          hint="Physical cash in drawer"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bank Commission Trend</CardTitle>
            <CardDescription>Daily earnings for the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[280px] w-full">
              <AreaChart data={series} margin={{ left: 4, right: 4, top: 8 }}>
                <defs>
                  <linearGradient id="fillCommission" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-commission)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-commission)" stopOpacity={0.02} />
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
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume by Bank</CardTitle>
            <CardDescription>Last 7 days volume</CardDescription>
          </CardHeader>
          <CardContent>
            {byBank.length > 0 ? (
              <ChartContainer config={volumeConfig} className="h-[280px] w-full">
                <BarChart data={byBank} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="bank" tickLine={false} axisLine={false} width={70} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => (
                    <span className="font-medium tabular-nums">{formatTZS(Number(value))}</span>
                  )} />} />
                  <Bar dataKey="volume" fill="var(--color-volume)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No transaction volume in the last 7 days.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bank Float Status</CardTitle>
            <CardDescription>Available balances vs low alert thresholds</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {banks.map((b) => {
              const maxFloat = Math.max(b.threshold * 2, b.floatBalance)
              const pct = maxFloat > 0 ? Math.min(100, Math.round((b.floatBalance / maxFloat) * 100)) : 0
              const low = b.floatBalance < b.threshold
              return (
                <div key={b.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{b.name}</span>
                    <span className={low ? "text-destructive font-semibold" : "text-muted-foreground font-mono"}>
                      {formatTZS(b.floatBalance, { compact: true })}
                    </span>
                  </div>
                  <Progress value={pct} className={low ? "[&>div]:bg-destructive" : "[&>div]:bg-success"} />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Threshold: {formatTZS(b.threshold, { compact: true })}</span>
                    {low && <span className="text-destructive font-semibold">Low Float Alert</span>}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Bank Transactions</CardTitle>
            <CardDescription>Latest agency banking activities</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length > 0 ? (
              <div className="flex flex-col gap-4">
                {recent.map((tx) => {
                  const b = banks.find((bank) => bank.id === tx.bankId)
                  return (
                    <div key={tx.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {txTypeNames[tx.type] || tx.type} - {b?.name || "Bank"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Ref: {tx.ref} • {formatDateTime(tx.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold font-mono">
                          {formatTZS(tx.amount)}
                        </p>
                        <p className="text-xs text-success font-medium">
                          +{formatTZS(tx.commission)} Comm
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2 text-center">
                  <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/agent-banking/transactions">View All Transactions</Link>} />
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No bank transactions recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
