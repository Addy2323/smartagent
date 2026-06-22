import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth-api"

export async function GET() {
  try {
    await getAuthSession()

    const topups = await prisma.floatTopup.findMany({
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
    const { networkId, amount, source, note, fromCash } = await req.json()

    // Input validation
    if (!networkId || typeof networkId !== "string") {
      return NextResponse.json({ error: "Network selection is required" }, { status: 400 })
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }
    if (!source || typeof source !== "string") {
      return NextResponse.json({ error: "Funding source is required" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch network details
      const network = await tx.network.findUnique({
        where: { id: networkId },
      })
      if (!network) throw new Error("Network not found")

      // 2. Create topup log
      const topup = await tx.floatTopup.create({
        data: {
          networkId,
          amount: Number(amount),
          source,
          note: note || "",
          agentId: session.agentId,
        },
      })

      // 3. Increment network float balance
      await tx.network.update({
        where: { id: networkId },
        data: {
          floatBalance: { increment: Number(amount) },
        },
      })

      // 4. If funded from cash, create cash entry out
      if (fromCash) {
        await tx.cashEntry.create({
          data: {
            direction: "out",
            amount: Number(amount),
            reason: `Float Top-up: ${network.name} (${source})`,
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
