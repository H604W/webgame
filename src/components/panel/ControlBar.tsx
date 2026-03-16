import { useState } from 'react';
import { motion } from 'framer-motion';
import { bfs, dijkstra, astar } from '../../algorithms';
import {
  useAlgorithm,
  SPEED_PRESETS,
  type AnimationStatus,
  type AlgorithmFn,
  type SpeedIndex,
} from '../../hooks/useAlgorithm';
import { useGridStore } from '../../store/gridStore';

// ── 算法注册表 ──
const ALGORITHMS: { label: string; value: string; fn: AlgorithmFn }[] = [
  { label: 'BFS · 广度优先', value: 'bfs',      fn: bfs },
  { label: 'Dijkstra · 带权', value: 'dijkstra', fn: dijkstra },
  { label: 'A* · 启发搜索',  value: 'astar',    fn: astar },
];

// ── 状态标签 ──
const STATUS_BADGE: Record<AnimationStatus, { label: string; cls: string }> = {
  idle:    { label: '待机',   cls: 'bg-gray-800 text-gray-400 border border-gray-700' },
  running: { label: '运行中', cls: 'bg-indigo-900/80 text-indigo-300 border border-indigo-700 animate-pulse' },
  paused:  { label: '暂停',   cls: 'bg-amber-900/80 text-amber-300 border border-amber-700' },
  done:    { label: '完成',   cls: 'bg-emerald-900/80 text-emerald-300 border border-emerald-700' },
};

// ── 通用按钮 ──
interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant: 'primary' | 'warning' | 'danger' | 'ghost';
  children: React.ReactNode;
  title?: string;
}

const VARIANT_CLS: Record<ActionButtonProps['variant'], string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white disabled:bg-indigo-900 disabled:text-indigo-600',
  warning: 'bg-amber-600  hover:bg-amber-500  active:bg-amber-700  text-white disabled:bg-amber-900  disabled:text-amber-600',
  danger:  'bg-rose-700   hover:bg-rose-600   active:bg-rose-800   text-white disabled:bg-rose-900   disabled:text-rose-600',
  ghost:   'bg-gray-800   hover:bg-gray-700   active:bg-gray-900   text-gray-300 disabled:bg-gray-900 disabled:text-gray-700',
};

function ActionButton({ onClick, disabled = false, variant, children, title }: ActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileHover={disabled ? {} : { scale: 1.04 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      className={[
        'px-4 py-2 rounded-lg text-sm font-semibold tracking-wide',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed',
        VARIANT_CLS[variant],
      ].join(' ')}
    >
      {children}
    </motion.button>
  );
}

// ── 速度选择器 ──
function SpeedSelector({
  speedIdx,
  onSelect,
  disabled,
}: {
  speedIdx: SpeedIndex;
  onSelect: (i: SpeedIndex) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 whitespace-nowrap">速度</span>
      <div className="flex gap-1">
        {SPEED_PRESETS.map((p, i) => (
          <button
            key={i}
            disabled={disabled}
            onClick={() => onSelect(i as SpeedIndex)}
            title={p.label}
            className={[
              'w-10 py-1 rounded text-xs font-mono transition-colors',
              i === speedIdx
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200',
              disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 主组件 ──
export function ControlBar() {
  const [selectedAlgo, setSelectedAlgo] = useState(ALGORITHMS[0].value);
  const resetFullGrid = useGridStore((s) => s.resetFullGrid);

  const algorithmFn = ALGORITHMS.find((a) => a.value === selectedAlgo)!.fn;
  const { status, speedIdx, run, pause, resume, reset, setSpeed } = useAlgorithm(algorithmFn);

  const isRunning = status === 'running';
  const isPaused  = status === 'paused';
  const badge     = STATUS_BADGE[status];

  const handleMainAction = () => {
    if (isRunning) pause();
    else if (isPaused) resume();
    else run();
  };

  const mainLabel:   string                      = isRunning ? '暂停' : isPaused ? '继续' : '开始';
  const mainVariant: ActionButtonProps['variant'] = isRunning ? 'warning' : 'primary';

  return (
    <div className="w-full flex flex-wrap items-center gap-3 px-5 py-4 bg-gray-900/90 rounded-2xl shadow-xl border border-gray-700/60">

      {/* 算法选择 */}
      <div className="flex items-center gap-2">
        <label htmlFor="algo-select" className="text-xs text-gray-500 whitespace-nowrap uppercase tracking-widest">
          算法
        </label>
        <select
          id="algo-select"
          value={selectedAlgo}
          disabled={isRunning}
          onChange={(e) => { reset(); setSelectedAlgo(e.target.value); }}
          className={[
            'bg-gray-800 text-gray-100 text-sm rounded-lg px-3 py-2',
            'border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'transition-colors',
            isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500',
          ].join(' ')}
        >
          {ALGORITHMS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      {/* 分隔线 */}
      <div className="h-8 w-px bg-gray-700/60 hidden sm:block" />

      {/* 速度 */}
      <SpeedSelector
        speedIdx={speedIdx}
        onSelect={setSpeed}
        disabled={isRunning}
      />

      {/* 分隔线 */}
      <div className="h-8 w-px bg-gray-700/60 hidden sm:block" />

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <ActionButton variant={mainVariant} onClick={handleMainAction}>
          {mainLabel}
        </ActionButton>
        <ActionButton variant="ghost" disabled={status === 'idle'} onClick={reset}>
          清除路径
        </ActionButton>
        <ActionButton variant="danger" disabled={isRunning} onClick={() => { reset(); resetFullGrid(); }}>
          重置网格
        </ActionButton>
      </div>

      {/* 状态标签 */}
      <div className="ml-auto">
        <span className={['text-xs font-semibold px-3 py-1 rounded-full', badge.cls].join(' ')}>
          {badge.label}
        </span>
      </div>
    </div>
  );
}
