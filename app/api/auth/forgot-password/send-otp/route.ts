import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendSMS } from "@/lib/sms"

// Initialize a hot-reload safe global OTP cache
const otpCache = (globalThis as any).otpCache || new Map<string, { otp: string; expires: number }>()
if (process.env.NODE_ENV !== "production") {
  ;(globalThis as any).otpCache = otpCache
}

export async function POST(req: Request) {
  try {
    const { phone } = await req.json()

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/\D/g, "")
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "255" + normalizedPhone.substring(1)
    } else if (!normalizedPhone.startsWith("255") && normalizedPhone.length === 9) {
      normalizedPhone = "255" + normalizedPhone
    }

    // Check if agent exists with this phone number
    const agent = await prisma.agent.findFirst({
      where: { phone: normalizedPhone, active: true },
    })

    if (!agent) {
      return NextResponse.json(
        { error: "No active agent found with this registered phone number" },
        { status: 404 }
      )
    }

    // Generate a secure 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store in cache with 5-minute expiry
    otpCache.set(normalizedPhone, {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
    })

    const message = `Your SmartAgent verification code is ${otp}. It is valid for 5 minutes.`

    // Send SMS via Meseji helper
    const smsResult = await sendSMS({ recipient: normalizedPhone, message })

    if (!smsResult.success) {
      return NextResponse.json(
        { error: `Failed to send OTP via SMS: ${smsResult.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully to your registered number",
    })
  } catch (error: any) {
    console.error("[SEND OTP ERROR]", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
