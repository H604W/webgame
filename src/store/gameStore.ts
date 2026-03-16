import { create } from 'zustand';
import type { GridNode } from '../types';
import { NODE_STAMINA_COST } from '../types';

/**
 * 默认最大体力值，可被关卡配置覆盖。
 * 简单关卡 = 1000，困难关卡 = 500，自由模式 = 9999
 */
const DEFAULT_MAX_STAMINA = 1000;

/**
 * GameState 接口：游戏玩法相关的所有状态。
 *
 * 与 gridStore 的职责分离：
 *   gridStore → 地图数据（节点类型、坐标、算法标记）
 *   gameStore → 玩法数据（体力、步数、计时、胜负判定）
 *
 * 这种"单一职责"拆分的好处：
 *   修改地图不会触发游戏状态组件重渲染（性能优化）
 *   测试和调试更容易（各自独立）
 */
export interface GameState {
  /** 当前剩余体力（实时变化，驱动体力条 UI） */
  stamina: number;
  /** 本关最大体力上限（由关卡定义决定） */
  maxStamina: number;
  /** 走过的路径节点数（步数计数） */
  stepCount: number;
  /** 本次运行开始的时间戳（Date.now()，毫秒） */
  startTime: number | null;
  /** 最终耗时（毫秒），算法完成时写入 */
  timeCost: number | null;
  /** 体力耗尽 → Game Over */
  isGameOver: boolean;
  /** 算法未找到路径 */
  noPathFound: boolean;
  /** 是否显示结算弹窗 */
  showModal: boolean;
  /** 动画执行中已消耗的体力（实时累加，用于结算弹窗展示） */
  staminaSpent: number;

  // ── Actions ──────────────────────────────────────────────────
  startRun: () => void;
  checkGameOver: (pathNodes: GridNode[]) => void;
  markNoPath: () => void;
  resetGame: () => void;
  closeModal: () => void;
  setMaxStamina: (value: number) => void;
  consumeStamina: (node: GridNode) => void;
}

/**
 * 初始状态常量：使用 Pick 工具类型精确指定包含的字段，
 * 避免遗漏或多写。
 *
 * Pick<T, K>：从类型 T 中只取出键 K 对应的字段，生成新类型。
 * 例：Pick<GameState, 'stamina' | 'stepCount'> = { stamina: number; stepCount: number }
 */
const INITIAL_STATE: Pick<
  GameState,
  | 'stamina' | 'maxStamina' | 'stepCount'
  | 'startTime' | 'timeCost'
  | 'isGameOver' | 'noPathFound' | 'showModal' | 'staminaSpent'
> = {
  stamina:      DEFAULT_MAX_STAMINA,
  maxStamina:   DEFAULT_MAX_STAMINA,
  stepCount:    0,
  startTime:    null,
  timeCost:     null,
  isGameOver:   false,
  noPathFound:  false,
  showModal:    false,
  staminaSpent: 0,
};

export const useGameStore = create<GameState>((set) => ({
  ...INITIAL_STATE, // 展开初始状态

  /**
   * startRun：开始一次新的算法运行
   *
   * 每次点击"运行"按钮时调用，重置所有计数：
   *   - 体力恢复满（= maxStamina）
   *   - 步数归零
   *   - 开始计时（记录当前时间戳）
   *   - 清除上次的结算结果
   */
  startRun() {
    set((state) => ({
      stamina:      state.maxStamina, // 体力恢复到上限
      stepCount:    0,
      startTime:    Date.now(),       // 记录开始时间
      timeCost:     null,
      isGameOver:   false,
      noPathFound:  false,
      showModal:    false,
      staminaSpent: 0,
    }));
  },

  /**
   * consumeStamina：路径动画每帧调用，实时扣除体力
   *
   * 体力扣除公式：
   *   cost = NODE_STAMINA_COST[node.type] * node.weight
   *
   * 举例：
   *   普通格（empty）：cost = 10 * 1 = 10
   *   泥沼（swamp）：  cost = 30 * 3 = 90（比普通格贵 9 倍！）
   *   起点/终点：      cost = 0（不扣体力）
   *
   * Math.max(0, stamina - cost) 保证体力不会变为负数。
   *
   * 注意：这里用 ?? 10 是防御性编程，
   *   若 node.type 不在 NODE_STAMINA_COST 中（理论上不会），默认扣 10。
   */
  consumeStamina(node) {
    const cost = (NODE_STAMINA_COST[node.type] ?? 10) * node.weight;
    set((state) => ({
      stamina:      Math.max(0, state.stamina - cost),
      staminaSpent: state.staminaSpent + cost,
      stepCount:    state.stepCount + 1,
    }));
  },

  /**
   * checkGameOver：路径动画完成后的结算判定
   *
   * 传入完整路径节点列表，重新计算总体力消耗（以确保与实时扣除一致），
   * 判断是否 Game Over，并弹出结算弹窗。
   *
   * 为什么要"重新计算"而不用 staminaSpent？
   *   staminaSpent 是动画帧逐步累加的，受动画时序影响，
   *   而路径节点列表是确定的，从列表直接计算更准确。
   *
   * @param pathNodes 完整路径节点（含起终点）
   */
  checkGameOver(pathNodes) {
    set((state) => {
      // 计算耗时
      const elapsed = state.startTime ? Date.now() - state.startTime : 0;

      if (pathNodes.length === 0) {
        // 无路径情况（理论上应由 markNoPath 处理，这里作为保险）
        return { timeCost: elapsed, noPathFound: true, showModal: true };
      }

      /**
       * 从 i=1 开始遍历（跳过起点 i=0，起点不消耗体力）
       * 累加路径上每个节点的体力消耗
       */
      let totalCost = 0;
      for (let i = 1; i < pathNodes.length; i++) {
        const node = pathNodes[i];
        totalCost += (NODE_STAMINA_COST[node.type] ?? 10) * node.weight;
      }

      const remaining  = state.maxStamina - totalCost;
      const isGameOver = remaining <= 0; // 体力 ≤ 0 → 失败

      return {
        stamina:    Math.max(0, remaining),    // 最终剩余体力
        stepCount:  pathNodes.length - 1,      // 步数 = 路径长度 - 1（去掉起点）
        timeCost:   elapsed,
        isGameOver,
        showModal:  true,                      // 弹出结算面板
      };
    });
  },

  /**
   * markNoPath：算法未找到路径时调用
   * 记录耗时，设置 noPathFound 标志，弹出结算弹窗（显示"深渊封路"）。
   */
  markNoPath() {
    set((state) => ({
      timeCost:    state.startTime ? Date.now() - state.startTime : 0,
      noPathFound: true,
      showModal:   true,
    }));
  },

  /** closeModal：关闭结算弹窗（ESC 键或点击关闭按钮时调用） */
  closeModal() {
    set({ showModal: false });
  },

  /**
   * resetGame：重置游戏数据到初始状态
   *
   * 注意：保留当前关卡的 maxStamina（通过 state.maxStamina 取出后回填），
   * 不能直接展开 INITIAL_STATE（INITIAL_STATE 里的 maxStamina 是默认值 1000）。
   */
  resetGame() {
    set((state) => ({
      ...INITIAL_STATE,
      maxStamina: state.maxStamina, // 保留关卡体力上限
      stamina:    state.maxStamina, // 体力恢复到关卡上限
    }));
  },

  /**
   * setMaxStamina：切换关卡时设置新的体力上限
   * 同时把当前体力也重置为新上限（满血进入新关卡）。
   */
  setMaxStamina(value) {
    set({ maxStamina: value, stamina: value });
  },
}));
