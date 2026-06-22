import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, enforceAdmin } from "@/lib/auth-api"

export async function PUT(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { id, threshold, active } = await req.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Network ID is required" }, { status: 400 })
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

    const updated = await prisma.network.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
