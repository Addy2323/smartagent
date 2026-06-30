import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, enforceAdmin } from "@/lib/auth-api"

export async function GET() {
  try {
    const session = await getAuthSession()
    const banks = await prisma.bank.findMany({
      include: {
        tiers: true,
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(banks)
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
    enforceAdmin(session.role)

    const { name, id, floatBalance, threshold } = await req.json()

    if (!name || !id) {
      return NextResponse.json({ error: "Bank ID and Name are required" }, { status: 400 })
    }

    const exists = await prisma.bank.findUnique({
      where: { id },
    })

    if (exists) {
      return NextResponse.json({ error: "Bank already exists" }, { status: 400 })
    }

    const bank = await prisma.$transaction(async (tx) => {
      const b = await tx.bank.create({
        data: {
          id: id.toLowerCase().trim(),
          name: name.trim(),
          floatBalance: Number(floatBalance) || 0,
          threshold: Number(threshold) || 0,
        },
      })

      // Default generic bank tiers:
      const defaultTiers = [
        // Deposits
        { service: "deposit", min: 1000, max: 9999, commission: 50 },
        { service: "deposit", min: 10000, max: 99999, commission: 300 },
        { service: "deposit", min: 100000, max: 499999, commission: 700 },
        { service: "deposit", min: 500000, max: 999999999, commission: 1500 },
        // Withdrawals
        { service: "withdrawal", min: 1000, max: 9999, commission: 150 },
        { service: "withdrawal", min: 10000, max: 99999, commission: 700 },
        { service: "withdrawal", min: 100000, max: 499999, commission: 1400 },
        { service: "withdrawal", min: 500000, max: 999999999, commission: 3000 },
        // Flat services
        { service: "balance_inquiry", min: 0, max: 999999999, commission: 100 },
        { service: "mini_statement", min: 0, max: 999999999, commission: 150 },
        { service: "cardless_withdrawal", min: 0, max: 999999999, commission: 800 },
        { service: "account_opening", min: 0, max: 999999999, commission: 1000 },
      ]

      await tx.bankCommissionTier.createMany({
        data: defaultTiers.map((t) => ({
          bankId: b.id,
          service: t.service,
          min: t.min,
          max: t.max,
          commission: t.commission,
        })),
      })

      return b
    })

    return NextResponse.json(bank)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message?.includes("Forbidden") ? 403 : error.message?.includes("Unauthorized") ? 401 : 400 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { id, threshold, active, name, floatBalance } = await req.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Bank ID is required" }, { status: 400 })
    }
    
    const updateData: any = {}
    if (threshold !== undefined) {
      if (isNaN(Number(threshold)) || Number(threshold) < 0) {
        return NextResponse.json({ error: "Threshold must be a non-negative number" }, { status: 400 })
      }
      updateData.threshold = Number(threshold)
    }
    if (active !== undefined) {
      if (typeof active !== "boolean") {
        return NextResponse.json({ error: "Active status must be a boolean" }, { status: 400 })
      }
      updateData.active = active
    }
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 1) {
        return NextResponse.json({ error: "Name must be a valid string" }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (floatBalance !== undefined) {
      if (isNaN(Number(floatBalance)) || Number(floatBalance) < 0) {
        return NextResponse.json({ error: "Float balance must be a non-negative number" }, { status: 400 })
      }
      updateData.floatBalance = Number(floatBalance)
    }

    const updated = await prisma.bank.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message?.includes("Forbidden") ? 403 : error.message?.includes("Unauthorized") ? 401 : 400 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Bank ID is required" }, { status: 400 })
    }

    // Check if bank is referenced in transactions or float topups
    const hasTxs = await prisma.bankTransaction.findFirst({ where: { bankId: id } })
    if (hasTxs) {
      return NextResponse.json({ error: "Cannot delete bank partner because it has associated transaction records" }, { status: 400 })
    }

    const hasTopups = await prisma.bankFloatTopup.findFirst({ where: { bankId: id } })
    if (hasTopups) {
      return NextResponse.json({ error: "Cannot delete bank partner because it has associated float top-up records" }, { status: 400 })
    }

    await prisma.bank.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Bank partner deleted successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

