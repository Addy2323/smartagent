import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth-api"

export async function GET() {
  try {
    const session = await getAuthSession()
    const transfers = await prisma.transfer.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(transfers)
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
    const { sourceType, sourceId, destType, destId, amount, charges } = await req.json()

    if (!sourceType || !destType || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Source, destination and positive amount are required" }, { status: 400 })
    }

    const amtNum = Number(amount)
    const chgNum = Number(charges) || 0

    // Execute Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate and deduct from source
      if (sourceType === "cash") {
        // Log cash outflow
        await tx.cashEntry.create({
          data: {
            direction: "out",
            amount: amtNum + chgNum,
            reason: `Transfer Out to ${destType.toUpperCase()} ${destId ? `(${destId.toUpperCase()})` : ""}`,
            agentId: session.agentId,
          },
        })
      } else if (sourceType === "network_float" && sourceId) {
        const net = await tx.network.findUnique({ where: { id: sourceId } })
        if (!net || net.floatBalance < (amtNum + chgNum)) {
          throw new Error(`Insufficient float balance in ${net?.name || sourceId}`)
        }
        await tx.network.update({
          where: { id: sourceId },
          data: { floatBalance: { decrement: amtNum + chgNum } },
        })
      } else if (sourceType === "bank_float" && sourceId) {
        const bank = await tx.bank.findUnique({ where: { id: sourceId } })
        if (!bank || bank.floatBalance < (amtNum + chgNum)) {
          throw new Error(`Insufficient float balance in ${bank?.name || sourceId}`)
        }
        await tx.bank.update({
          where: { id: sourceId },
          data: { floatBalance: { decrement: amtNum + chgNum } },
        })
      }

      // 2. Validate and add to destination
      if (destType === "cash") {
        // Log cash inflow
        await tx.cashEntry.create({
          data: {
            direction: "in",
            amount: amtNum,
            reason: `Transfer In from ${sourceType.toUpperCase()} ${sourceId ? `(${sourceId.toUpperCase()})` : ""}`,
            agentId: session.agentId,
          },
        })
      } else if (destType === "network_float" && destId) {
        await tx.network.update({
          where: { id: destId },
          data: { floatBalance: { increment: amtNum } },
        })
      } else if (destType === "bank_float" && destId) {
        await tx.bank.update({
          where: { id: destId },
          data: { floatBalance: { increment: amtNum } },
        })
      }

      // 3. Create transfer log
      const transfer = await tx.transfer.create({
        data: {
          sourceType,
          sourceId: sourceId || null,
          destType,
          destId: destId || null,
          amount: amtNum,
          charges: chgNum,
          agentId: session.agentId,
        },
      })

      return transfer
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
