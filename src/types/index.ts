export type NodeType = 'empty' | 'wall' | 'start' | 'end' | 'visited' | 'path' | 'swamp';

/** 每种节点经过时消耗的体力值（未列出的类型消耗 0） */
export const NODE_STAMINA_COST: Partial<Record<NodeType, number>> = {
  empty:   10,
  swamp:   30,
  visited: 10,
  path:    10,
  start:    0,
  end:      0,
};

export interface GridNode {
  row: number;
  col: number;
  type: NodeType;
  isVisited: boolean;
  isPath: boolean;
  distance: number;
  previousNode: GridNode | null;
  /** 节点地形权重（正常 = 1，泥沼 = 3），供带权算法使用 */
  weight: number;
}

export interface Position {
  row: number;
  col: number;
}

export interface AlgorithmResult {
  /** 按访问顺序排列的节点（不含起点，含终点） */
  visitedNodesInOrder: GridNode[];
  /** 从起点到终点的最短路径节点（含起终点），未找到时为空数组 */
  pathNodesInOrder: GridNode[];
  /** 是否成功找到路径 */
  success: boolean;
}
