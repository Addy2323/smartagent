import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth-api"

export async function POST(req: Request) {
  try {
    const session = await getAuthSession()
    const { bankId, portalBalance, notes } = await req.json()

    if (!bankId || portalBalance === undefined || isNaN(Number(portalBalance))) {
      return NextResponse.json({ error: "Bank ID and valid portal balance are required" }, { status: 400 })
    }

    const bank = await prisma.bank.findUnique({
      where: { id: bankId },
    })

    if (!bank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 })
    }

    const systemBalance = bank.floatBalance
    const discrepancy = Number(portalBalance) - systemBalance

    return NextResponse.json({
      success: true,
      bankId,
      portalBalance: Number(portalBalance),
      systemBalance,
      discrepancy,
      message: discrepancy === 0 ? "Float is fully reconciled!" : `Discrepancy of TZS ${discrepancy.toLocaleString()} identified.`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
