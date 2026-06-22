import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  tone?: "default" | "success" | "destructive" | "warning"
}

const toneMap = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning-foreground",
} as const

export function StatCard({ label, value, icon: Icon, hint, tone = "default" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", toneMap[tone])}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}
