import { AdminSidebar } from "./admin-sidebar"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background">
      <AdminSidebar />
      <main className="md:ml-64 p-6 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {children}
        </div>
      </main>
    </div>
  )
}
