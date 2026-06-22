"use client"

import { useMemo, useState } from "react"
import { Calendar, DollarSign, ArrowDown, ArrowUp, FileText, Printer, CalendarIcon } from "lucide-react"
import { useData } from "@/lib/store"
import { formatTZS } from "@/lib/format"
import { isToday, withinDays } from "@/lib/calc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.6 0.15 320)",
  "oklch(0.5 0.15 120)",
  "oklch(0.7 0.1 20)",
]

export default function ProfitLossPage() {
  const {
    transactions,
    expenses,
    expenseCategories,
    networks,
  } = useData()

  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month")

  // Filter transactions and expenses by selected period
  const filteredData = useMemo(() => {
    const txs = transactions.filter((t) => {
      if (period === "today") return isToday(t.createdAt)
      if (period === "week") return withinDays(t.createdAt, 7)
      if (period === "month") return withinDays(t.createdAt, 30)
      return true
    })

    const exps = expenses.filter((e) => {
      if (period === "today") return isToday(e.createdAt)
      if (period === "week") return withinDays(e.createdAt, 7)
      if (period === "month") return withinDays(e.createdAt, 30)
      return true
    })

    return { txs, exps }
  }, [transactions, expenses, period])

  // Aggregate Commission Revenue by Network
  const networkRevenues = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of filteredData.txs) {
      map.set(tx.networkId, (map.get(tx.networkId) ?? 0) + tx.commission)
    }

    return networks.map((n) => ({
      name: n.name,
      amount: map.get(n.id) ?? 0,
    })).filter((n) => n.amount > 0)
  }, [filteredData.txs, networks])

  const totalRevenue = useMemo(() => {
    return networkRevenues.reduce((s, r) => s + r.amount, 0)
  }, [networkRevenues])

  // Aggregate Expenses by Category
  const categoryExpenses = useMemo(() => {
    const map = new Map<string, number>()
    for (const exp of filteredData.exps) {
      map.set(exp.categoryId, (map.get(exp.categoryId) ?? 0) + exp.amount)
    }

    return expenseCategories.map((c) => ({
      id: c.id,
      name: c.name,
      amount: map.get(c.id) ?? 0,
    })).filter((c) => c.amount > 0)
  }, [filteredData.exps, expenseCategories])

  const totalExpenses = useMemo(() => {
    return categoryExpenses.reduce((s, e) => s + e.amount, 0)
  }, [categoryExpenses])

  const netProfit = totalRevenue - totalExpenses

  // Pie chart config for expense categories
  const expenseChartData = useMemo(() => {
    return categoryExpenses.map((c, i) => ({
      name: c.name,
      value: c.amount,
      color: COLORS[i % COLORS.length],
    }))
  }, [categoryExpenses])

  const chartConfig = {
    value: { label: "Amount" },
  }

  // Handle printing
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Profit & Loss Statement</h2>
          <p className="text-sm text-muted-foreground">
            Analyze your business revenues, expenses, and net profit margins over time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <CalendarIcon className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week (7d)</SelectItem>
              <SelectItem value="month">This Month (30d)</SelectItem>
              <SelectItem value="all">All-Time</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handlePrint} className="h-8">
            <Printer className="size-3.5 mr-1" />
            <span className="text-xs">Print Statement</span>
          </Button>
        </div>
      </div>

      {/* Print-only title */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">SmartAgent Manager</h1>
        <h2 className="text-lg font-semibold text-muted-foreground">Profit & Loss Statement</h2>
        <p className="text-xs text-muted-foreground">
          Period: {period === "today" ? "Today" : period === "week" ? "This Week" : period === "month" ? "This Month" : "All Time"}
        </p>
        <p className="text-xs text-muted-foreground">Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* Net profit banner block */}
      <Card className={`relative overflow-hidden ${netProfit >= 0 ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net P&L Profit</p>
            <h3 className={`text-4xl font-extrabold mt-1 tracking-tight ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {netProfit >= 0 ? "+" : ""}{formatTZS(netProfit)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Commission Margin: {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0"}%
            </p>
          </div>
          <div className={`size-14 rounded-full flex items-center justify-center ${netProfit >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            {netProfit >= 0 ? <ArrowUp className="size-8" /> : <ArrowDown className="size-8" />}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* P&L Statement sheet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">P&L Financial Sheet</CardTitle>
            <CardDescription>Detailed audit statement of revenues against operating expenses.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold text-xs">Description</TableHead>
                  <TableHead className="text-right font-semibold text-xs pr-6">Amount (TZS)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* 1. Revenues */}
                <TableRow className="bg-muted/10 font-bold hover:bg-muted/10">
                  <TableCell className="text-xs text-primary font-bold">REVENUES (COMMISSIONS)</TableCell>
                  <TableCell className="text-right text-xs pr-6" />
                </TableRow>
                {networkRevenues.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs pl-6">{r.name} Commissions</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums pr-6 text-success">
                      +{formatTZS(r.amount).replace("TZS ", "")}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold border-b hover:bg-transparent">
                  <TableCell className="text-xs font-semibold pl-4">Total Commission Revenues</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-success pr-6 border-t">
                    +{formatTZS(totalRevenue).replace("TZS ", "")}
                  </TableCell>
                </TableRow>

                {/* 2. Expenses */}
                <TableRow className="bg-muted/10 font-bold hover:bg-muted/10">
                  <TableCell className="text-xs text-destructive font-bold">OPERATIONAL EXPENSES</TableCell>
                  <TableCell className="text-right text-xs pr-6" />
                </TableRow>
                {categoryExpenses.map((e, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs pl-6">{e.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums pr-6 text-destructive">
                      -{formatTZS(e.amount).replace("TZS ", "")}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold border-b hover:bg-transparent">
                  <TableCell className="text-xs font-semibold pl-4">Total Operating Expenses</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-destructive pr-6 border-t">
                    -{formatTZS(totalExpenses).replace("TZS ", "")}
                  </TableCell>
                </TableRow>

                {/* 3. Summary */}
                <TableRow className="bg-muted/30 font-bold hover:bg-muted/30">
                  <TableCell className="text-xs font-bold">NET OPERATING PROFIT</TableCell>
                  <TableCell className={`text-right font-mono text-xs font-bold pr-6 ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                    {netProfit >= 0 ? "+" : ""}{formatTZS(netProfit).replace("TZS ", "")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expense distribution chart */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base font-bold">Expense Allocation Analysis</CardTitle>
            <CardDescription>Proportional distribution of expenses across operating categories.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 gap-6">
            {expenseChartData.length === 0 ? (
              <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground text-xs">
                No expenses logged to display analysis.
              </div>
            ) : (
              <>
                <ChartContainer config={chartConfig} className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatTZS(Number(v))} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>

                {/* Custom legends list */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full text-xs">
                  {expenseChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                      <span className="font-semibold ml-auto font-mono">{((item.value / totalExpenses) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
