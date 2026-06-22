import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { hashString } from "@/lib/crypto"
import { signToken } from "@/lib/token"

// Access the global OTP cache
const otpCache = (globalThis as any).otpCache || new Map<string, { otp: string; expires: number }>()
if (process.env.NODE_ENV !== "production") {
  ;(globalThis as any).otpCache = otpCache
}

export async function POST(req: Request) {
  try {
    const { phone, otp, newPassword, newPin } = await req.json()

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone number and OTP code are required" }, { status: 400 })
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/\D/g, "")
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "255" + normalizedPhone.substring(1)
    } else if (!normalizedPhone.startsWith("255") && normalizedPhone.length === 9) {
      normalizedPhone = "255" + normalizedPhone
    }

    // Check OTP cache
    const cachedData = otpCache.get(normalizedPhone)

    if (!cachedData) {
      return NextResponse.json({ error: "No active OTP request found for this phone number" }, { status: 400 })
    }

    // Check expiry
    if (Date.now() > cachedData.expires) {
      otpCache.delete(normalizedPhone)
      return NextResponse.json({ error: "OTP has expired. Please request a new one" }, { status: 400 })
    }

    // Verify OTP code match
    if (cachedData.otp !== otp.trim()) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
    }

    // If newPassword and newPin are provided, perform the update and login
    if (newPassword && newPin) {
      // Find the agent to update
      const agent = await prisma.agent.findFirst({
        where: { phone: normalizedPhone, active: true },
      })

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 })
      }

      // Update password and PIN
      const updatedAgent = await prisma.agent.update({
        where: { id: agent.id },
        data: {
          password: hashString(newPassword),
          pin: hashString(newPin),
        },
      })

      // Clean up OTP cache
      otpCache.delete(normalizedPhone)

      // Sign authentication token
      const token = signToken({ agentId: updatedAgent.id, role: updatedAgent.role })

      // Set cookie
      const cookieStore = await cookies()
      cookieStore.set("sa_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      })

      const { password: _, pin: __, ...safeAgent } = updatedAgent
      return NextResponse.json({
        success: true,
        message: "Credentials updated and logged in successfully",
        agent: safeAgent,
      })
    }

    // If only verifying OTP
    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
    })
  } catch (error: any) {
    console.error("[VERIFY OTP ERROR]", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
