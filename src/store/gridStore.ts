import { create } from 'zustand';
import { GridNode, NodeType, Position } from '../types';

/**
 * 网格尺寸常量：20 行 × 20 列 = 400 个节点
 * 修改这里可以改变网格大小（同时需要更新 CSS）
 */
const GRID_ROWS = 20;
const GRID_COLS = 20;

/** 默认起点位置（左上角附近） */
const DEFAULT_START_POS: Position = { row: 2, col: 2 };
/** 默认终点位置（右下角附近） */
const DEFAULT_END_POS: Position = { row: 17, col: 17 };

/**
 * 创建单个网格节点，所有字段初始化为默认值。
 *
 * GridNode 字段说明：
 *   row/col        坐标（从 0 开始）
 *   type           节点类型（empty/wall/start/end/visited/path/swamp）
 *   isVisited      算法是否已探索过（BFS/Dijkstra/A* 运行时写入）
 *   isPath         是否在最优路径上（路径回放时写入）
 *   distance       到起点的距离/代价（Dijkstra/A* 使用）
 *   previousNode   前驱节点（路径回溯用，指向"从哪里来"）
 *   weight         地形权重（普通格=1，泥沼=3，影响带权算法）
 */
function createNode(row: number, col: number): GridNode {
  return {
    row,
    col,
    type: 'empty',
    isVisited: false,
    isPath: false,
    distance: Infinity,   // Infinity 表示"尚未到达"
    previousNode: null,
    weight: 1,
  };
}

/**
 * 构建初始网格（20×20 的二维数组）。
 * 所有节点默认为 empty，起/终点坐标处设置对应类型。
 */
function buildInitialGrid(startPos: Position, endPos: Position): GridNode[][] {
  const grid: GridNode[][] = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    const row: GridNode[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const node = createNode(r, c);

      if (r === startPos.row && c === startPos.col) {
        node.type = 'start';
      } else if (r === endPos.row && c === endPos.col) {
        node.type = 'end';
      }

      row.push(node);
    }
    grid.push(row);
  }

  return grid;
}

/**
 * GridState 接口：定义 gridStore 的状态结构和所有可用方法。
 *
 * TypeScript 接口 = 描述"对象的形状"（有哪些字段，各自什么类型）。
 * 接口本身不产生代码，只在编译阶段做类型检查。
 */
export interface GridState {
  /** 20×20 网格数据，每个元素是一个 GridNode */
  grid: GridNode[][];
  /** 当前起点坐标 */
  startPos: Position;
  /** 当前终点坐标 */
  endPos: Position;
  /** 动画是否正在播放（动画中禁止修改网格） */
  isAnimating: boolean;

  // ── Actions（改变状态的方法）────────────────────────────────
  initializeGrid: () => void;
  updateNodeType: (row: number, col: number, type: NodeType) => void;
  clearPathAndVisited: () => void;
  resetFullGrid: () => void;
  setIsAnimating: (value: boolean) => void;
  markNodeVisited: (row: number, col: number) => void;
  markNodePath: (row: number, col: number) => void;
}

/**
 * useGridStore：Zustand 网格状态 Store
 *
 * ──────────────────────────────────────────────────────
 * 什么是 Zustand？
 *   Zustand 是一个轻量级 React 状态管理库。
 *   相比 Redux，它更简洁：不需要 action/reducer/dispatch，
 *   直接在 store 里定义状态和修改方法。
 *
 * create() 的参数是一个"初始化函数"，接收 set / get 两个参数：
 *   set(updater)：调用 updater 得到新状态并触发 React 重渲染
 *   get()       ：读取当前状态（在方法内部使用，避免闭包陈旧问题）
 *
 * 使用方式：
 *   const grid = useGridStore((s) => s.grid); // 订阅 grid
 *   → grid 变化时组件自动重渲染
 *   → 只订阅需要的字段，避免不必要的重渲染
 * ──────────────────────────────────────────────────────
 */
