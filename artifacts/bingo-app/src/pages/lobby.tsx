import {
  useGetCurrentGame,
  useGetSettings,
  useBuyTicket,
  useGetGameCartelas,
  getGetCurrentGameQueryKey,
} from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useGameSocket } from '@/hooks/use-game-socket'
import { Users, Timer, Trophy, Ticket, AlertTriangle, ChevronRight, X } from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'

const TOTAL_CARTELAS = 400
const MAX_PER_PLAYER = 2

// Deterministic card preview (mirrors backend logic)
function createRng(seed: number) {
  let s = seed >>> 0
  return function () {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const COLUMN_RANGES = [[1,15],[16,30],[31,45],[46,60],[61,75]]

function generateCardForCartela(n: number): number[][] {
  const rng = createRng((n * 2654435761) >>> 0)
  const cols: number[][] = COLUMN_RANGES.map(([min, max]) => {
    const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    return seededShuffle(pool, rng).slice(0, 5)
  })
  const grid = Array.from({ length: 5 }, (_, r) => cols.map((col) => col[r]))
  grid[2][2] = 0
  return grid
}

function CartelaPreview({ cartelaNumber }: { cartelaNumber: number }) {
  const card = useMemo(() => generateCardForCartela(cartelaNumber), [cartelaNumber])
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-5 gap-0.5 mb-1">
        {['B','I','N','G','O'].map(l => (
          <div key={l} className="text-center text-xs font-black text-primary">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-0.5">
        {card.map((row, ri) =>
          row.map((num, ci) => {
            const isFree = ri === 2 && ci === 2
            return (
              <div
                key={`${ri}-${ci}`}
                className={`aspect-square flex items-center justify-center text-[10px] font-bold font-mono rounded border ${
                  isFree
                    ? 'bg-secondary/30 border-secondary text-secondary text-[8px]'
                    : 'bg-black/40 border-white/10 text-muted-foreground'
                }`}
              >
                {isFree ? '★' : num}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function Lobby() {
  const [, setLocation] = useLocation()
  const { data: game, isLoading: gameLoading } = useGetCurrentGame()
  const { data: settings } = useGetSettings()
  const { data: cartelaData, refetch: refetchCartelas } = useGetGameCartelas(game?.id ?? 0, {
    query: { enabled: !!game?.id && (game?.status === 'waiting' || game?.status === 'starting') },
  })
  const buyTicket = useBuyTicket()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { playerCount } = useGameSocket(game?.id)
  const displayPlayers = playerCount > (game?.playerCount || 0) ? playerCount : (game?.playerCount || 0)

  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  useEffect(() => {
    if (game?.status === 'starting' && game.startingAt) {
      const end = new Date(game.startingAt).getTime()
      const tick = () => {
        const diff = Math.max(0, Math.floor((end - Date.now()) / 1000))
        setTimeLeft(diff)
        if (diff <= 0) clearInterval(interval)
      }
      tick()
      const interval = setInterval(tick, 1000)
      return () => clearInterval(interval)
    } else {
      setTimeLeft(null)
    }
  }, [game?.status, game?.startingAt])

  // Cartela selection state
  const [selected, setSelected] = useState<number[]>([])
  const [previewCartela, setPreviewCartela] = useState<number | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  const takenSet = useMemo(
    () => new Set(cartelaData?.takenCartelas ?? []),
    [cartelaData]
  )

  const toggleSelect = (n: number) => {
    if (takenSet.has(n)) return
    setSelected(prev => {
      if (prev.includes(n)) return prev.filter(x => x !== n)
      if (prev.length >= MAX_PER_PLAYER) {
        toast({ title: 'Maximum 2 cartelas per game', variant: 'destructive' })
        return prev
      }
      return [...prev, n]
    })
  }

  const handlePurchase = async () => {
    if (!game || selected.length === 0) return
    setPurchasing(true)
    try {
      for (const cartelaNumber of selected) {
        await new Promise<void>((resolve, reject) => {
          buyTicket.mutate(
            { id: game.id, data: { cartelaNumber } },
            {
              onSuccess: () => resolve(),
              onError: (err: any) => reject(err),
            }
          )
        })
      }
      queryClient.invalidateQueries({ queryKey: getGetCurrentGameQueryKey() })
      toast({ title: `${selected.length} cartela${selected.length > 1 ? 's' : ''} purchased!` })
      setLocation(`/game/${game.id}`)
    } catch (err: any) {
      toast({
        title: 'Purchase failed',
        description: err?.message || 'Insufficient balance or cartela taken',
        variant: 'destructive',
      })
    } finally {
      setPurchasing(false)
    }
  }

  if (gameLoading) {
    return <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-96 w-full" /></div>
  }

  if (game?.status === 'active') {
    return (
      <div className="space-y-6 text-center pt-10">
        <div className="mx-auto w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center glow-secondary animate-pulse">
          <Trophy className="h-12 w-12 text-secondary" />
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-widest">Game in Progress!</h2>
        <p className="text-muted-foreground text-lg">A round is currently active.</p>
        <Link href={`/game/${game.id}`}>
          <Button size="lg" variant="secondary" className="w-full mt-4 text-xl">Watch Live</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 pt-4 pb-32">
      <div className="text-center space-y-1 mb-2">
        <h1 className="text-4xl font-black text-primary glow-text uppercase tracking-widest">Neon Bingo</h1>
        <p className="text-muted-foreground font-mono text-sm">
          {game?.status === 'starting' ? '🟡 Round locking in — buy now!' : 'Next round starting soon'}
        </p>
      </div>

      {/* Starting countdown banner */}
      {game?.status === 'starting' && timeLeft !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-xl p-4 border border-secondary/50 text-center space-y-1"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-secondary">Game starts in</div>
          <div className="text-5xl font-black font-mono text-secondary glow-secondary tabular-nums">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-muted-foreground">You can still buy cartelas below</div>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-3 rounded-xl text-center space-y-1">
          <Users className="w-5 h-5 text-secondary mx-auto" />
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Players</div>
          <div className="text-xl font-mono text-white">{displayPlayers}</div>
        </div>
        <div className="glass-panel p-3 rounded-xl text-center space-y-1">
          <Trophy className="w-5 h-5 text-accent mx-auto" />
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prize</div>
          <div className="text-xl font-mono text-white">${game?.prizePool?.toFixed(2) || '0.00'}</div>
        </div>
        <div className="glass-panel p-3 rounded-xl text-center space-y-1">
          <Timer className="w-5 h-5 text-primary mx-auto animate-pulse" />
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Time</div>
          <div className="text-xl font-mono text-white">
            {timeLeft !== null
              ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`
              : '--:--'}
          </div>
        </div>
      </div>

      {/* Cartela picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Pick Your Cartelas
          </div>
          <div className="text-xs text-muted-foreground">
            <span className={selected.length > 0 ? 'text-primary font-bold' : ''}>{selected.length}</span>
            /{MAX_PER_PLAYER} selected
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/30 border border-primary inline-block"/><span>Selected</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/5 border border-white/10 inline-block"/><span>Available</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-black/60 border border-white/5 opacity-40 inline-block"/><span>Taken</span></span>
        </div>

        <div className="glass-panel rounded-xl p-2 max-h-[40vh] overflow-y-auto">
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: TOTAL_CARTELAS }, (_, i) => i + 1).map((n) => {
              const isTaken = takenSet.has(n)
              const isSelected = selected.includes(n)
              return (
                <button
                  key={n}
                  onClick={() => toggleSelect(n)}
                  onLongPress={undefined}
                  disabled={isTaken}
                  className={`
                    aspect-square flex items-center justify-center text-[10px] font-bold font-mono rounded transition-all
                    ${isTaken
                      ? 'bg-black/60 text-white/15 border border-white/5 cursor-not-allowed'
                      : isSelected
                        ? 'bg-primary/30 text-primary border-2 border-primary glow-primary scale-105'
                        : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:text-white active:scale-95'
                    }
                  `}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected cartela previews */}
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-3"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                Preview
              </div>
              <div className={`grid gap-3 ${selected.length === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-[200px] mx-auto'}`}>
                {selected.map(n => (
                  <div key={n} className="glass-panel rounded-xl p-3 border border-primary/20 relative">
                    <button
                      onClick={() => toggleSelect(n)}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <div className="text-xs font-bold text-primary tracking-widest mb-2">
                      Cartela #{n}
                    </div>
                    <CartelaPreview cartelaNumber={n} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky purchase bar */}
      <div className="fixed bottom-16 left-0 right-0 px-4 z-40">
        <div className="max-w-lg mx-auto">
          <AnimatePresence>
            {selected.length > 0 && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 20 }}
              >
                <Button
                  size="lg"
                  className="w-full h-14 text-lg tracking-widest shadow-2xl glow-primary"
                  onClick={handlePurchase}
                  disabled={purchasing}
                >
                  <Ticket className="mr-2 h-5 w-5" />
                  {purchasing ? 'Purchasing…' : `Buy ${selected.length} Cartela${selected.length > 1 ? 's' : ''} • $${((game?.ticketPrice ?? 0) * selected.length).toFixed(2)}`}
                  {!purchasing && <ChevronRight className="ml-2 h-5 w-5" />}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {selected.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-2 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Tap a cartela number above to select it
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
