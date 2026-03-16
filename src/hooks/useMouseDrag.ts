import { useCallback, useRef } from 'react';
import { useGridStore } from '../store/gridStore';
import type { NodeType } from '../types';

/**
 * useMouseDrag：鼠标拖拽绘图交互 Hook
 *
 * ──────────────────────────────────────────────────────
 * 功能：
 *   左键按下空格格 → 开始绘墙（后续拖拽到的格子全部变墙）
 *   左键按下墙壁格 → 开始擦墙（后续拖拽到的格子全部变空格）
 *   右键任意格     → 直接擦墙（强制变空格）
 *   起点/终点节点  → 受保护，不可被覆盖
 *
 * 关键设计：
 *   1. "拖拽类型锁定"：按下时决定本次拖拽是"绘墙"还是"擦墙"，
 *      整个拖拽过程中类型不变（不会因为滑过墙体而来回切换）
 *   2. "去重防抖"：同一格子在一次拖拽中只处理一次，
 *      避免鼠标在格内轻微移动时重复触发
 * ──────────────────────────────────────────────────────
 */
export function useMouseDrag() {
  const grid           = useGridStore((s) => s.grid);
  const isAnimating    = useGridStore((s) => s.isAnimating);
  const updateNodeType = useGridStore((s) => s.updateNodeType);

  /**
   * dragTypeRef：本次拖拽锁定的操作类型
   *
   * null       → 当前没有拖拽（鼠标未按下）
   * 'wall'     → 本次拖拽是绘墙
   * 'empty'    → 本次拖拽是擦墙
   *
   * 用 Ref 而非 State 的原因：
   *   拖拽类型不需要触发 UI 重渲染，只是运行时的"会话数据"。
   *   Ref 读写更快，且不会触发组件刷新。
   */
  const dragTypeRef = useRef<NodeType | null>(null);

  /**
   * lastCellRef：上一次处理过的格子坐标（如 "3,5"）
   *
   * 用途：去重防抖。
   * 鼠标在同一格内移动会多次触发 onMouseEnter（或自定义的 handleMouseEnter），
   * 通过比较当前格子坐标与上次处理的坐标，相同则跳过，避免重复更新 store。
   */
  const lastCellRef = useRef<string | null>(null);

  /**
   * handleMouseDown：鼠标按下事件处理
   *
   * 这是拖拽的"起点"，决定本次拖拽的操作类型：
   *   button 0 = 左键：根据被按下格子的当前类型决定操作
   *     - 当前是 wall  → 本次操作是擦墙（变 empty）
   *     - 当前是 empty → 本次操作是绘墙（变 wall）
   *   button 2 = 右键：无论当前类型，强制擦墙
   *
   * 防护措施：
   *   - 动画播放中 → 直接返回（不允许编辑网格）
   *   - 起点/终点  → 直接返回（不允许覆盖）
   *
   * @param row    被点击格子的行坐标
   * @param col    被点击格子的列坐标
   * @param button 鼠标按键（0=左键，2=右键）
   */
  const handleMouseDown = useCallback(
    (row: number, col: number, button: number = 0) => {
      if (isAnimating) return; // 动画中锁定，禁止编辑

      const node = grid[row]?.[col];
      if (!node || node.type === 'start' || node.type === 'end') return; // 保护起/终点

      let targetType: NodeType;
      if (button === 2) {
        targetType = 'empty'; // 右键永远是擦墙
      } else {
        // 左键：反转当前类型（空格↔墙壁）
        targetType = node.type === 'wall' ? 'empty' : 'wall';
      }

      dragTypeRef.current  = targetType;          // 锁定本次拖拽操作类型
      lastCellRef.current  = `${row},${col}`;     // 记录已处理的格子坐标
      updateNodeType(row, col, targetType);        // 立即修改当前格子
    },
    [grid, isAnimating, updateNodeType],
  );

  /**
   * handleMouseEnter：鼠标滑入某个格子时触发（拖拽过程中）
   *
   * 只在以下条件都满足时才修改节点：
   *   1. 当前有拖拽进行中（dragTypeRef.current !== null）
   *   2. 当前格子与上次处理的格子不同（去重）
   *   3. 不是动画播放中
   *   4. 节点不是起点/终点
   *
   * 使用拖拽开始时锁定的 dragTypeRef.current 类型，
   * 保证整个拖拽过程操作类型一致（不会因路过墙壁而切换）。
   */
  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isAnimating) return;
      if (dragTypeRef.current === null) return; // 未在拖拽中

      const cellKey = `${row},${col}`; // 格子的唯一标识符
      if (lastCellRef.current === cellKey) return; // 去重：同一格不重复处理
      lastCellRef.current = cellKey;

      const node = grid[row]?.[col];
      if (!node || node.type === 'start' || node.type === 'end') return;

      updateNodeType(row, col, dragTypeRef.current); // 使用锁定类型修改节点
    },
    [grid, isAnimating, updateNodeType],
  );

  /**
   * handleMouseUp：鼠标松开时触发，结束拖拽会话
   *
   * 清空 dragTypeRef 和 lastCellRef，
   * 下次鼠标按下前不会再响应 handleMouseEnter。
   *
   * 也用于 onMouseLeave（鼠标离开网格容器时），
   * 防止鼠标移出画布后再移回来时继续"幽灵拖拽"。
   */
  const handleMouseUp = useCallback(() => {
    dragTypeRef.current  = null; // 结束拖拽
    lastCellRef.current  = null; // 清空去重记录
  }, []);

  return { handleMouseDown, handleMouseEnter, handleMouseUp };
}
