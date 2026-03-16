import type { GridNode, AlgorithmResult } from '../types';

/**
 * 四方向偏移量：上(-1,0)、下(+1,0)、左(0,-1)、右(0,+1)
 * as const 让 TypeScript 把它推断为字面量元组类型，防止误修改
 */
const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/**
 * 路径回溯函数
 *
 * 算法运行完毕后，每个节点都记录了 previousNode（前驱节点）。
 * 从终点出发，沿 previousNode 链一路走回起点，
 * 用 unshift 插到数组头部，最终得到 起点→终点 的有序路径。
 *
 * 为什么用 unshift 而不是 push + reverse？
 *   unshift 每次在数组头部插入，最终数组自然是正向顺序，无需再反转。
 *   （代价是 unshift 是 O(n)，但路径长度通常远小于访问节点数，可接受）
 */
function tracePath(endNode: GridNode): GridNode[] {
  const path: GridNode[] = [];
  let current: GridNode | null = endNode;

  while (current !== null) {
    path.unshift(current);          // 插入到数组头部
    current = current.previousNode; // 沿前驱指针向上追溯
  }

  return path; // 起点在 path[0]，终点在 path[path.length-1]
}

/**
 * 广度优先搜索（Breadth-First Search，BFS）
 *
 * ──────────────────────────────────────────────────────
 * 核心思想：
 *   用"队列"（FIFO，先进先出）管理待探索节点。
 *   每次从队首取出节点，将其未访问的邻居加入队尾。
 *   → 保证先访问离起点"步数最少"的节点
 *   → 在无权图（每步代价相同）中，第一次到达终点时即为最短路径
 *
 * 与 Dijkstra 的区别：
 *   BFS 认为每步代价相同（均为 1），不考虑地形权重（weight 字段）。
 *   Dijkstra 支持不同权重，泥沼（weight=3）会被认为"更贵"并尽量绕行。
 *
 * 时间复杂度：O(V + E)，V = 节点数，E = 边数（本项目 E ≈ 4V）
 * 空间复杂度：O(V)（队列 + 访问标记）
 * ──────────────────────────────────────────────────────
 *
 * @param grid      当前网格（来自 store）
 * @param startNode 起点节点
 * @param endNode   终点节点
 * @returns         访问顺序列表 + 最优路径 + 是否成功
 */
export const bfs = (
  grid: GridNode[][],
  startNode: GridNode,
  endNode: GridNode,
): AlgorithmResult => {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  /**
   * 深拷贝网格，断开与 store 的引用关联。
   *
   * 为什么要深拷贝？
   *   算法会修改节点的 isVisited、previousNode 等字段。
   *   如果直接操作 store 里的对象，会污染原始数据，导致：
   *     1. React 感知到状态变化触发不必要的重渲染
   *     2. 算法结束后数据无法干净还原
   *   深拷贝让算法在"沙盒"里跑，完全不影响 store。
   */
  const cloned: GridNode[][] = grid.map((row) =>
    row.map((node) => ({
      ...node,           // 浅拷贝所有字段
      isVisited: false,  // 重置访问标记
      isPath: false,     // 重置路径标记
      previousNode: null,// 重置前驱指针
    })),
  );

  // 从拷贝后的网格中取起点/终点节点（不能用原始引用）
  const start = cloned[startNode.row][startNode.col];
  const end   = cloned[endNode.row][endNode.col];

  const visitedNodesInOrder: GridNode[] = []; // 记录访问顺序，用于动画回放
  const queue: GridNode[] = [start];           // BFS 队列，初始只有起点
  start.isVisited = true;                      // 标记起点已访问，防止重复入队

  while (queue.length > 0) {
    /**
     * shift() 从队首取出元素：O(n) 操作
     * 严格的 BFS 应用 Deque（双端队列）以达到 O(1)，
     * 但本项目网格最大 400 节点，性能完全够用。
     */
    const current = queue.shift()!;
    visitedNodesInOrder.push(current);

    // 到达终点：回溯路径并立即返回
    if (current.row === end.row && current.col === end.col) {
      return {
        visitedNodesInOrder,
        pathNodesInOrder: tracePath(current),
        success: true,
      };
    }

    // 枚举四个方向的邻居
    for (const [dr, dc] of DIRECTIONS) {
      const nr = current.row + dr; // 邻居行坐标
      const nc = current.col + dc; // 邻居列坐标

      // 越界检查
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const neighbor = cloned[nr][nc];

      // 跳过已访问节点 或 墙体
      if (neighbor.isVisited || neighbor.type === 'wall') continue;

      neighbor.isVisited    = true;    // 标记已访问（入队时标记，防止重复入队）
      neighbor.previousNode = current; // 记录前驱，用于后续路径回溯
      queue.push(neighbor);            // 加入队列（BFS 保证按层次顺序处理）
    }
  }

  // 队列耗尽仍未到达终点：无路径
  return {
    visitedNodesInOrder,
    pathNodesInOrder: [],
    success: false,
  };
};
