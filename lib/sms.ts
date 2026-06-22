export interface SendSMSParams {
  recipient: string
  message: string
}

export async function sendSMS({ recipient, message }: SendSMSParams): Promise<{ success: boolean; data?: any; error?: string }> {
  const isEnabled = process.env.SMS_ENABLED === "true"
  const apiKey = process.env.MESEJI_API_KEY
  const senderId = process.env.MESEJI_SENDER_ID || "LOTUSRISE"

  console.log(`[SMS SENDER] Preparing to send to ${recipient}: "${message}"`)

  if (!isEnabled) {
    console.log(`[SMS SENDER] [MOCK SEND] SMS_ENABLED is false. Message: "${message}"`)
    return { success: true, data: { mock: true, message: "Mock SMS sent successfully" } }
  }

  if (!apiKey) {
    console.error("[SMS SENDER] SMS_ENABLED is true, but MESEJI_API_KEY is not defined.")
    return { success: false, error: "Meseji API key is not configured" }
  }

  // Normalize phone number: strip non-digits and ensure Tanzanian country code '255' prefix
  let normalizedRecipient = recipient.replace(/\D/g, "")
  if (normalizedRecipient.startsWith("0")) {
    normalizedRecipient = "255" + normalizedRecipient.substring(1)
  } else if (!normalizedRecipient.startsWith("255") && normalizedRecipient.length === 9) {
    normalizedRecipient = "255" + normalizedRecipient
  }

  // Meseji API expects: sender_id, message, contacts (comma-separated string)
  const payload = {
    sender_id: senderId,
    message: message,
    contacts: normalizedRecipient,
  }

  console.log("[SMS SENDER] Request payload:", JSON.stringify(payload))

  try {
    const response = await fetch("https://meseji.co.tz/api/v1/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)

    console.log(`[SMS SENDER] API response status: ${response.status}`, JSON.stringify(data))

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Meseji server error: ${response.status}`
      console.error("[SMS SENDER] Meseji API error response:", errorMsg, data)
      return {
        success: false,
        error: errorMsg,
      }
    }

    console.log("[SMS SENDER] SMS sent successfully via Meseji API:", data)
    return { success: true, data }
  } catch (error: any) {
    console.error("[SMS SENDER] Network error sending SMS via Meseji:", error)
    return { success: false, error: error.message || "Failed to communicate with Meseji API" }
  }
}
