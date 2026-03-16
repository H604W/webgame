import type { NodeType, Position } from '../types';

/** 关卡中预设的单格信息 */
export interface CellPreset {
  row: number;
  col: number;
  type: NodeType;
  /** 地形权重，省略时默认 1（swamp 建议设 3） */
  weight?: number;
}

/** 关卡定义 */
export interface LevelDef {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** 关卡体力上限（覆盖默认的 1000） */
  maxStamina: number;
  startPos: Position;
  endPos: Position;
  /** 预置格子（墙体、泥沼等） */
  cells: CellPreset[];
}

// ──────────────────────────────────────────────
// 关卡 1：简单 —— 开阔地图，少量墙体
// ──────────────────────────────────────────────
const LEVEL_EASY: LevelDef = {
  id: 'easy',
  name: '简单 · 旷野',
  description: '地形开阔，少量障碍，适合初探算法。',
  difficulty: 'easy',
  maxStamina: 1000,
  startPos: { row: 1, col: 1 },
  endPos:   { row: 18, col: 18 },
  cells: [
    // 竖向隔墙（中段）
    ...Array.from({ length: 8 }, (_, i) => ({ row: 3 + i, col: 8,  type: 'wall' as NodeType })),
    // 横向隔墙
    ...Array.from({ length: 6 }, (_, i) => ({ row: 12,    col: 5 + i, type: 'wall' as NodeType })),
    // 少量泥沼（右下角）
    { row: 14, col: 14, type: 'swamp' as NodeType, weight: 3 },
    { row: 14, col: 15, type: 'swamp' as NodeType, weight: 3 },
    { row: 15, col: 14, type: 'swamp' as NodeType, weight: 3 },
    { row: 15, col: 15, type: 'swamp' as NodeType, weight: 3 },
  ],
};

// ──────────────────────────────────────────────
// 关卡 2：中等 —— 迷宫式通道 + 泥沼区
// ──────────────────────────────────────────────
const LEVEL_MEDIUM: LevelDef = {
  id: 'medium',
  name: '中等 · 泥泞迷宫',
  description: '迷宫通道加宽泥沼区域，体力消耗更大。',
  difficulty: 'medium',
  maxStamina: 800,
  startPos: { row: 1, col: 1 },
  endPos:   { row: 18, col: 18 },
  cells: [
    // 横向长墙 ①
    ...Array.from({ length: 14 }, (_, i) => ({ row: 4, col: 1 + i,  type: 'wall' as NodeType })),
    // 横向长墙 ②（留右侧缺口）
    ...Array.from({ length: 14 }, (_, i) => ({ row: 9, col: 5 + i,  type: 'wall' as NodeType })),
    // 横向长墙 ③（留左侧缺口）
    ...Array.from({ length: 14 }, (_, i) => ({ row: 14, col: 1 + i, type: 'wall' as NodeType })),
    // 竖向分隔墙
    ...Array.from({ length: 4 }, (_, i) => ({ row: 4 + i, col: 15,  type: 'wall' as NodeType })),
    ...Array.from({ length: 4 }, (_, i) => ({ row: 9 + i, col: 4,   type: 'wall' as NodeType })),
    // 泥沼区（中央）
    ...Array.from({ length: 4 }, (_, ri) =>
      Array.from({ length: 4 }, (_, ci) => ({
        row: 6 + ri, col: 8 + ci,
        type: 'swamp' as NodeType,
        weight: 3,
      }))
    ).flat(),
    // 额外零散泥沼
    { row: 16, col: 16, type: 'swamp' as NodeType, weight: 3 },
    { row: 16, col: 17, type: 'swamp' as NodeType, weight: 3 },
    { row: 17, col: 16, type: 'swamp' as NodeType, weight: 3 },
  ],
};

// ──────────────────────────────────────────────
// 关卡 3：困难 —— 密集迷宫 + 大片泥沼 + 体力严格限制
// ──────────────────────────────────────────────
const LEVEL_HARD: LevelDef = {
  id: 'hard',
  name: '困难 · 泥泞深渊',
  description: '密集迷宫与大片泥沼，体力极为有限，走错即失败。',
  difficulty: 'hard',
  maxStamina: 500,
  startPos: { row: 1, col: 1 },
  endPos:   { row: 18, col: 18 },
  cells: [
    // ─── 迷宫骨架 ───
    // 横向墙
    ...Array.from({ length: 16 }, (_, i) => ({ row: 3,  col: 2 + i, type: 'wall' as NodeType })),
    ...Array.from({ length: 16 }, (_, i) => ({ row: 7,  col: 2 + i, type: 'wall' as NodeType })),
    ...Array.from({ length: 16 }, (_, i) => ({ row: 11, col: 2 + i, type: 'wall' as NodeType })),
    ...Array.from({ length: 16 }, (_, i) => ({ row: 15, col: 2 + i, type: 'wall' as NodeType })),
    // 竖向墙（在横墙之间形成通道）
    ...Array.from({ length: 3 }, (_, i) => ({ row: 4 + i, col: 6,  type: 'wall' as NodeType })),
    ...Array.from({ length: 3 }, (_, i) => ({ row: 4 + i, col: 13, type: 'wall' as NodeType })),
    ...Array.from({ length: 3 }, (_, i) => ({ row: 8 + i, col: 9,  type: 'wall' as NodeType })),
    ...Array.from({ length: 3 }, (_, i) => ({ row: 8 + i, col: 16, type: 'wall' as NodeType })),
    ...Array.from({ length: 3 }, (_, i) => ({ row: 12 + i, col: 5, type: 'wall' as NodeType })),
    ...Array.from({ length: 3 }, (_, i) => ({ row: 12 + i, col: 12,type: 'wall' as NodeType })),
    // ─── 大片泥沼 ───
    ...Array.from({ length: 3 }, (_, ri) =>
      Array.from({ length: 5 }, (_, ci) => ({
        row: 4 + ri, col: 8 + ci,
        type: 'swamp' as NodeType,
        weight: 3,
      }))
    ).flat(),
    ...Array.from({ length: 3 }, (_, ri) =>
      Array.from({ length: 5 }, (_, ci) => ({
        row: 8 + ri, col: 2 + ci,
        type: 'swamp' as NodeType,
        weight: 3,
      }))
    ).flat(),
    ...Array.from({ length: 3 }, (_, ri) =>
      Array.from({ length: 5 }, (_, ci) => ({
        row: 12 + ri, col: 14 + ci,
        type: 'swamp' as NodeType,
        weight: 3,
      }))
    ).flat(),
  ],
};

// ──────────────────────────────────────────────
// 导出
// ──────────────────────────────────────────────

export const LEVELS: LevelDef[] = [LEVEL_EASY, LEVEL_MEDIUM, LEVEL_HARD];

export const LEVEL_MAP: Record<string, LevelDef> = Object.fromEntries(
  LEVELS.map((l) => [l.id, l]),
);

/** 自由模式（无预设地图，使用默认网格） */
export const LEVEL_FREE: LevelDef = {
  id: 'free',
  name: '自由模式',
  description: '自行绘制地图，不限体力。',
  difficulty: 'easy',
  maxStamina: 9999,
  startPos: { row: 2, col: 2 },
  endPos:   { row: 17, col: 17 },
  cells: [],
};
