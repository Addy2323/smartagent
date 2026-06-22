import { dayKey } from "./format"
import type { Debt, Expense, Transaction } from "./types"

export function debtPaid(d: Debt) {
  return d.payments.reduce((s, p) => s + p.amount, 0)
}

export function debtOutstanding(d: Debt) {
  return Math.max(0, d.principal - debtPaid(d))
}

export function debtStatus(d: Debt): "open" | "partial" | "settled" {
  const paid = debtPaid(d)
  if (paid <= 0) return "open"
  if (paid >= d.principal) return "settled"
  return "partial"
}

export function isToday(iso: string) {
  return dayKey(iso) === dayKey(new Date().toISOString())
}

export function withinDays(iso: string, days: number) {
  const diff = Date.now() - +new Date(iso)
  return diff <= days * 24 * 60 * 60 * 1000 && diff >= 0
}

export function sumCommission(txs: Transaction[]) {
  return txs.reduce((s, t) => s + t.commission, 0)
}

export function sumVolume(txs: Transaction[]) {
  return txs.reduce((s, t) => s + t.amount, 0)
}

export function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((s, e) => s + e.amount, 0)
}

/** Build a per-day series for the last `days` days (oldest first). */
export function dailySeries(
  transactions: Transaction[],
  expenses: Expense[],
  days: number,
) {
  const buckets: { date: string; label: string; commission: number; volume: number; expenses: number; net: number }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = dayKey(d.toISOString())
    buckets.push({
      date: key,
      label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      commission: 0,
      volume: 0,
      expenses: 0,
      net: 0,
    })
  }
  const idx = new Map(buckets.map((b, i) => [b.date, i]))
  for (const t of transactions) {
    const i = idx.get(dayKey(t.createdAt))
    if (i === undefined) continue
    buckets[i].commission += t.commission
    buckets[i].volume += t.amount
  }
  for (const e of expenses) {
    const i = idx.get(dayKey(e.createdAt))
    if (i === undefined) continue
    buckets[i].expenses += e.amount
  }
  for (const b of buckets) b.net = b.commission - b.expenses
  return buckets
}
