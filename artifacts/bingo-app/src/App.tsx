import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { PlayerLayout } from '@/components/layout/player-layout';
import { AdminLayout } from '@/components/layout/admin-layout';

// Pages
import Lobby from '@/pages/lobby';
import GameLive from '@/pages/game';
import Wallet from '@/pages/wallet';
import Tickets from '@/pages/tickets';
import Leaderboard from '@/pages/leaderboard';
import Stats from '@/pages/stats';
import Announcements from '@/pages/announcements';
import PlayerLogin from '@/pages/login';

// Admin Pages
import AdminLogin from '@/pages/admin/login';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminUsers from '@/pages/admin/users';
import AdminGames from '@/pages/admin/games';
import AdminDeposits from '@/pages/admin/deposits';
import AdminWithdrawals from '@/pages/admin/withdrawals';
import AdminSettings from '@/pages/admin/settings';
import AdminAnnouncements from '@/pages/admin/announcements'
import AdminLeaderboard from '@/pages/admin/leaderboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-black text-primary glow-text uppercase tracking-widest">404</h1>
        <p className="mt-2 text-muted-foreground uppercase tracking-widest font-bold">Signal Lost</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth */}
      <Route path="/login" component={PlayerLogin} />
      <Route path="/admin/login" component={AdminLogin} />

      {/* Admin Area */}
      <Route path="/admin">
        <ProtectedRoute adminOnly>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute adminOnly>
          <AdminLayout>
            <AdminUsers />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/games">
        <ProtectedRoute adminOnly>
          <AdminLayout>
            <AdminGames />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/deposits">
        <ProtectedRoute adminOnly>
          <AdminLayout>
            <AdminDeposits />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/withdrawals">
        <ProtectedRoute adminOnly>
          <AdminLayout>
            <AdminWithdrawals />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute adminOnly>
          <AdminLayout>
            <AdminSettings />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/announcements">
        <ProtectedRoute adminOnly>
          <AdminLayout>
            <AdminAnnouncements />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/leaderboard">
        <ProtectedRoute adminOnly>
          <AdminLayout>
            <AdminLeaderboard />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* Player Area */}
      <Route path="/">
        <ProtectedRoute>
          <PlayerLayout>
            <Lobby />
          </PlayerLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/game/:id">
        {(params) => (
          <ProtectedRoute>
            <PlayerLayout>
              <GameLive params={params} />
            </PlayerLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/wallet">
        <ProtectedRoute>
          <PlayerLayout>
            <Wallet />
          </PlayerLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tickets">
        <ProtectedRoute>
          <PlayerLayout>
            <Tickets />
          </PlayerLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leaderboard">
        <ProtectedRoute>
          <PlayerLayout>
            <Leaderboard />
          </PlayerLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/stats">
        <ProtectedRoute>
          <PlayerLayout>
            <Stats />
          </PlayerLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/announcements">
        <ProtectedRoute>
          <PlayerLayout>
            <Announcements />
          </PlayerLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
