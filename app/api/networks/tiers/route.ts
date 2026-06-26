import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, enforceAdmin } from "@/lib/auth-api"

export async function PUT(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { id, deposit, withdrawal, min, max } = await req.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Commission Tier ID is required" }, { status: 400 })
    }

    const updateData: any = {}

    if (deposit !== undefined) {
      if (isNaN(Number(deposit)) || Number(deposit) < 0) {
        return NextResponse.json({ error: "Deposit commission must be a non-negative number" }, { status: 400 })
      }
      updateData.deposit = Number(deposit)
    }

    if (withdrawal !== undefined) {
      if (isNaN(Number(withdrawal)) || Number(withdrawal) < 0) {
        return NextResponse.json({ error: "Withdrawal commission must be a non-negative number" }, { status: 400 })
      }
      updateData.withdrawal = Number(withdrawal)
    }

    if (min !== undefined) {
      if (isNaN(Number(min)) || Number(min) < 0) {
        return NextResponse.json({ error: "Minimum amount must be a non-negative number" }, { status: 400 })
      }
      updateData.min = Number(min)
    }

    if (max !== undefined) {
      if (isNaN(Number(max)) || Number(max) < 0) {
        return NextResponse.json({ error: "Maximum amount must be a non-negative number" }, { status: 400 })
      }
      updateData.max = Number(max)
    }

    if (min !== undefined && max !== undefined && Number(max) < Number(min)) {
      return NextResponse.json({ error: "Maximum amount cannot be less than minimum amount" }, { status: 400 })
    }

    const updated = await prisma.commissionTier.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
