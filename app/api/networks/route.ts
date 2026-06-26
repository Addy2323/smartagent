import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, enforceAdmin } from "@/lib/auth-api"

export async function GET() {
  try {
    // Secure the GET endpoint
    await getAuthSession()

    const networks = await prisma.network.findMany({
      include: { tiers: { orderBy: { min: "asc" } } },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(networks)
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

    const { name, code, floatBalance, threshold } = await req.json()

    // Input Validation
    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return NextResponse.json({ error: "Network name is required" }, { status: 400 })
    }
    if (!code || typeof code !== "string" || code.trim().length < 1) {
      return NextResponse.json({ error: "Network code is required" }, { status: 400 })
    }
    if (floatBalance === undefined || isNaN(Number(floatBalance)) || Number(floatBalance) < 0) {
      return NextResponse.json({ error: "Float balance must be a non-negative number" }, { status: 400 })
    }
    if (threshold === undefined || isNaN(Number(threshold)) || Number(threshold) < 0) {
      return NextResponse.json({ error: "Threshold must be a non-negative number" }, { status: 400 })
    }

    const id = code.trim().toLowerCase().replace(/\s+/g, "-")

    // Check for duplicate network code or ID
    const existing = await prisma.network.findFirst({
      where: {
        OR: [
          { id },
          { code: code.trim() }
        ]
      }
    })
    if (existing) {
      return NextResponse.json({ error: "A network with this code or ID already exists" }, { status: 409 })
    }

    // Create network and add generic commission tiers by default
    const newNetwork = await prisma.$transaction(async (tx) => {
      const net = await tx.network.create({
        data: {
          id,
          name: name.trim(),
          code: code.trim(),
          floatBalance: Number(floatBalance),
          threshold: Number(threshold),
          active: true,
        },
      })

      // Default bands:
      const bands = [
        [1000, 4999, 110, 130],
        [5000, 9999, 220, 250],
        [10000, 19999, 330, 400],
        [20000, 49999, 520, 600],
        [50000, 99999, 780, 900],
        [100000, 499999, 1300, 1600],
        [500000, 3000000, 2400, 3000],
      ]

      await tx.commissionTier.createMany({
        data: bands.map(([min, max, dep, wd]) => ({
          networkId: id,
          min,
          max,
          deposit: dep,
          withdrawal: wd,
        })),
      })

      return net
    })

    return NextResponse.json(newNetwork)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { id, name, code } = await req.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Network ID is required" }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 1) {
        return NextResponse.json({ error: "Name must be a valid string" }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (code !== undefined) {
      if (typeof code !== "string" || code.trim().length < 1) {
        return NextResponse.json({ error: "Code must be a valid string" }, { status: 400 })
      }
      updateData.code = code.trim()
    }

    const updated = await prisma.network.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Network ID is required" }, { status: 400 })
    }

    // Check if network is referenced in transactions or float topups
    const hasTxs = await prisma.transaction.findFirst({ where: { networkId: id } })
    if (hasTxs) {
      return NextResponse.json({ error: "Cannot delete network because it has associated transaction records" }, { status: 400 })
    }

    const hasTopups = await prisma.floatTopup.findFirst({ where: { networkId: id } })
    if (hasTopups) {
      return NextResponse.json({ error: "Cannot delete network because it has associated float top-up records" }, { status: 400 })
    }

    await prisma.network.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Network deleted successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
