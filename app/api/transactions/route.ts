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

export async function PUT(req: Request) {
  try {
    const session = await getAuthSession()
    const { id, type, amount, customer, customerPhone, ref } = await req.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 })
    }

    // 1. Fetch existing transaction
    const oldTx = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!oldTx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Authorization: standard agents can only edit their own transactions
    if (session.role !== "super_admin" && oldTx.agentId !== session.agentId) {
      return NextResponse.json({ error: "Unauthorized to edit this transaction" }, { status: 403 })
    }

    // 2. Validate inputs
    const newType = type || oldTx.type
    const newAmount = amount !== undefined ? Number(amount) : oldTx.amount

    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    // 3. Re-calculate commission if type or amount changes
    let newCommission = oldTx.commission
    if (type !== undefined || amount !== undefined) {
      const network = await prisma.network.findUnique({
        where: { id: oldTx.networkId },
        include: { tiers: true },
      })
      if (network) {
        const tier = network.tiers.find((t) => newAmount >= t.min && newAmount <= t.max)
        newCommission = tier ? (newType === "deposit" ? tier.deposit : tier.withdrawal) : 0
      }
    }

    // 4. Calculate network float balance correction
    const reverseOldChange = oldTx.type === "deposit" ? oldTx.amount : -oldTx.amount
    const applyNewChange = newType === "deposit" ? -newAmount : newAmount
    const netFloatCorrection = reverseOldChange + applyNewChange

    // 5. Update transaction and network float inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedTx = await tx.transaction.update({
        where: { id },
        data: {
          type: newType,
          amount: newAmount,
          commission: newCommission,
          customer: customer !== undefined ? customer : oldTx.customer,
          customerPhone: customerPhone !== undefined ? customerPhone : oldTx.customerPhone,
          ref: ref !== undefined ? ref : oldTx.ref,
        },
      })

      if (netFloatCorrection !== 0) {
        await tx.network.update({
          where: { id: oldTx.networkId },
          data: {
            floatBalance: { increment: netFloatCorrection },
          },
        })
      }

      return updatedTx
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

