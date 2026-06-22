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
  banks,
  bankCommissionTiers,
  bankTransactions,
  bankFloatTopups,
  transfers,
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
    await prisma.transfer.deleteMany()
    await prisma.bankFloatTopup.deleteMany()
    await prisma.bankTransaction.deleteMany()
    await prisma.bankCommissionTier.deleteMany()
    await prisma.bank.deleteMany()
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

    // 10. Seed Banks
    await prisma.bank.createMany({
      data: banks.map((b) => ({
        id: b.id,
        name: b.name,
        floatBalance: b.floatBalance,
        threshold: b.threshold,
        active: b.active,
      })),
    })

    // 11. Seed Bank Commission Tiers
    await prisma.bankCommissionTier.createMany({
      data: bankCommissionTiers.map((bt) => ({
        id: bt.id,
        bankId: bt.bankId,
        service: bt.service,
        min: bt.min,
        max: bt.max,
        commission: bt.commission,
      })),
    })

    // 12. Seed Bank Transactions
    await prisma.bankTransaction.createMany({
      data: bankTransactions.map((bt) => ({
        id: bt.id,
        ref: bt.ref,
        type: bt.type as any,
        bankId: bt.bankId,
        accountNumber: bt.accountNumber,
        accountName: bt.accountName,
        amount: bt.amount,
        fee: bt.fee,
        commission: bt.commission,
        tellerNumber: bt.tellerNumber,
        customerName: bt.customerName,
        customerPhone: bt.customerPhone,
        referenceNumber: bt.referenceNumber,
        notes: bt.notes,
        agentId: bt.agentId,
        createdAt: new Date(bt.createdAt),
      })),
    })

    // 13. Seed Bank Float Topups
    await prisma.bankFloatTopup.createMany({
      data: bankFloatTopups.map((bf) => ({
        id: bf.id,
        bankId: bf.bankId,
        amount: bf.amount,
        source: bf.source,
        note: bf.note,
        agentId: bf.agentId,
        createdAt: new Date(bf.createdAt),
      })),
    })

    // 14. Seed Transfers
    await prisma.transfer.createMany({
      data: transfers.map((tr) => ({
        id: tr.id,
        sourceType: tr.sourceType,
        sourceId: tr.sourceId,
        destType: tr.destType,
        destId: tr.destId,
        amount: tr.amount,
        charges: tr.charges,
        agentId: tr.agentId,
        createdAt: new Date(tr.createdAt),
      })),
    })

    return NextResponse.json({ success: true, message: "Database seeded successfully!" })
  } catch (error: any) {
    console.error("Seeding error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
