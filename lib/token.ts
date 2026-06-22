import crypto from "crypto"

const SECRET_KEY = process.env.SESSION_SECRET || "smartagent-manager-default-super-secret-key-32chars"

/**
 * Signs a JWT-style token containing agent metadata using HMAC-SHA256.
 */
export function signToken(payload: { agentId: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const data = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours expiry
    })
  ).toString("base64url")

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${header}.${data}`)
    .digest("base64url")

  return `${header}.${data}.${signature}`
}

/**
 * Verifies a JWT-style token's signature and expiry, returning the decoded payload if valid.
 */
export function verifyToken(token: string): { agentId: string; role: string } | null {
  try {
    const [header, data, signature] = token.split(".")
    if (!header || !data || !signature) return null

    const expectedSignature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(`${header}.${data}`)
      .digest("base64url")

    if (signature !== expectedSignature) return null

    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"))
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null // Token has expired
    }

    return { agentId: payload.agentId, role: payload.role }
  } catch (e) {
    return null
  }
}
