import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useGridStore } from '../../store/gridStore';

// ── 实时计时器 ──
function useElapsedTime() {
  const startTime  = useGameStore((s) => s.startTime);
  const timeCost   = useGameStore((s) => s.timeCost);
  const isAnimating = useGridStore((s) => s.isAnimating);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!startTime || !isAnimating) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      setElapsed(Date.now() - startTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [startTime, isAnimating]);

  // 动画结束后使用最终耗时
  return timeCost !== null ? timeCost : elapsed;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

// ── 体力条 ──
function StaminaBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isLow = pct <= 25;
  const isMid = pct > 25 && pct <= 50;

  const barColor = isLow ? 'bg-rose-500' : isMid ? 'bg-amber-400' : 'bg-emerald-500';
  const glowColor = isLow
    ? 'shadow-[0_0_8px_rgba(239,68,68,0.5)]'
    : isMid
    ? 'shadow-[0_0_8px_rgba(251,191,36,0.4)]'
    : 'shadow-[0_0_8px_rgba(52,211,153,0.3)]';

  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500 uppercase tracking-widest">体力</span>
        <motion.span
          key={current}
          initial={{ opacity: 0.6, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={isLow ? 'text-rose-400 font-bold' : 'text-gray-300'}
        >
          {current} <span className="text-gray-600">/ {max}</span>
        </motion.span>
      </div>
      <div className="h-2.5 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700">
        <motion.div
          className={['h-full rounded-full', barColor, glowColor].join(' ')}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      {/* 危险警告 */}
      <AnimatePresence>
        {isLow && pct > 0 && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-rose-500 font-semibold animate-pulse"
          >
            ⚡ 体力危急
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 单项数值 ──
function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-gray-600 uppercase tracking-widest">{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0.5, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={[
          'text-base font-bold tabular-nums',
          highlight ? 'text-amber-400' : 'text-gray-200',
        ].join(' ')}
      >
        {value}
      </motion.span>
    </div>
  );
}

// ── 主组件 ──
export function StatusBar() {
  const stamina     = useGameStore((s) => s.stamina);
  const maxStamina  = useGameStore((s) => s.maxStamina);
  const stepCount   = useGameStore((s) => s.stepCount);
  const isGameOver  = useGameStore((s) => s.isGameOver);
  const noPathFound = useGameStore((s) => s.noPathFound);
  const elapsed     = useElapsedTime();

  return (
    <div className="relative w-full flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 bg-gray-900/90 rounded-2xl border border-gray-700/60 shadow-inner overflow-hidden">

      {/* 背景扫描光（动画中） */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.04) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      {/* 体力条 */}
      <StaminaBar current={stamina} max={maxStamina} />

      <div className="h-10 w-px bg-gray-700/60 hidden sm:block" />

      {/* 步数 & 耗时 */}
      <div className="flex items-center gap-6 relative z-10">
        <Stat label="步数" value={stepCount > 0 ? String(stepCount) : '—'} />
        <Stat label="耗时" value={formatTime(elapsed)} highlight={elapsed > 5000} />
      </div>

      {/* Game Over 覆盖 */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-950/85 backdrop-blur-sm z-20"
          >
            <span className="text-rose-400 text-lg font-extrabold tracking-widest animate-pulse">
              ⚡ GAME OVER — 体力耗尽
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 无路径提示 */}
      <AnimatePresence>
        {noPathFound && !isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-950/80 backdrop-blur-sm z-20"
          >
            <span className="text-amber-400 text-sm font-semibold tracking-wide">
              ⚠ 无路可走 — 算法已搜遍全图
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
