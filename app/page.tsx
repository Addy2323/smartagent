"use client"

import { useData } from "@/lib/store"
import { Dashboard } from "@/components/dashboard"
import LoginPage from "./login/page"

export default function Page() {
  const { currentAgent } = useData()

  if (!currentAgent) {
    return <LoginPage />
  }

  return <Dashboard />
}

