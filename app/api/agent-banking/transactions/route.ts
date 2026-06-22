import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth-api"

export async function GET() {
  try {
    const session = await getAuthSession()
    const where = session.role === "super_admin" ? {} : { agentId: session.agentId }

    const transactions = await prisma.bankTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(transactions)
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
    const {
      type,
      bankId,
      accountNumber,
      accountName,
      amount,
      fee,
      tellerNumber,
      customerName,
      customerPhone,
      referenceNumber,
      notes,
    } = await req.json()

    // Validation
    if (!bankId || typeof bankId !== "string") {
      return NextResponse.json({ error: "Bank selection is required" }, { status: 400 })
    }
    if (!type || typeof type !== "string") {
      return NextResponse.json({ error: "Service type is required" }, { status: 400 })
    }

    const amtNum = Number(amount) || 0
    const feeNum = Number(fee) || 0

    if (amtNum < 0 || feeNum < 0) {
      return NextResponse.json({ error: "Amount and Fee must be non-negative" }, { status: 400 })
    }

    // 1. Fetch bank and tiers
    const bank = await prisma.bank.findUnique({
      where: { id: bankId },
      include: { tiers: true },
    })

    if (!bank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 })
    }

    if (!bank.active) {
      return NextResponse.json({ error: "This bank channel is currently disabled" }, { status: 403 })
    }

    // 2. Find commission for this service and amount
    const tier = bank.tiers.find(
      (t) => t.service === type && amtNum >= t.min && amtNum <= t.max
    )
    const commission = tier ? tier.commission : 0

    // 3. Float change mapping
    let floatChange = 0
    if (type === "deposit") {
      floatChange = -amtNum
    } else if (type === "withdrawal" || type === "cardless_withdrawal") {
      floatChange = amtNum
    }

    // 4. Generate reference if not provided
    const ref = referenceNumber || `BKN${Date.now().toString(36).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`

    // 5. Execute Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.bankTransaction.create({
        data: {
          ref,
          type,
          bankId,
          accountNumber: accountNumber || null,
          accountName: accountName || null,
          amount: amtNum,
          fee: feeNum,
          commission,
          tellerNumber: tellerNumber || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          referenceNumber: ref,
          notes: notes || null,
          agentId: session.agentId,
        },
      })

      if (floatChange !== 0) {
        await tx.bank.update({
          where: { id: bankId },
          data: {
            floatBalance: { increment: floatChange },
          },
        })
      }

      return transaction
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
