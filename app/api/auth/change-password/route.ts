import { NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-api"
import { prisma } from "@/lib/prisma"
import { verifyHash, hashString } from "@/lib/crypto"

export async function POST(req: Request) {
  try {
    // Enforce active session
    const session = await getAuthSession()
    const { oldPassword, newPassword, newPin } = await req.json()

    if (!oldPassword) {
      return NextResponse.json({ error: "Current password is required to verify your identity" }, { status: 400 })
    }

    if (!newPassword && !newPin) {
      return NextResponse.json({ error: "Please provide a new password or a new PIN to update" }, { status: 400 })
    }

    // Fetch fresh agent data
    const agent = await prisma.agent.findUnique({
      where: { id: session.agentId },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent profile not found" }, { status: 404 })
    }

    // Verify current password
    const isOldPasswordCorrect = verifyHash(oldPassword, agent.password)
    if (!isOldPasswordCorrect) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 401 })
    }

    // Prepare update data
    const updateData: { password?: string; pin?: string } = {}
    if (newPassword) {
      updateData.password = hashString(newPassword)
    }
    if (newPin) {
      updateData.pin = hashString(newPin)
    }

    // Perform database update
    await prisma.agent.update({
      where: { id: agent.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: "Credentials updated successfully",
    })
  } catch (error: any) {
    console.error("[CHANGE PASSWORD ERROR]", error)
    return NextResponse.json(
      { error: error.message || "An error occurred while updating credentials" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
