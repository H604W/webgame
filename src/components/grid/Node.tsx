import { memo, useCallback, useEffect, useRef, type MouseEvent } from 'react';
import { motion, useAnimationControls, type TargetAndTransition } from 'framer-motion';
import type { GridNode, NodeType } from '../../types';

export interface NodeProps {
  node: GridNode;
  onClick: (row: number, col: number) => void;
  onMouseDown: (row: number, col: number, button: number) => void;
  onMouseEnter: (row: number, col: number) => void;
}

// ── 深渊暗色主题样式映射 ──
// visited / path 背景由 Framer Motion 接管
const NODE_STYLE: Record<NodeType, string> = {
  empty:   'bg-gray-900 hover:bg-gray-800 border-gray-700/50',
  wall:    'bg-gray-950 border-gray-600 shadow-[inset_0_0_6px_rgba(0,0,0,0.8)]',
  start:   'bg-emerald-500 hover:bg-emerald-400 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
  end:     'bg-rose-500   hover:bg-rose-400   border-rose-400   shadow-[0_0_8px_rgba(251,113,133,0.6)]',
  visited: 'border-indigo-600/60',
  path:    'border-amber-400/80',
  swamp:   'bg-teal-900/80 hover:bg-teal-800/80 border-teal-600/60 shadow-[inset_0_0_4px_rgba(20,184,166,0.3)]',
};

// ── 模块级动画常量 ──

/** visited：蓝色水波扩散 */
const ANIM_VISITED: TargetAndTransition = {
  scale: [0.6, 1.2, 1],
  opacity: [0.5, 1],
  backgroundColor: ['#312e81', '#4338ca', '#3730a3'],  // indigo-900 → indigo-700 → indigo-800
  borderRadius: ['50%', '30%', '20%'],
  transition: {
    duration: 0.35,
    ease: 'easeOut',
    borderRadius: { duration: 0.35 },
  },
};

/** path：金色追光弹跳 */
const ANIM_PATH: TargetAndTransition = {
  scale: [1, 1.35, 1.1, 1],
  y: [0, -6, -2, 0],
  backgroundColor: ['#fef08a', '#f59e0b', '#d97706'],  // yellow-200 → amber-500 → amber-600
  boxShadow: [
    '0 0 0px rgba(245,158,11,0)',
    '0 0 16px rgba(245,158,11,0.8)',
    '0 0 8px rgba(245,158,11,0.4)',
  ],
  transition: {
    duration: 0.4,
    ease: [0.34, 1.56, 0.64, 1],
  },
};

/** 重置：瞬间归零 */
const ANIM_IDLE: TargetAndTransition = {
  scale: 1,
  y: 0,
  opacity: 1,
  backgroundColor: '#111827',   // gray-900
  boxShadow: '0 0 0px rgba(0,0,0,0)',
  borderRadius: '2px',
  transition: { duration: 0 },
};

// ── 组件 ──

function NodeComponent({ node, onClick, onMouseDown, onMouseEnter }: NodeProps) {
  const { row, col, type, isVisited, isPath } = node;
  const controls = useAnimationControls();
  const prevAnimState = useRef<'idle' | 'visited' | 'path'>('idle');

  useEffect(() => {
    if (isPath) {
      if (prevAnimState.current === 'path') return;
      prevAnimState.current = 'path';
      controls.start(ANIM_PATH);
    } else if (isVisited) {
      if (prevAnimState.current === 'visited') return;
      prevAnimState.current = 'visited';
      controls.start(ANIM_VISITED);
    } else {
      if (prevAnimState.current === 'idle') return;
      prevAnimState.current = 'idle';
      controls.start(ANIM_IDLE);
    }
  }, [isVisited, isPath, controls]);

  const handleClick = useCallback(() => onClick(row, col), [row, col, onClick]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      onMouseDown(row, col, e.button);
    },
    [row, col, onMouseDown],
  );

  const handleMouseEnter = useCallback(
    (e: MouseEvent) => {
      if (e.buttons === 0) return;
      onMouseEnter(row, col);
    },
    [row, col, onMouseEnter],
  );

  const needsMotionBg = isVisited || isPath;

  return (
    <motion.div
      role="gridcell"
      aria-label={`(${row},${col}) ${type}`}
      animate={controls}
      initial={false}
      className={[
        'w-7 h-7 border cursor-pointer select-none',
        needsMotionBg ? '' : 'transition-colors duration-75',
        NODE_STYLE[type],
      ].join(' ')}
      style={{ willChange: needsMotionBg ? 'transform, background-color, box-shadow' : 'auto' }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

export const Node = memo(NodeComponent, (prev, next) =>
  prev.node.type      === next.node.type     &&
  prev.node.isVisited === next.node.isVisited &&
  prev.node.isPath    === next.node.isPath    &&
  prev.onClick        === next.onClick        &&
  prev.onMouseDown    === next.onMouseDown    &&
  prev.onMouseEnter   === next.onMouseEnter,
);
