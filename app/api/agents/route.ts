import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, enforceAdmin } from "@/lib/auth-api"
import { hashString } from "@/lib/crypto"

export async function GET() {
  try {
    let session = null
    try {
      session = await getAuthSession()
    } catch (e) {
      // Session cookie is missing or invalid
    }

    if (!session) {
      // Return public info only for login profile selector
      const publicAgents = await prisma.agent.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
        },
      })
      return NextResponse.json(publicAgents)
    }

    const agents = await prisma.agent.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly EXCLUDE password and pin hashes from API responses
      },
    })
    return NextResponse.json(agents)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { name, email, phone, role, password, pin } = await req.json()

    // Input validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Agent name must be at least 2 characters" }, { status: 400 })
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 })
    }
    if (!password || typeof password !== "string" || password.trim().length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
    }
    if (!pin || typeof pin !== "string" || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 })
    }

    // Check for duplicate email
    const existingAgent = await prisma.agent.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existingAgent) {
      return NextResponse.json({ error: "An agent with this email already exists" }, { status: 409 })
    }

    const newAgent = await prisma.agent.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role === "super_admin" ? "super_admin" : "agent",
        active: true,
        password: hashString(password.trim()),
        pin: hashString(pin.trim()),
        phone: phone ? phone.replace(/\D/g, "") : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(newAgent)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAuthSession()
    enforceAdmin(session.role)

    const { id, name, email, phone, role, active } = await req.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }

    const updateData: any = {}

    if (active !== undefined) {
      if (typeof active !== "boolean") {
        return NextResponse.json({ error: "Active status must be a boolean" }, { status: 400 })
      }
      updateData.active = active
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json({ error: "Agent name must be at least 2 characters" }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json({ error: "A valid email address is required" }, { status: 400 })
      }
      // Check duplicate email
      const existing = await prisma.agent.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          NOT: { id }
        }
      })
      if (existing) {
        return NextResponse.json({ error: "An agent with this email already exists" }, { status: 409 })
      }
      updateData.email = email.trim().toLowerCase()
    }

    if (phone !== undefined) {
      const normalizedPhone = phone ? phone.replace(/\D/g, "") : null
      if (normalizedPhone) {
        // Validate phone uniqueness
        const existing = await prisma.agent.findFirst({
          where: {
            phone: normalizedPhone,
            NOT: { id }
          }
        })
        if (existing) {
          return NextResponse.json({ error: "An agent with this phone number already exists" }, { status: 409 })
        }
      }
      updateData.phone = normalizedPhone
    }

    if (role !== undefined) {
      if (role !== "super_admin" && role !== "agent") {
        return NextResponse.json({ error: "Invalid role value" }, { status: 400 })
      }
      updateData.role = role
    }

    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(updatedAgent)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
