import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth-api"

export async function GET() {
  try {
    const session = await getAuthSession()
    const topups = await prisma.bankFloatTopup.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(topups)
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
    const { bankId, amount, source, note, fromCash } = await req.json()

    if (!bankId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Bank and positive amount are required" }, { status: 400 })
    }

    const amtNum = Number(amount)

    // Execute Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      const topup = await tx.bankFloatTopup.create({
        data: {
          bankId,
          amount: amtNum,
          source: source || "Bank Transfer",
          note: note || "",
          agentId: session.agentId,
        },
      })

      // Increase bank float balance
      await tx.bank.update({
        where: { id: bankId },
        data: {
          floatBalance: { increment: amtNum },
        },
      })

      // If funded from cash drawer, create cash ledger out entry
      if (fromCash) {
        await tx.cashEntry.create({
          data: {
            direction: "out",
            amount: amtNum,
            reason: `Float Refill: Bank ${bankId.toUpperCase()} via Cash Drawer`,
            agentId: session.agentId,
          },
        })
      }

      return topup
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