export const useGridStore = create<GridState>((set, get) => ({
  grid: buildInitialGrid(DEFAULT_START_POS, DEFAULT_END_POS),
  startPos: DEFAULT_START_POS,
  endPos: DEFAULT_END_POS,
  isAnimating: false,

  /**
   * initializeGrid：重建干净网格
   * 读取当前 startPos/endPos（通过 get()），重新生成网格。
   * 用于关卡切换等需要保留起终点位置的场景。
   */
  initializeGrid() {
    const { startPos, endPos } = get(); // 读取当前状态
    set({ grid: buildInitialGrid(startPos, endPos) });
  },

  /**
   * updateNodeType：修改单个节点的类型
   *
   * 特殊处理：
   *   如果新类型是 'start'，把旧起点恢复为 empty，同步 startPos
   *   如果新类型是 'end'，把旧终点恢复为 empty，同步 endPos
   *
   * 注意：set 的参数是"updater 函数"而非直接传新状态。
   *   updater 接收当前状态 state，返回要合并的新状态片段。
   *   Zustand 会把返回值"浅合并"到当前状态（类似 Object.assign）。
   *
   * 为什么每次都要 map 创建新数组？
   *   React/Zustand 通过"引用比较"判断状态是否变化。
   *   如果直接修改原数组里的对象，引用没变，UI 不会更新。
   *   创建新数组 + 新对象，保证引用发生变化，触发正确的重渲染。
   *   这是"不可变数据"（Immutability）原则。
   */
  updateNodeType(row, col, type) {
    set((state) => {
      const rows = state.grid.length;
      const cols = state.grid[0]?.length ?? 0;
      if (row < 0 || row >= rows || col < 0 || col >= cols) return state;

      // 深拷贝网格（保证不可变性）
      const grid = state.grid.map((r) => r.map((n) => ({ ...n })));
      const node = grid[row][col];

      let { startPos, endPos } = state;

      if (type === 'start') {
        grid[startPos.row][startPos.col].type = 'empty'; // 旧起点归还为 empty
        startPos = { row, col };                          // 更新起点坐标
      } else if (type === 'end') {
        grid[endPos.row][endPos.col].type = 'empty';     // 旧终点归还为 empty
        endPos = { row, col };                            // 更新终点坐标
      }

      node.type = type;

      return { grid, startPos, endPos }; // Zustand 浅合并到原状态
    });
  },

  /**
   * clearPathAndVisited：清除算法痕迹，保留地形
   *
   * 操作：
   *   将 type='visited' 或 type='path' 的节点恢复为 empty
   *   所有节点重置 isVisited、isPath、distance、previousNode
   *   保留：wall、start、end、swamp 不变
   *
   * 使用场景：切换算法后重新运行，或手动点击"清除路径"按钮
   */
  clearPathAndVisited() {
    set((state) => {
      const grid = state.grid.map((r) =>
        r.map((node) => {
          if (node.type === 'visited' || node.type === 'path') {
            return {
              ...node,
              type: 'empty' as NodeType,  // 恢复为空格
              isVisited: false,
              isPath: false,
              distance: Infinity,
              previousNode: null,
            };
          }
          // 其他类型保留 type，但重置算法相关字段
          return {
            ...node,
            isVisited: false,
            isPath: false,
            distance: Infinity,
            previousNode: null,
          };
        }),
      );
      return { grid, isAnimating: false };
    });
  },

  /**
   * resetFullGrid：完全重置网格
   *
   * 恢复默认起/终点位置，清除所有墙体、泥沼、算法痕迹。
   * 使用场景：点击"重置网格"按钮
   */
  resetFullGrid() {
    const startPos = DEFAULT_START_POS;
    const endPos   = DEFAULT_END_POS;
    set({
      grid: buildInitialGrid(startPos, endPos),
      startPos,
      endPos,
      isAnimating: false,
    });
  },

  setIsAnimating(value) {
    set({ isAnimating: value });
  },

  /**
   * markNodeVisited：动画阶段一专用，将节点标记为"已探索"
   *
   * 注意：起点/终点节点只更新 isVisited，不改变 type（保持显示为起/终点颜色）
   */
  markNodeVisited(row, col) {
    set((state) => {
      const rows = state.grid.length;
      const cols = state.grid[0]?.length ?? 0;
      if (row < 0 || row >= rows || col < 0 || col >= cols) return state;

      const node = state.grid[row][col];
      const grid = state.grid.map((r) => r.map((n) => ({ ...n })));

      if (node.type === 'start' || node.type === 'end') {
        // 起/终点：只更新 isVisited 标记，保留视觉样式
        grid[row][col] = { ...node, isVisited: true };
      } else {
        // 普通节点：同时更新 type 为 'visited'（触发蓝色水波动画）
        grid[row][col] = { ...node, type: 'visited', isVisited: true };
      }
      return { grid };
    });
  },

  /**
   * markNodePath：动画阶段二专用，将节点标记为"最优路径"
   *
   * 注意：起点/终点节点只更新 isPath，不改变 type
   */
  markNodePath(row, col) {
    set((state) => {
      const rows = state.grid.length;
      const cols = state.grid[0]?.length ?? 0;
      if (row < 0 || row >= rows || col < 0 || col >= cols) return state;

      const node = state.grid[row][col];
      const grid = state.grid.map((r) => r.map((n) => ({ ...n })));

      if (node.type === 'start' || node.type === 'end') {
        // 起/终点：只更新 isPath 标记
        grid[row][col] = { ...node, isPath: true };
      } else {
        // 普通节点：type 改为 'path'（触发金色追光动画）
        grid[row][col] = { ...node, type: 'path', isPath: true };
      }
      return { grid };
    });
  },
}));
