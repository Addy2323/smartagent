"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftRight,
  Banknote,
  Coins,
  FileBarChart,
  HandCoins,
  LayoutDashboard,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
  LogOut,
  Landmark,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useData } from "@/lib/store"

const operations = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "Commissions", url: "/commissions", icon: HandCoins },
]

const agentBanking = [
  { title: "Bank Dashboard", url: "/agent-banking", icon: LayoutDashboard },
  { title: "Bank Transactions", url: "/agent-banking/transactions", icon: ArrowLeftRight },
  { title: "Bank Float", url: "/agent-banking/float", icon: Wallet },
  { title: "Bank Commissions", url: "/agent-banking/commissions", icon: HandCoins },
]

const treasury = [
  { title: "Float", url: "/float", icon: Wallet },
  { title: "Cash", url: "/cash", icon: Banknote },
  { title: "Transfers", url: "/transfers", icon: ArrowLeftRight },
]

const finance = [
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Debts", url: "/debts", icon: Coins },
  { title: "Profit & Loss", url: "/profit-loss", icon: TrendingUp },
  { title: "Reports", url: "/reports", icon: FileBarChart },
]

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string
  items: { title: string; url: string; icon: typeof LayoutDashboard }[]
  pathname: string
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                isActive={pathname === item.url}
                tooltip={item.title}
                render={
                  <Link
                    href={item.url}
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false)
                      }
                    }}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { role, currentAgent, logout } = useData()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <TrendingUp className="size-4" />
          </div>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">SmartAgent</span>
            <span className="text-xs text-sidebar-foreground/60">Manager</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavSection label="Operations" items={operations} pathname={pathname} />
        <NavSection label="Agent Banking" items={agentBanking} pathname={pathname} />
        <NavSection label="Treasury" items={treasury} pathname={pathname} />
        <NavSection label="Finance" items={finance} pathname={pathname} />
        {role === "super_admin" && (
          <NavSection
            label="Admin"
            items={[{ title: "Settings", url: "/settings", icon: Settings }]}
            pathname={pathname}
          />
        )}
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={false}
            render={
              <div className="flex items-center gap-2 px-1 py-1.5 cursor-pointer hover:bg-sidebar-accent rounded-lg transition-colors select-none">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
                    {currentAgent
                      ? currentAgent.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                      : "SA"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid leading-tight group-data-[collapsible=icon]:hidden text-left">
                  <span className="truncate text-sm font-medium">{currentAgent?.name || "Loading..."}</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {role === "super_admin" ? "Super Admin" : "Agent"}
                  </span>
                </div>
              </div>
            }
          />
          <DropdownMenuContent className="w-52" align="start" side="right" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs font-semibold text-foreground">{currentAgent?.name}</span>
                  <span className="text-[10px] text-muted-foreground">{currentAgent?.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2 cursor-pointer text-xs font-medium">
              <LogOut className="size-3.5" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
