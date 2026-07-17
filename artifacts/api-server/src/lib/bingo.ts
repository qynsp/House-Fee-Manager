// Bingo card generation and validation utilities

// B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
const COLUMN_RANGES = [
  [1, 15],   // B
  [16, 30],  // I
  [31, 45],  // N
  [46, 60],  // G
  [61, 75],  // O
];

export const TOTAL_CARTELAS = 400;

// Seeded PRNG (mulberry32) — deterministic per cartela number
function createRng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCard(rng: () => number): number[][] {
  const cols: number[][] = [];
  for (let col = 0; col < 5; col++) {
    const [min, max] = COLUMN_RANGES[col];
    const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const shuffled = seededShuffle(pool, rng);
    cols.push(shuffled.slice(0, 5));
  }
  // Transpose col[col][row] → row[row][col]
  const transposed: number[][] = [];
  for (let row = 0; row < 5; row++) {
    transposed.push(cols.map((col) => col[row]));
  }
  transposed[2][2] = 0; // FREE center
  return transposed;
}

/** Generate a deterministic bingo card for cartela number 1-400 */
export function generateCardForCartela(cartelaNumber: number): number[][] {
  const rng = createRng(cartelaNumber * 2654435761); // large prime multiplier for spacing
  return buildCard(rng);
}

/** Random card (legacy / fallback) */
export function generateCard(): number[][] {
  const rng = createRng(Math.floor(Math.random() * 0xffffffff));
  return buildCard(rng);
}

export type WinPattern = "horizontal" | "vertical" | "diagonal" | "four_corners" | "x_pattern" | "full_house";

interface ValidationResult {
  valid: boolean;
  pattern: WinPattern | null;
}

export function validateBingo(card: number[][], drawnNumbers: number[]): ValidationResult {
  const drawn = new Set(drawnNumbers);

  function isMarked(row: number, col: number): boolean {
    if (row === 2 && col === 2) return true; // FREE
    return drawn.has(card[row][col]);
  }

  // Horizontal
  for (let row = 0; row < 5; row++) {
    if ([0, 1, 2, 3, 4].every((col) => isMarked(row, col))) {
      return { valid: true, pattern: "horizontal" };
    }
  }

  // Vertical
  for (let col = 0; col < 5; col++) {
    if ([0, 1, 2, 3, 4].every((row) => isMarked(row, col))) {
      return { valid: true, pattern: "vertical" };
    }
  }

  // Diagonal (top-left to bottom-right)
  if ([0, 1, 2, 3, 4].every((i) => isMarked(i, i))) {
    return { valid: true, pattern: "diagonal" };
  }
  // Diagonal (top-right to bottom-left)
  if ([0, 1, 2, 3, 4].every((i) => isMarked(i, 4 - i))) {
    return { valid: true, pattern: "diagonal" };
  }

  // Four corners
  if (isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4)) {
    return { valid: true, pattern: "four_corners" };
  }

  // X pattern (both diagonals)
  const diag1 = [0, 1, 2, 3, 4].every((i) => isMarked(i, i));
  const diag2 = [0, 1, 2, 3, 4].every((i) => isMarked(i, 4 - i));
  if (diag1 && diag2) {
    return { valid: true, pattern: "x_pattern" };
  }

  // Full house
  let allMarked = true;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (!isMarked(row, col)) {
        allMarked = false;
        break;
      }
    }
  }
  if (allMarked) return { valid: true, pattern: "full_house" };

  return { valid: false, pattern: null };
}

export function drawNextNumber(drawnNumbers: number[]): number | null {
  const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  const available = allNumbers.filter((n) => !drawnNumbers.includes(n));
  if (available.length === 0) return null;
  return shuffle(available)[0];
}
