import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashString } from "@/lib/crypto"
import {
  agents,
  networks,
  commissionTiers,
  expenseCategories,
  expenses,
  debts,
  floatTopups,
  transactions,
  cashEntries,
} from "@/lib/seed"

export async function POST() {
  try {
    // Block seeding in production for security
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Seeding is disabled in production environments" },
        { status: 403 }
      )
    }

    // Clear all existing data in order to prevent foreign key or primary key violations
    await prisma.debtPayment.deleteMany()
    await prisma.debt.deleteMany()
    await prisma.expense.deleteMany()
    await prisma.expenseCategory.deleteMany()
    await prisma.cashEntry.deleteMany()
    await prisma.floatTopup.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.commissionTier.deleteMany()
    await prisma.network.deleteMany()
    await prisma.agent.deleteMany()

    // 1. Seed Agents
    const phoneMap: Record<string, string> = {
      "agent-0": "255744963858",
      "agent-1": "255712345678",
      "agent-2": "255787654321",
    }
    await prisma.agent.createMany({
      data: agents.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role === "super_admin" ? "super_admin" : "agent",
        active: a.active,
        password: hashString("password123"),
        pin: hashString("1234"),
        phone: phoneMap[a.id] || null,
      })),
    })

    // 2. Seed Networks
    await prisma.network.createMany({
      data: networks.map((n) => ({
        id: n.id,
        name: n.name,
        code: n.code,
        floatBalance: n.floatBalance,
        threshold: n.threshold,
        active: n.active,
      })),
    })

    // 3. Seed Commission Tiers
    await prisma.commissionTier.createMany({
      data: commissionTiers.map((t) => ({
        id: t.id,
        networkId: t.networkId,
        min: t.min,
        max: t.max,
        deposit: t.deposit,
        withdrawal: t.withdrawal,
      })),
    })

    // 4. Seed Expense Categories
    await prisma.expenseCategory.createMany({
      data: expenseCategories.map((c) => ({
        id: c.id,
        name: c.name,
      })),
    })

    // 5. Seed Expenses
    await prisma.expense.createMany({
      data: expenses.map((e) => ({
        id: e.id,
        categoryId: e.categoryId,
        amount: e.amount,
        description: e.description,
        receipt: e.receipt || null,
        agentId: e.agentId,
        createdAt: new Date(e.createdAt),
      })),
    })

    // 6. Seed Debts & DebtPayments
    for (const d of debts) {
      await prisma.debt.create({
        data: {
          id: d.id,
          kind: d.kind === "receivable" ? "receivable" : "payable",
          party: d.party,
          partyPhone: d.partyPhone,
          principal: d.principal,
          description: d.description,
          agentId: d.agentId,
          dueDate: new Date(d.dueDate),
          createdAt: new Date(d.createdAt),
          payments: {
            create: d.payments.map((p) => ({
              id: p.id,
              amount: p.amount,
              createdAt: new Date(p.createdAt),
            })),
          },
        },
      })
    }

    // 7. Seed Float Topups
    await prisma.floatTopup.createMany({
      data: floatTopups.map((f) => ({
        id: f.id,
        networkId: f.networkId,
        amount: f.amount,
        source: f.source,
        note: f.note,
        agentId: f.agentId,
        createdAt: new Date(f.createdAt),
      })),
    })

    // 8. Seed Transactions
    await prisma.transaction.createMany({
      data: transactions.map((t) => ({
        id: t.id,
        ref: t.ref,
        type: t.type === "deposit" ? "deposit" : "withdrawal",
        networkId: t.networkId,
        amount: t.amount,
        commission: t.commission,
        customer: t.customer,
        customerPhone: t.customerPhone,
        agentId: t.agentId,
        createdAt: new Date(t.createdAt),
      })),
    })

    // 9. Seed Cash Entries
    await prisma.cashEntry.createMany({
      data: cashEntries.map((c) => ({
        id: c.id,
        direction: c.direction === "in" ? "in" : "out",
        amount: c.amount,
        reason: c.reason,
        agentId: c.agentId,
        createdAt: new Date(c.createdAt),
      })),
    })

    return NextResponse.json({ success: true, message: "Database seeded successfully!" })
  } catch (error: any) {
    console.error("Seeding error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
