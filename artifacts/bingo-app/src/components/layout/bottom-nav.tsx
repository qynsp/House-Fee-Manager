import * as React from "react"
import { Link, useLocation } from "wouter"
import { Home, Ticket, Wallet, Trophy, User, Zap } from "lucide-react"

export function BottomNav() {
  const [location] = useLocation()

  const navItems = [
    { href: "/", icon: Home, label: "Lobby" },
    { href: "/tickets", icon: Ticket, label: "Tickets" },
    { href: "/wallet", icon: Wallet, label: "Wallet" },
    { href: "/leaderboard", icon: Trophy, label: "Leaders" },
    { href: "/stats", icon: User, label: "Stats" },
    { href: "/announcements", icon: Zap, label: "News" },
  ]

  // Hide nav in game or admin
  if (location.startsWith("/game/") || location.startsWith("/admin")) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10 pb-safe px-2 pt-2 bg-background/80">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.href
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex justify-center">
              <div
                className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-all ${
                  isActive ? "text-primary glow-text scale-110" : "text-muted-foreground hover:text-white"
                }`}
              >
                <item.icon className={`h-6 w-6 ${isActive ? "drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" : ""}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
