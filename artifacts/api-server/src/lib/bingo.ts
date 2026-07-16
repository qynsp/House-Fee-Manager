// Bingo card generation and validation utilities

// B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
const COLUMN_RANGES = [
  [1, 15],   // B
  [16, 30],  // I
  [31, 45],  // N
  [46, 60],  // G
  [61, 75],  // O
];

function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateCard(): number[][] {
  const card: number[][] = [];
  for (let col = 0; col < 5; col++) {
    const [min, max] = COLUMN_RANGES[col];
    const nums: number[] = [];
    while (nums.length < 5) {
      const n = randRange(min, max);
      if (!nums.includes(n)) nums.push(n);
    }
    card.push(nums);
  }
  // card[col][row] — we need card[row][col] for display
  // Transpose so card[row][col]
  const transposed: number[][] = [];
  for (let row = 0; row < 5; row++) {
    transposed.push(card.map((col) => col[row]));
  }
  // Set center (row=2, col=2) to 0 (FREE)
  transposed[2][2] = 0;
  return transposed;
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
