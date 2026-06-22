import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth-api"

export async function GET() {
  try {
    await getAuthSession()

    const debts = await prisma.debt.findMany({
      include: { payments: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(debts)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession()
    const body = await req.json()

    // Case 1: Record a debt payment (repayment)
    if (body.debtId && body.amount) {
      const { debtId, amount } = body

      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        return NextResponse.json({ error: "Payment amount must be a positive number" }, { status: 400 })
      }
      
      const result = await prisma.$transaction(async (tx) => {
        const debt = await tx.debt.findUnique({
          where: { id: debtId },
        })
        if (!debt) throw new Error("Debt not found")

        const payment = await tx.debtPayment.create({
          data: {
            debtId,
            amount: Number(amount),
          },
        })

        // Update Cash Ledger:
        // - Customer pays us (receivable) -> Cash IN
        // - We pay supplier (payable) -> Cash OUT
        await tx.cashEntry.create({
          data: {
            direction: debt.kind === "receivable" ? "in" : "out",
            amount: Number(amount),
            reason: `Debt Payment: ${debt.party} (${debt.kind === "receivable" ? "Collection" : "Repayment"})`,
            agentId: session.agentId,
          },
        })

        return payment
      })

      return NextResponse.json(result)
    }

    // Case 2: Record a new debt (receivable or payable)
    const { kind, party, partyPhone, principal, dueDate, description } = body

    if (!kind || (kind !== "receivable" && kind !== "payable")) {
      return NextResponse.json({ error: "Debt kind must be 'receivable' or 'payable'" }, { status: 400 })
    }
    if (!party || typeof party !== "string" || party.trim().length < 1) {
      return NextResponse.json({ error: "Party name is required" }, { status: 400 })
    }
    if (!principal || isNaN(Number(principal)) || Number(principal) <= 0) {
      return NextResponse.json({ error: "Principal amount must be a positive number" }, { status: 400 })
    }
    if (!dueDate) {
      return NextResponse.json({ error: "Due date is required" }, { status: 400 })
    }

    const debt = await prisma.debt.create({
      data: {
        kind: kind === "receivable" ? "receivable" : "payable",
        party: party.trim(),
        partyPhone: partyPhone || "",
        principal: Number(principal),
        description: description || "",
        dueDate: new Date(dueDate),
        agentId: session.agentId,
      },
      include: { payments: true },
    })

    return NextResponse.json(debt)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
