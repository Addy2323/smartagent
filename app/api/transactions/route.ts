import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth-api"

export async function GET() {
  try {
    const session = await getAuthSession()
    
    // Authorization: standard agents only see their own transactions, super admins see all
    const where = session.role === "super_admin" ? {} : { agentId: session.agentId }
    
    const transactions = await prisma.transaction.findMany({
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
    const { networkId, type, amount, customer, customerPhone } = await req.json()

    // Input validation
    if (!networkId || typeof networkId !== "string") {
      return NextResponse.json({ error: "Network selection is required" }, { status: 400 })
    }
    if (!type || (type !== "deposit" && type !== "withdrawal")) {
      return NextResponse.json({ error: "Transaction type must be 'deposit' or 'withdrawal'" }, { status: 400 })
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    // 1. Fetch network and tiers for commission calculation
    const network = await prisma.network.findUnique({
      where: { id: networkId },
      include: { tiers: true },
    })

    if (!network) {
      return NextResponse.json({ error: "Network not found" }, { status: 404 })
    }

    if (!network.active) {
      return NextResponse.json({ error: "This network is currently disabled" }, { status: 403 })
    }

    // 2. Determine commission based on tier
    const tier = network.tiers.find((t) => amount >= t.min && amount <= t.max)
    const commission = tier ? (type === "deposit" ? tier.deposit : tier.withdrawal) : 0

    // 3. Generate a unique transaction reference
    const ref = `TXN${Date.now().toString(36).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`
    const floatChange = type === "deposit" ? -amount : amount

    // 4. Run Prisma transaction to create log and adjust network float balance
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          ref,
          type: type === "deposit" ? "deposit" : "withdrawal",
          networkId,
          amount,
          commission,
          customer: customer || "Walk-in Customer",
          customerPhone: customerPhone || "",
          agentId: session.agentId,
        },
      })

      await tx.network.update({
        where: { id: networkId },
        data: {
          floatBalance: { increment: floatChange },
        },
      })

      return transaction
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
