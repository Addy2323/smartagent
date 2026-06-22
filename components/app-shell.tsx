"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Wifi, WifiOff, Download, Loader2 } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useData } from "@/lib/store"
import { cn } from "@/lib/utils"

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/commissions": "Commissions",
  "/float": "Float Management",
  "/cash": "Cash Management",
  "/expenses": "Expenses",
  "/debts": "Debts",
  "/profit-loss": "Profit & Loss",
  "/reports": "Reports",
  "/settings": "Settings",
  "/agent-banking": "Bank Dashboard",
  "/agent-banking/transactions": "Bank Transactions",
  "/agent-banking/float": "Bank Float",
  "/agent-banking/commissions": "Bank Commissions",
  "/transfers": "Cash & Float Transfers",
}

function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstallable(false)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`PWA install outcome: ${outcome}`)
    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  if (!isInstallable) return null

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleInstallClick}
      className="h-7 gap-1 px-2 sm:gap-1.5 sm:px-2.5 text-xs text-primary border-primary/20 hover:bg-primary/5 active:scale-95 transition-all"
      aria-label="Install App"
    >
      <Download className="size-3.5 animate-bounce" style={{ animationDuration: "2s" }} />
      <span className="hidden sm:inline">Install App</span>
    </Button>
  )
}

function OfflineSwitcher() {
  const { isOffline, setOffline } = useData()
  return (
    <Button
      size="sm"
      variant={isOffline ? "destructive" : "ghost"}
      onClick={() => setOffline(!isOffline)}
      className="h-7 gap-1.5 px-2.5 text-xs"
    >
      {isOffline ? (
        <>
          <WifiOff className="size-3.5 text-white" />
          <span className="hidden sm:inline">Offline</span>
        </>
      ) : (
        <>
          <Wifi className="size-3.5 text-success" />
          <span className="hidden sm:inline">Online</span>
        </>
      )}
    </Button>
  )
}



export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentAgent, loading } = useData()
  const title = titles[pathname] ?? "SmartAgent Manager"

  useEffect(() => {
    if (!loading) {
      if (!currentAgent && pathname !== "/") {
        router.push("/")
      } else if (currentAgent && pathname === "/login") {
        router.push("/")
      }
    }
  }, [currentAgent, loading, pathname, router])

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-medium">Initializing secure gateway...</span>
      </div>
    )
  }

  if (!currentAgent || pathname === "/login") {
    return <main className="flex min-h-screen w-full flex-col bg-background">{children}</main>
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <h1 className="text-base font-semibold text-balance">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <InstallAppButton />
            <OfflineSwitcher />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

