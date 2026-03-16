import { useCallback, useState } from 'react';
import { useGridStore } from '../store/gridStore';
import { useGameStore } from '../store/gameStore';
import { LEVELS, LEVEL_FREE, type LevelDef } from '../levels';
import type { NodeType } from '../types';

export { LEVELS, LEVEL_FREE };

/**
 * useLevel：关卡加载与切换 Hook
 *
 * ──────────────────────────────────────────────────────
 * 职责：
 *   管理当前关卡状态，提供 loadLevel 方法切换关卡。
 *   loadLevel 会按关卡定义（LevelDef）重建整个网格。
 *
 * 关卡加载流程：
 *   1. 停止动画（setIsAnimating(false)）
 *   2. 清除网格上的探索/路径痕迹（clearPathAndVisited）
 *   3. 重置游戏数据（resetGame）
 *   4. 设置关卡体力上限（setMaxStamina）
 *   5. 重建网格：先构建干净网格，再叠加关卡预设格子
 *   6. 一次性写入 store（useGridStore.setState）
 * ──────────────────────────────────────────────────────
 */
export function useLevel() {
  /**
   * currentLevel：当前激活的关卡定义
   * 初始为自由模式（LEVEL_FREE），用户切换关卡时更新。
   *
   * 这里用 useState 而非存进 store，因为关卡定义是"UI 层状态"，
   * 不需要跨多个组件共享（只有 App.tsx 和 ControlBar 会用到）。
   */
  const [currentLevel, setCurrentLevel] = useState<LevelDef>(LEVEL_FREE);

  // ── 从两个 store 取出需要的方法 ──────────────────────────────
  const setIsAnimating      = useGridStore((s) => s.setIsAnimating);
  const clearPathAndVisited = useGridStore((s) => s.clearPathAndVisited);
  const resetGame           = useGameStore((s) => s.resetGame);
  const setMaxStamina       = useGameStore((s) => s.setMaxStamina);

  /**
   * loadLevel：按关卡定义完整重建网格
   *
   * @param level 目标关卡的定义对象（包含起终点、体力上限、预设格子列表）
   *
   * 关键技术点：
   *
   * 1. useGridStore.getState()：
   *    直接调用 store 的 getState() 方法获取当前状态，
   *    而不是通过 useGridStore(selector) Hook 订阅。
   *    原因：loadLevel 是一个 useCallback 回调，其依赖数组里没有 grid，
   *    如果读取 Hook 订阅的 grid，会读到闭包创建时的"旧值"（stale closure）。
   *    getState() 每次都返回最新状态，绕过了闭包陷阱。
   *
   * 2. useGridStore.setState()：
   *    直接调用 store 的 setState 方法写入新状态，
   *    效果等同于在 store 内部调用 set()，但可以从外部调用。
   *    一次性写入整个 grid + startPos + endPos，避免多次触发重渲染。
   */
  const loadLevel = useCallback(
    (level: LevelDef) => {
      // 步骤 1~4：停止动画、清除痕迹、重置游戏状态、设置体力上限
      setIsAnimating(false);
      clearPathAndVisited();
      resetGame();
      setMaxStamina(level.maxStamina);
      setCurrentLevel(level);

      /**
       * 步骤 5：重建网格
       *
       * 通过 getState() 读取当前网格尺寸（避免硬编码 20×20）
       */
      const { grid: currentGrid } = useGridStore.getState();
      const rows = currentGrid.length;
      const cols = currentGrid[0]?.length ?? 0;

      /**
       * 第一步：构建干净网格
       *
       * 遍历所有节点，将 type 重置：
       *   - 起点坐标 → 'start'
       *   - 终点坐标 → 'end'
       *   - 其他     → 'empty'
       * 同时重置所有算法相关字段（isVisited、distance 等）
       * 以及地形权重（weight 恢复为 1）
       *
       * 为什么用 map 而不是直接修改？→ 不可变数据原则（见 gridStore 注释）
       */
      const newGrid = currentGrid.map((row, r) =>
        row.map((node, c) => {
          const isStart = r === level.startPos.row && c === level.startPos.col;
          const isEnd   = r === level.endPos.row   && c === level.endPos.col;
          return {
            ...node,
            type:          (isStart ? 'start' : isEnd ? 'end' : 'empty') as NodeType,
            isVisited:     false,
            isPath:        false,
            distance:      Infinity,
            previousNode:  null,
            weight:        1,       // 重置地形权重为普通格
          };
        }),
      );

      /**
       * 第二步：叠加关卡预设格子
       *
       * level.cells 是关卡定义里的预设节点列表，
       * 每个 cell 包含 { row, col, type, weight? }。
       *
       * 遍历 cells，将对应坐标的节点替换为关卡预设：
       *   - 越界坐标跳过（防御性编程）
       *   - 起/终点坐标跳过（防止覆盖）
       */
      for (const cell of level.cells) {
        if (cell.row < 0 || cell.row >= rows || cell.col < 0 || cell.col >= cols) continue;

        // 保护起/终点：关卡定义里偶尔可能误放起点坐标的格子
        if (
          (cell.row === level.startPos.row && cell.col === level.startPos.col) ||
          (cell.row === level.endPos.row   && cell.col === level.endPos.col)
        ) continue;

        newGrid[cell.row][cell.col] = {
          ...newGrid[cell.row][cell.col],
          type:   cell.type,
          weight: cell.weight ?? 1, // ?? 1：若关卡未指定 weight，默认为 1
        };
      }

      /**
       * 步骤 6：一次性写入 store
       *
       * 直接调用 useGridStore.setState 批量更新 grid + startPos + endPos，
       * 只触发一次 React 重渲染，比分三次 set 更高效。
       */
      useGridStore.setState({
        grid:        newGrid,
        startPos:    level.startPos,
        endPos:      level.endPos,
        isAnimating: false,
      });
    },
    [setIsAnimating, clearPathAndVisited, resetGame, setMaxStamina],
  );

  return {
    currentLevel,             // 当前关卡（UI 用于显示关卡名称、高亮选中项）
    levels: [...LEVELS, LEVEL_FREE], // 所有可选关卡列表（预设关卡 + 自由模式）
    loadLevel,                // 切换关卡的方法
  };
}
