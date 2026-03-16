import { useState, memo } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { GridContainer } from './components/grid/GridContainer';
import { ControlBar } from './components/panel/ControlBar';
import { StatusBar } from './components/panel/StatusBar';
import { Modal } from './components/ui/Modal';
import { GameTitle } from './components/ui/GameTitle';
import { useLevel } from './hooks/useLevel';
import { LEVEL_FREE } from './levels';

// ---- 背景浮动粒子 ----
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  size:  4 + (i % 5) * 3,
  x:     5 + (i * 31) % 90,     // 伪随机横向分布 0~90%
  delay: (i * 0.7) % 5,
  dur:   3.5 + (i % 4) * 1.2,
}));

const Particles = memo(function Particles() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* 顶部扫描光带 */}
      <div
        className="absolute left-0 right-0 h-px opacity-10 animate-scan-line"
        style={{ background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, #6366f1, transparent)' }}
      />
      {/* 中心径向光晕 */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full animate-pulse-glow pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
      />
      {/* 浮动粒子点 */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-y"
          style={{
            width:  p.size,
            height: p.size,
            left:   `${p.x}%`,
            bottom: `${10 + (p.id * 17) % 70}%`,
            animationDelay:    `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            background: p.id % 3 === 0
              ? 'rgba(99,102,241,0.25)'
              : p.id % 3 === 1
              ? 'rgba(239,68,68,0.2)'
              : 'rgba(168,85,247,0.2)',
            boxShadow: `0 0 ${p.size * 2}px currentColor`,
          }}
        />
      ))}
    </div>
  );
});

// ---- 难度标签 ----
const DIFFICULTY_BADGE: Record<string, string> = {
  easy:   'bg-emerald-900/80 text-emerald-300 border border-emerald-700',
  medium: 'bg-amber-900/80   text-amber-300   border border-amber-700',
  hard:   'bg-rose-900/80    text-rose-300    border border-rose-700',
};
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '简单', medium: '中等', hard: '困难',
};

// ---- 面板入场动画（直接传给 transition，不用 Variants） ----
function panelTransition(i: number): Transition {
  return { duration: 0.45, ease: 'easeOut' as const, delay: 0.6 + i * 0.1 };
}
const panelInitial = { opacity: 0, y: 20 };
const panelAnimate = { opacity: 1, y: 0 };

// ---- 主组件 ----
export default function App() {
  const [fogEnabled, setFogEnabled] = useState(false);
  const { currentLevel, levels, loadLevel } = useLevel();

  const handleRestart = () => loadLevel(currentLevel);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 bg-[#030712] relative">

      <Particles />

      {/* ── 标题 ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 pt-2"
      >
        <GameTitle />
      </motion.div>

      {/* ── 控制面板区 ── */}
      <div className="relative z-10 w-full max-w-[640px] flex flex-col gap-3">

        {/* 关卡选择 */}
        <motion.div
          initial={panelInitial}
          animate={panelAnimate}
          transition={panelTransition(0)}
          className="flex items-center gap-3 px-4 py-3 bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-700/60 animate-border-glow"
        >
          <span className="text-xs text-gray-500 whitespace-nowrap tracking-widest uppercase">关卡</span>
          <div className="flex flex-wrap gap-2">
            {levels.map((lv) => (
              <motion.button
                key={lv.id}
                onClick={() => loadLevel(lv)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className={[
                  'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                  currentLevel.id === lv.id
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/60'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200',
                ].join(' ')}
              >
                {lv.name}
              </motion.button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {currentLevel.id !== LEVEL_FREE.id && (
              <motion.span
                key={currentLevel.difficulty}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className={[
                  'ml-auto text-xs px-2.5 py-0.5 rounded-full font-bold',
                  DIFFICULTY_BADGE[currentLevel.difficulty],
                ].join(' ')}
              >
                {DIFFICULTY_LABEL[currentLevel.difficulty]}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 关卡描述 */}
        <AnimatePresence mode="wait">
          {currentLevel.description && (
            <motion.p
              key={currentLevel.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25 }}
              className="text-xs text-gray-600 px-1 font-mono"
            >
              {'▸ '}{currentLevel.description}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 算法控制栏 */}
        <motion.div initial={panelInitial} animate={panelAnimate} transition={panelTransition(1)}>
          <ControlBar />
        </motion.div>

        {/* 状态栏 */}
        <motion.div initial={panelInitial} animate={panelAnimate} transition={panelTransition(2)}>
          <StatusBar />
        </motion.div>

        {/* 迷雾开关 */}
        <motion.label
          initial={panelInitial}
          animate={panelAnimate}
          transition={panelTransition(3)}
          className="flex items-center gap-2 cursor-pointer select-none self-end"
        >
          <span className="text-xs text-gray-500 tracking-widest uppercase">战争迷雾</span>
          <button
            role="switch"
            aria-checked={fogEnabled}
            onClick={() => setFogEnabled((v) => !v)}
            className={[
              'relative w-10 h-5 rounded-full transition-colors duration-300',
              fogEnabled ? 'bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.6)]' : 'bg-gray-700',
            ].join(' ')}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
              style={{ left: fogEnabled ? 'calc(100% - 18px)' : '2px' }}
            />
          </button>
        </motion.label>
      </div>

      {/* ── 网格 ── */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.0, ease: 'easeOut' }}
      >
        {/* 网格外发光边框 */}
        <div
          className="absolute -inset-1 rounded-xl blur-sm opacity-30 pointer-events-none animate-pulse-glow"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7, #ef4444)' }}
        />
        <GridContainer rows={20} cols={20} fogEnabled={fogEnabled} />
      </motion.div>

      {/* ── 底部提示 ── */}
      <motion.p
        className="relative z-10 text-xs text-gray-700 font-mono tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.5 }}
      >
        {'[ '}点击放置{' '}
        <span className="text-green-500">起点</span>
        {' / '}
        <span className="text-red-500">终点</span>
        {'  ·  '}拖拽绘制
        <span className="text-gray-600"> 障碍</span>
        {' ]'}
      </motion.p>

      {/* 结算弹窗 */}
      <Modal onRestart={handleRestart} />
    </div>
  );
}
