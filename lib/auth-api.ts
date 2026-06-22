import { headers, cookies } from "next/headers"
import { prisma } from "./prisma"
import { verifyToken } from "./token"

export async function getAuthSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get("sa_session")?.value

  if (!token) {
    throw new Error("Unauthorized: Session cookie is missing")
  }

  const session = verifyToken(token)
  if (!session) {
    throw new Error("Unauthorized: Session has expired or is invalid")
  }

  // Verify agent exists and is active in DB
  const agent = await prisma.agent.findUnique({
    where: { id: session.agentId },
  })

  if (!agent || !agent.active) {
    throw new Error("Unauthorized: Profile is invalid or suspended")
  }

  // Cross-verify with client header for defense-in-depth
  const headersList = await headers()
  const clientAgentId = headersList.get("x-agent-id")
  if (clientAgentId && clientAgentId !== agent.id) {
    throw new Error("Unauthorized: Session identity mismatch")
  }

  return {
    agentId: agent.id,
    role: agent.role,
    agent,
  }
}

export function enforceAdmin(role: string) {
  if (role !== "super_admin") {
    throw new Error("Forbidden: Super Admin access required")
  }
}
