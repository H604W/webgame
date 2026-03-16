import type { GridNode } from '../types';

/**
 * 启发式函数（Heuristic Functions）
 *
 * ──────────────────────────────────────────────────────
 * 什么是启发式函数？
 *   A* 算法中，f(n) = g(n) + h(n)
 *     g(n)：从起点到节点 n 的已知实际代价
 *     h(n)：从节点 n 到终点的"估算"代价（启发式函数提供）
 *
 *   h(n) 的好坏直接影响 A* 的效率：
 *     h(n) = 0        → 退化为 Dijkstra（最慢，最优）
 *     h(n) 恰好等于真实代价 → A* 一条直线找到最优路径（最快）
 *     h(n) > 真实代价 → 不可采纳，可能错过最优路径
 *
 * 可采纳启发式（Admissible Heuristic）：
 *   h(n) ≤ 真实最小代价，保证 A* 找到最优路径。
 * ──────────────────────────────────────────────────────
 */

/**
 * 曼哈顿距离（Manhattan Distance）
 *
 * 公式：h = |Δrow| + |Δcol|
 *
 * 适用场景：四方向移动的网格（上/下/左/右，不能斜走）
 *
 * 为什么是最优启发式？
 *   四方向网格中，任意两点的最短路径步数 ≥ 曼哈顿距离，
 *   因此它"不高估"，是可采纳的。本项目使用这个函数。
 *
 * 例子：从 (0,0) 到 (3,4)
 *   h = |3-0| + |4-0| = 7（至少需要走 7 步）
 */
export function manhattan(a: GridNode, b: GridNode): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/**
 * 切比雪夫距离（Chebyshev Distance）
 *
 * 公式：h = max(|Δrow|, |Δcol|)
 *
 * 适用场景：八方向移动的网格（可以斜走，斜走代价 = 1）
 *
 * 本项目备用（当前是四方向移动，不使用此函数）。
 *
 * 例子：从 (0,0) 到 (3,4)
 *   h = max(3, 4) = 4（斜走可以同时减少行列距离）
 */
export function chebyshev(a: GridNode, b: GridNode): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/**
 * 欧几里得距离（Euclidean Distance）
 *
 * 公式：h = √(Δrow² + Δcol²)  （直线距离）
 *
 * 适用场景：连续空间或允许任意方向移动的场景。
 *
 * 注意：在带权网格中，若节点权重 > 1，欧几里得距离可能"低估"，
 * A* 仍然可采纳，但搜索效率下降（退化向 Dijkstra）。
 * 本项目备用。
 *
 * 例子：从 (0,0) 到 (3,4)
 *   h = √(9 + 16) = 5（直线距离）
 */
export function euclidean(a: GridNode, b: GridNode): number {
  const dr = a.row - b.row;
  const dc = a.col - b.col;
  return Math.sqrt(dr * dr + dc * dc);
}
