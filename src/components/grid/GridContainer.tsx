import { useCallback } from 'react';
import { useGridStore } from '../../store/gridStore';
import { useMouseDrag } from '../../hooks/useMouseDrag';
import type { NodeType } from '../../types';
import { Node } from './Node';
import { FogOverlay } from './FogOverlay';

interface GridContainerProps {
  rows?: number;
  cols?: number;
  fogEnabled?: boolean;
}

const CELL_SIZE = 28;

/**
 * 单击逻辑：
 *   无 start → 设置 start
 *   有 start 无 end → 设置 end
 *   两者都有 → 切换 wall / empty
 *
 * 拖拽绘墙由 useMouseDrag 处理（支持左键绘墙 / 右键擦墙）。
 */
export function GridContainer({ rows = 20, cols = 20, fogEnabled = false }: GridContainerProps) {
  const grid           = useGridStore((s) => s.grid);
  const startPos       = useGridStore((s) => s.startPos);
  const endPos         = useGridStore((s) => s.endPos);
  const isAnimating    = useGridStore((s) => s.isAnimating);
  const updateNodeType = useGridStore((s) => s.updateNodeType);

  const { handleMouseDown, handleMouseEnter, handleMouseUp } = useMouseDrag();

  const handleNodeClick = useCallback(
    (row: number, col: number) => {
      if (isAnimating) return;
      const node = grid[row]?.[col];
      if (!node || node.type === 'start' || node.type === 'end') return;

      const hasStart = grid[startPos.row]?.[startPos.col]?.type === 'start';
      const hasEnd   = grid[endPos.row]?.[endPos.col]?.type === 'end';

      let targetType: NodeType;
      if (!hasStart)       targetType = 'start';
      else if (!hasEnd)    targetType = 'end';
      else                 targetType = node.type === 'wall' ? 'empty' : 'wall';

      updateNodeType(row, col, targetType);
    },
    [grid, startPos, endPos, isAnimating, updateNodeType],
  );

  return (
    <div
      role="grid"
      aria-label="深渊逃生网格"
      className="relative inline-block border border-gray-700/60 rounded-lg select-none bg-gray-950 overflow-hidden"
      style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)' }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} role="row" className="flex">
          {Array.from({ length: cols }, (_, c) => {
            const node = grid[r]?.[c];
            if (!node) return null;
            return (
              <Node
                key={`${r}-${c}`}
                node={node}
                onClick={handleNodeClick}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
              />
            );
          })}
        </div>
      ))}

      {fogEnabled && (
        <FogOverlay rows={rows} cols={cols} cellSize={CELL_SIZE} />
      )}
    </div>
  );
}
