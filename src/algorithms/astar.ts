import type { GridNode, AlgorithmResult } from '../types';
import { MinHeap } from '../utils/MinHeap';
import { manhattan } from '../utils/heuristic';

/** 四方向偏移：上、下、左、右 */
const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/** 路径回溯：从终点沿 previousNode 链追溯到起点，返回正向路径 */
function tracePath(endNode: GridNode): GridNode[] {
  const path: GridNode[] = [];
  let current: GridNode | null = endNode;
  while (current !== null) {
    path.unshift(current);
    current = current.previousNode;
  }
  return path;
}

/**
 * 堆条目：携带 f = g + h 值
 *
 *   g（gCost）= 从起点到当前节点的已知实际代价（考虑地形 weight）
 *   h（hCost）= 从当前节点到终点的曼哈顿距离估算（启发式）
 *   f = g + h  → 综合评分，值越小越优先探索
 */
interface HeapEntry {
  node: GridNode;
  f: number;
}

/**
 * A*（A-Star）启发式搜索算法
 *
 * ──────────────────────────────────────────────────────
 * 核心思想：
 *   在 Dijkstra 的基础上，加入"启发式函数 h(n)"引导搜索方向。
 *
 *   Dijkstra 按 g（实际代价）排序 → 向四面八方均匀扩展（像涟漪）
 *   A*      按 f = g + h 排序 → 优先探索"离终点更近"的节点（像有方向感）
 *
 *   直观类比：
 *     Dijkstra = 盲人摸路，从近到远逐圈探索
 *     A*       = 有眼睛的人，朝终点方向探索，遇障碍再绕行
 *
 * 可采纳性（Admissibility）：
 *   只要 h(n) ≤ 真实最短代价，A* 保证找到最优路径。
 *   本项目使用曼哈顿距离，四方向网格下满足可采纳性。
 *
 * 与 Dijkstra 的对比：
 *   相同点：都用最小堆，都支持地形权重，结果都是最优路径
 *   不同点：A* 探索的节点数通常远少于 Dijkstra（跳过了"背离终点"的方向）
 *
 * 时间复杂度：最坏 O((V + E) log V)，实践中通常远优于 Dijkstra
 * ──────────────────────────────────────────────────────
 */
export const astar = (
  grid: GridNode[][],
  startNode: GridNode,
  endNode: GridNode,
): AlgorithmResult => {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  /**
   * 深拷贝网格，在"沙盒"中运行算法，不污染 store 原始数据。
   * distance 字段在 A* 中复用为 g 值（从起点的实际代价）。
   */
  const cloned: GridNode[][] = grid.map((row) =>
    row.map((node) => ({
      ...node,
      isVisited: false,
      isPath: false,
      distance: Infinity,   // 复用为 g 值，初始无穷大
      previousNode: null,
    })),
  );

  const start = cloned[startNode.row][startNode.col];
  const end   = cloned[endNode.row][endNode.col];

  start.distance = 0; // g(start) = 0，起点到自身代价为 0

  /**
   * 最小堆按 f 值升序排列：f 越小越优先探索。
   * 起点的 f = g + h = 0 + manhattan(start, end)
   */
  const heap = new MinHeap<HeapEntry>((a, b) => a.f - b.f);
  heap.push({ node: start, f: manhattan(start, end) });

  const visitedNodesInOrder: GridNode[] = [];

  while (!heap.isEmpty()) {
    const { node: current, f } = heap.pop()!;

    /**
     * 惰性删除：
     *   A* 和 Dijkstra 一样，同一节点可能多次入堆。
     *   弹出时验证 f 是否与节点当前状态一致：
     *     当前节点的 "期望 f" = g(current) + h(current, end)
     *     若弹出的 f > 期望 f（有浮点误差容忍 1e-9）→ 过期条目，跳过
     *
     *   1e-9 是浮点误差容忍量（epsilon），防止因浮点精度问题误判。
     */
    const gCurrent  = current.distance;
    const expectedF = gCurrent + manhattan(current, end);
    if (f > expectedF + 1e-9) continue;
    if (current.isVisited) continue;

    current.isVisited = true;
    visitedNodesInOrder.push(current);

    // 到达终点，立即回溯路径返回
    if (current.row === end.row && current.col === end.col) {
      return {
        visitedNodesInOrder,
        pathNodesInOrder: tracePath(current),
        success: true,
      };
    }

    // 枚举四个方向的邻居，进行松弛操作
    for (const [dr, dc] of DIRECTIONS) {
      const nr = current.row + dr;
      const nc = current.col + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const neighbor = cloned[nr][nc];
      if (neighbor.isVisited || neighbor.type === 'wall') continue;

      /**
       * 计算经过 current 到达 neighbor 的新 g 值：
       *   gNew = g(current) + weight(neighbor)
       *
       * 泥沼 weight=3：穿越代价是普通格的 3 倍，
       * A* 会用更大的 g 惩罚，倾向绕道走普通格。
       */
      const gNew = gCurrent + neighbor.weight;

      if (gNew < neighbor.distance) {
        neighbor.distance     = gNew;       // 更新 g 值
        neighbor.previousNode = current;    // 记录前驱

        /**
         * 计算 h（启发值）= 曼哈顿距离到终点
         * f = g + h：综合评分，引导 A* 向终点方向搜索
         */
        const hNew = manhattan(neighbor, end);
        heap.push({ node: neighbor, f: gNew + hNew });
      }
    }
  }

  // 堆耗尽，未到达终点
  return {
    visitedNodesInOrder,
    pathNodesInOrder: [],
    success: false,
  };
};
