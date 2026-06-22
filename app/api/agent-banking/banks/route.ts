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

    const bank = await prisma.bank.create({
      data: {
        id: id.toLowerCase(),
        name,
        floatBalance: Number(floatBalance) || 0,
        threshold: Number(threshold) || 0,
      },
    })

    return NextResponse.json(bank)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message?.includes("Forbidden") ? 403 : error.message?.includes("Unauthorized") ? 401 : 400 }
    )
  }
}
