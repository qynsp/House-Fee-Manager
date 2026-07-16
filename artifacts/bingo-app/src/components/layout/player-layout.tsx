import { BottomNav } from "./bottom-nav"

export function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] pb-24 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background">
      <main className="w-full max-w-md mx-auto p-4 animate-in fade-in zoom-in duration-300">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
