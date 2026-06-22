"use client"

import Link from "next/link"
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useData } from "@/lib/store"

export default function UnauthorizedPage() {
  const { logout } = useData()

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12">
      {/* Background radial soft gradient for premium aesthetic */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08),transparent_50%)]" />

      <div className="relative mx-auto flex max-w-md w-full flex-col items-center text-center">
        {/* Animated Icon Container */}
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20 transition-all duration-500 hover:scale-105">
          {/* Subtle pulse animation behind the shield */}
          <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-destructive/10 opacity-75 duration-1000" />
          <ShieldAlert className="relative h-12 w-12 stroke-[1.5]" />
        </div>

        {/* Access Denied Text */}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Access Denied
        </h1>
        
        {/* Subtitle */}
        <p className="mt-4 text-base text-muted-foreground">
          You do not have the required permissions to access this page. This area is reserved for Super Admin operators only.
        </p>

        {/* Info Box */}
        <div className="mt-6 w-full rounded-xl border bg-card/50 p-4 text-sm text-muted-foreground backdrop-blur-md">
          If you believe this is an error, please contact your administrator to verify your profile credentials and security policy.
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:w-full sm:flex-row sm:justify-center">
          <Button
            asChild
            variant="default"
            className="gap-2 font-medium shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-primary/30"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          
          <Button
            variant="outline"
            onClick={logout}
            className="gap-2 font-medium border-muted-foreground/20 transition-all duration-300 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <LogOut className="h-4 w-4" />
            Switch Profile
          </Button>
        </div>
      </div>
    </div>
  )
}
