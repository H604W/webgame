import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants, type TargetAndTransition } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

interface ModalProps {
  onRestart: () => void;
}

// ── 动画 ──
const backdropVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
};
const panelVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.8, y: 32 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 24 },
  } as TargetAndTransition,
  exit: {
    opacity: 0, scale: 0.88, y: -20,
    transition: { duration: 0.2 },
  } as TargetAndTransition,
};

// 成就评级
function getAchievement(staminaPct: number, steps: number): { icon: string; text: string; color: string } {
  if (staminaPct >= 80 && steps <= 20)  return { icon: '🏆', text: 'S · 完美逃生', color: 'text-yellow-300' };
  if (staminaPct >= 60)                 return { icon: '🥇', text: 'A · 高效突围', color: 'text-emerald-300' };
  if (staminaPct >= 35)                 return { icon: '🥈', text: 'B · 险中求生', color: 'text-blue-300' };
  if (staminaPct > 0)                   return { icon: '🥉', text: 'C · 勉强逃脱', color: 'text-orange-300' };
  return                                       { icon: '💀', text: 'F · 力竭倒地', color: 'text-rose-400' };
}

function formatTime(ms: number | null): string {
  if (ms === null) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function staminaColor(pct: number): string {
  if (pct > 50) return 'bg-emerald-500';
  if (pct > 25) return 'bg-amber-400';
  return 'bg-rose-500';
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-800/80 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={['text-sm font-bold tabular-nums', accent ? 'text-amber-300' : 'text-gray-200'].join(' ')}>
        {value}
      </span>
    </div>
  );
}

export function Modal({ onRestart }: ModalProps) {
  const showModal   = useGameStore((s) => s.showModal);
  const isGameOver  = useGameStore((s) => s.isGameOver);
  const noPathFound = useGameStore((s) => s.noPathFound);
  const staminaFinal = useGameStore((s) => s.stamina);
  const maxStamina  = useGameStore((s) => s.maxStamina);
  const stepCount   = useGameStore((s) => s.stepCount);
  const timeCost    = useGameStore((s) => s.timeCost);
  const closeModal  = useGameStore((s) => s.closeModal);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); },
    [closeModal],
  );
  useEffect(() => {
    if (showModal) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, handleKeyDown]);

  const isSuccess  = !isGameOver && !noPathFound;
  const staminaPct = maxStamina > 0 ? (staminaFinal / maxStamina) * 100 : 0;
  const achievement = isSuccess ? getAchievement(staminaPct, stepCount) : null;

  const titleText = noPathFound ? '深渊封路' : isGameOver ? '力竭深渊' : '逃出生天';
  const titleColor = isSuccess ? 'text-emerald-300' : 'text-rose-400';

  const subText = noPathFound
    ? '所有路径均被封锁，无法到达出口。'
    : isGameOver
    ? '体力耗尽，永眠于深渊之中。'
    : '你找到了一条逃生路径，成功突围！';

  // 成功时的彩色顶部色带
  const topBarCls = isSuccess
    ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600'
    : 'bg-gradient-to-r from-rose-800 via-rose-600 to-orange-700';

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={closeModal}
        >
          <motion.div
            key="panel"
            className="relative w-[360px] bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部彩色渐变色带 */}
            <div className={['h-1.5 w-full', topBarCls].join(' ')} />

            <div className="p-6 flex flex-col gap-4">
              {/* 标题区 */}
              <div className="text-center">
                <motion.p
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.1 }}
                  className={['text-3xl font-black tracking-tight', titleColor].join(' ')}
                >
                  {titleText}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-1.5 text-sm text-gray-400"
                >
                  {subText}
                </motion.p>
              </div>

              {/* 成就徽章（成功时显示） */}
              {achievement && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.25 }}
                  className="flex items-center justify-center gap-2 py-2 bg-gray-800/60 rounded-xl border border-gray-700"
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <span className={['font-bold text-sm', achievement.color].join(' ')}>
                    {achievement.text}
                  </span>
                </motion.div>
              )}

              {/* 体力条 */}
              {!noPathFound && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">剩余体力</span>
                    <span className={staminaPct <= 25 ? 'text-rose-400 font-bold' : 'text-gray-300'}>
                      {staminaFinal} / {maxStamina}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                    <motion.div
                      className={['h-full rounded-full', staminaColor(staminaPct)].join(' ')}
                      initial={{ width: 0 }}
                      animate={{ width: `${staminaPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* 统计 */}
              <div className="bg-gray-800/50 rounded-xl px-4 py-0.5 border border-gray-700/50">
                <StatRow label="逃生步数" value={stepCount > 0 ? `${stepCount} 步` : '—'} />
                <StatRow label="耗时"     value={formatTime(timeCost)} />
                {!noPathFound && (
                  <StatRow
                    label="体力消耗"
                    value={`${maxStamina - staminaFinal} / ${maxStamina}`}
                    accent={staminaPct < 25}
                  />
                )}
              </div>

              {/* 按钮 */}
              <div className="flex gap-3 pt-1">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors border border-gray-700"
                >
                  查看地图
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { closeModal(); onRestart(); }}
                  className={[
                    'flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors',
                    isSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : 'bg-indigo-600  hover:bg-indigo-500  text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]',
                  ].join(' ')}
                >
                  再次挑战
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
