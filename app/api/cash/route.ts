import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth-api"

export async function GET() {
  try {
    await getAuthSession()

    const entries = await prisma.cashEntry.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(entries)
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
    const { direction, amount, reason } = await req.json()

    // Input validation
    if (!direction || (direction !== "in" && direction !== "out")) {
      return NextResponse.json({ error: "Direction must be 'in' or 'out'" }, { status: 400 })
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 1) {
      return NextResponse.json({ error: "A reason is required" }, { status: 400 })
    }

    const entry = await prisma.cashEntry.create({
      data: {
        direction: direction === "in" ? "in" : "out",
        amount: Number(amount),
        reason: reason.trim(),
        agentId: session.agentId,
      },
    })

    return NextResponse.json(entry)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
