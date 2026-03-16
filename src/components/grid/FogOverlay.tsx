import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGridStore } from '../../store/gridStore';

interface FogOverlayProps {
  rows: number;
  cols: number;
  cellSize?: number;
  visionRadius?: number;
}

function inVision(r: number, c: number, cr: number, cc: number, radius: number) {
  return Math.abs(r - cr) + Math.abs(c - cc) <= radius;
}

function FogOverlayComponent({ rows, cols, cellSize = 28, visionRadius = 3 }: FogOverlayProps) {
  const grid     = useGridStore((s) => s.grid);
  const startPos = useGridStore((s) => s.startPos);
  const endPos   = useGridStore((s) => s.endPos);

  const revealedSet = useMemo(() => {
    const revealed = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const node = grid[r]?.[c];
        if (!node) continue;
        const key = `${r},${c}`;

        if (inVision(r, c, startPos.row, startPos.col, visionRadius)) {
          revealed.add(key); continue;
        }
        if (node.isVisited || node.isPath) {
          revealed.add(key); continue;
        }
        if (r === endPos.row && c === endPos.col) {
          revealed.add(key);
        }
      }
    }
    return revealed;
  }, [grid, rows, cols, startPos, endPos, visionRadius]);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ width: cols * cellSize, height: rows * cellSize }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const key = `${r},${c}`;
          const isRevealed = revealedSet.has(key);
          return (
            <AnimatePresence key={key} initial={false}>
              {!isRevealed && (
                <motion.div
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0.88 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="absolute"
                  style={{
                    top:    r * cellSize,
                    left:   c * cellSize,
                    width:  cellSize,
                    height: cellSize,
                    background: 'radial-gradient(circle, rgba(5,5,15,0.92) 30%, rgba(5,5,15,0.98) 100%)',
                  }}
                />
              )}
            </AnimatePresence>
          );
        }),
      )}
    </div>
  );
}

export const FogOverlay = memo(FogOverlayComponent);
