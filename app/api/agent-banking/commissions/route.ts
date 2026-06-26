import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, enforceAdmin } from "@/lib/auth-api"

export async function GET(req: Request) {
  try {
    const session = await getAuthSession()
    const { searchParams } = new URL(req.url)
    const bankId = searchParams.get("bankId")

    const where = bankId ? { bankId } : {}
    const tiers = await prisma.bankCommissionTier.findMany({
      where,
      orderBy: [
        { bankId: "asc" },
        { service: "asc" },
        { min: "asc" },
      ],
    })
    return NextResponse.json(tiers)
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

    const { bankId, service, min, max, commission } = await req.json()

    if (!bankId || !service || commission === undefined) {
      return NextResponse.json({ error: "Bank ID, Service Type, and Commission are required" }, { status: 400 })
    }

    const tier = await prisma.bankCommissionTier.create({
      data: {
        bankId,
        service,
        min: Number(min) || 0,
        max: Number(max) || 999999999,
        commission: Number(commission),
      },
    })
    return NextResponse.json(tier)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { id, commission, min, max } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "Tier ID is required" }, { status: 400 })
    }

    const updateData: any = {}
    if (commission !== undefined) {
      updateData.commission = Number(commission)
    }
    if (min !== undefined) {
      updateData.min = Number(min)
    }
    if (max !== undefined) {
      updateData.max = Number(max)
    }

    const updated = await prisma.bankCommissionTier.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
