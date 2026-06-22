import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { verifyHash } from "@/lib/crypto"
import { signToken } from "@/lib/token"

export async function POST(req: Request) {
  try {
    const { agentId, pin, password } = await req.json()

    if (!agentId) {
      return NextResponse.json({ error: "Agent selection is required" }, { status: 400 })
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    })

    if (!agent || !agent.active) {
      return NextResponse.json({ error: "Agent profile not found or inactive" }, { status: 401 })
    }

    let isValid = false
    if (pin !== undefined) {
      isValid = verifyHash(pin, agent.pin)
    } else if (password !== undefined) {
      isValid = verifyHash(password, agent.password)
    } else {
      return NextResponse.json({ error: "Credentials are required" }, { status: 400 })
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate signed token
    const token = signToken({ agentId: agent.id, role: agent.role })

    // Set HTTPOnly session cookie
    const cookieStore = await cookies()
    cookieStore.set("sa_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    })

    // Return agent profile (excluding password and pin hashes for security)
    const { password: _, pin: __, ...safeAgent } = agent
    return NextResponse.json({ success: true, agent: safeAgent })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
