import * as React from "react"
import { Link, useLocation } from "wouter"
import { Home, Users, Gamepad2, CreditCard, Banknote, Settings, Bell, LogOut, Trophy } from "lucide-react"
import { logout } from "@/lib/auth"

export function AdminSidebar() {
  const [location] = useLocation()

  const navItems = [
    { href: "/admin", icon: Home, label: "Dashboard" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/games", icon: Gamepad2, label: "Games" },
    { href: "/admin/deposits", icon: CreditCard, label: "Deposits" },
    { href: "/admin/withdrawals", icon: Banknote, label: "Withdrawals" },
    { href: "/admin/announcements", icon: Bell, label: "Announcements" },
    { href: "/admin/leaderboard", icon: Trophy, label: "Leaderboard" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <div className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 glass-panel border-r border-white/10 bg-background/95 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center glow-primary">
          <Gamepad2 className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-black tracking-widest text-primary glow-text uppercase">CASINO ADMIN</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold tracking-wide uppercase text-sm ${
                  isActive 
                    ? "bg-primary/20 text-primary border border-primary/50 glow-primary" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-bold tracking-wide uppercase text-sm text-destructive hover:bg-destructive/20 hover:glow-destructive w-full"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  )
}
