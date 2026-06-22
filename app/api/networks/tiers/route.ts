import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, enforceAdmin } from "@/lib/auth-api"

export async function PUT(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { id, deposit, withdrawal } = await req.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Commission Tier ID is required" }, { status: 400 })
    }

    if (deposit === undefined || isNaN(Number(deposit)) || Number(deposit) < 0) {
      return NextResponse.json({ error: "Deposit commission must be a non-negative number" }, { status: 400 })
    }

    if (withdrawal === undefined || isNaN(Number(withdrawal)) || Number(withdrawal) < 0) {
      return NextResponse.json({ error: "Withdrawal commission must be a non-negative number" }, { status: 400 })
    }

    const updated = await prisma.commissionTier.update({
      where: { id },
      data: {
        deposit: Number(deposit),
        withdrawal: Number(withdrawal),
      },
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
