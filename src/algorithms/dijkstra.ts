import type { GridNode, AlgorithmResult } from '../types';
import { MinHeap } from '../utils/MinHeap';

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
 * 堆条目：将节点和到达该节点的"当前最优代价"打包入堆。
 *
 * 为什么要单独存 cost，而不是直接用 node.distance？
 *   同一个节点可能被多次入堆（发现更短路径时重新入堆）。
 *   堆里存的 cost 是"入堆时"的代价，可能已经过期（节点 distance 已更新更小）。
 *   弹出时比对 cost 与 node.distance 即可识别"过期条目"并跳过，
 *   这种技巧叫"惰性删除"（Lazy Deletion）。
 */
interface HeapEntry {
  node: GridNode;
  cost: number;
}

/**
 * Dijkstra 带权最短路径算法
 *
 * ──────────────────────────────────────────────────────
 * 核心思想：
 *   用"最小堆（优先级队列）"管理待探索节点，
 *   每次取出"已知总代价最小"的节点进行扩展。
 *
 *   相比 BFS（每步代价 = 1），Dijkstra 支持不同代价的边（地形权重）：
 *     普通格 weight = 1 → 移动代价 1
 *     泥沼   weight = 3 → 移动代价 3（算法会倾向绕行）
 *
 * 与 BFS 的区别：
 *   BFS 用普通队列（FIFO），保证按"步数"层次扩展，每步代价必须相同。
 *   Dijkstra 用最小堆（按代价排序），保证按"总代价"扩展，支持不等代价。
 *
 * 正确性保证（松弛定理）：
 *   每次从堆中弹出节点时，该节点已达到全局最优距离。
 *   证明：弹出时代价最小，后续所有待处理节点代价 ≥ 当前节点，
 *         不可能通过它们找到更短路径到达当前节点。
 *
 * 时间复杂度：O((V + E) log V)，V = 节点数，E = 边数
 * ──────────────────────────────────────────────────────
 */
export const dijkstra = (
  grid: GridNode[][],
  startNode: GridNode,
  endNode: GridNode,
): AlgorithmResult => {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  /**
   * 深拷贝网格，在"沙盒"中运行算法，不污染 store 原始数据。
   * distance 初始化为 Infinity，表示"尚未找到到达该节点的路径"。
   */
  const cloned: GridNode[][] = grid.map((row) =>
    row.map((node) => ({
      ...node,
      isVisited: false,
      isPath: false,
      distance: Infinity,  // 初始距离无穷大
      previousNode: null,
    })),
  );

  const start = cloned[startNode.row][startNode.col];
  const end   = cloned[endNode.row][endNode.col];

  start.distance = 0; // 起点到自身代价为 0

  /**
   * 最小堆：按 cost 升序排列。
   * compareFn: (a, b) => a.cost - b.cost
   *   a.cost < b.cost → 返回负数 → a 优先弹出（代价更小的先处理）
   */
  const heap = new MinHeap<HeapEntry>((a, b) => a.cost - b.cost);
  heap.push({ node: start, cost: 0 });

  const visitedNodesInOrder: GridNode[] = [];

  while (!heap.isEmpty()) {
    const { node: current, cost } = heap.pop()!;

    /**
     * 惰性删除（Lazy Deletion）：
     *   同一节点可能被多次入堆（每次发现更短路径时）。
     *   弹出时检查：若堆中存储的 cost > 节点当前最优 distance，
     *   说明这是一个"过期"条目，跳过即可。
     *
     *   这样做的好处：不需要从堆中"主动删除"旧条目（堆不支持随机删除），
     *   只需在弹出时过滤，实现简单且高效。
     */
    if (cost > current.distance) continue;
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

    // 枚举四个方向的邻居，进行"松弛操作"
    for (const [dr, dc] of DIRECTIONS) {
      const nr = current.row + dr;
      const nc = current.col + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const neighbor = cloned[nr][nc];
      if (neighbor.isVisited || neighbor.type === 'wall') continue;

      /**
       * 松弛操作（Relaxation）：
       *   新代价 = 当前节点距离 + 进入邻居的代价（= 邻居的 weight）
       *   若新代价 < 邻居已知最优距离 → 更新，并把邻居重新入堆
       *
       * weight 说明：
       *   普通格 weight = 1，泥沼 weight = 3
       *   Dijkstra 会自然地倾向走普通格绕开泥沼（因为代价更低）
       */
      const newCost = current.distance + neighbor.weight;

      if (newCost < neighbor.distance) {
        neighbor.distance     = newCost;   // 更新最优距离
        neighbor.previousNode = current;   // 记录前驱（路径回溯用）
        heap.push({ node: neighbor, cost: newCost }); // 重新入堆
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
