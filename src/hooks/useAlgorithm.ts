import { useCallback, useEffect, useRef, useState } from 'react';
import { useGridStore } from '../store/gridStore';
import { useGameStore } from '../store/gameStore';
import type { AlgorithmResult, GridNode } from '../types';

/**
 * 算法函数类型：接收网格 + 起终点，返回统一格式的结果。
 * bfs / dijkstra / astar 三个函数都符合这个签名，可以互换传入。
 */
export type AlgorithmFn = (
  grid: GridNode[][],
  startNode: GridNode,
  endNode: GridNode,
) => AlgorithmResult;

/**
 * 动画状态机的四个状态：
 *   idle    → 初始/重置后，尚未运行
 *   running → 动画播放中
 *   paused  → 暂停中（可继续）
 *   done    → 动画播放完毕
 *
 * 状态转移：
 *   idle ──run()──▶ running ──pause()──▶ paused ──resume()──▶ running
 *   running ──(动画结束)──▶ done
 *   任意状态 ──reset()──▶ idle
 */
export type AnimationStatus = 'idle' | 'running' | 'paused' | 'done';

/**
 * 速度档位配置（ms/帧）
 *
 * visitInterval：每个"探索节点"动画帧之间的间隔（毫秒）
 * pathInterval ：每个"路径节点"动画帧之间的间隔（毫秒）
 *
 * 极速（visitInterval=0, pathInterval=0）：
 *   跳过 setTimeout，同步批量更新，无动画延迟，适合快速查看结果。
 */
export const SPEED_PRESETS = [
  { label: '×0.5', visitInterval: 30, pathInterval: 80 },
  { label: '×1',   visitInterval: 15, pathInterval: 40 },
  { label: '×2',   visitInterval:  8, pathInterval: 20 },
  { label: '×4',   visitInterval:  3, pathInterval:  8 },
  { label: '极速',  visitInterval:  0, pathInterval:  0 },
] as const;

export type SpeedIndex = 0 | 1 | 2 | 3 | 4;

/**
 * useAlgorithm Hook
 *
 * 这是整个项目最核心的 Hook，负责：
 *   1. 调用算法函数，得到访问序列和路径序列
 *   2. 用 setTimeout 逐帧驱动动画（两阶段：扫描 → 路径）
 *   3. 管理动画状态机（idle/running/paused/done）
 *   4. 支持暂停/继续（通过 progressRef 记录断点）
 *   5. 防止竞态（generation 机制）
 *
 * @param algorithmFn 要使用的算法（bfs/dijkstra/astar）
 */
export function useAlgorithm(algorithmFn: AlgorithmFn) {
  // ── 从 store 订阅所需状态和方法 ──────────────────────────────
  const grid            = useGridStore((s) => s.grid);
  const startPos        = useGridStore((s) => s.startPos);
  const endPos          = useGridStore((s) => s.endPos);
  const setIsAnimating  = useGridStore((s) => s.setIsAnimating);
  const markNodeVisited = useGridStore((s) => s.markNodeVisited);
  const markNodePath    = useGridStore((s) => s.markNodePath);
  const clearPathAndVisited = useGridStore((s) => s.clearPathAndVisited);

  const startRun       = useGameStore((s) => s.startRun);
  const checkGameOver  = useGameStore((s) => s.checkGameOver);
  const markNoPath     = useGameStore((s) => s.markNoPath);
  const resetGame      = useGameStore((s) => s.resetGame);
  const consumeStamina = useGameStore((s) => s.consumeStamina);

  // ── 组件内部状态 ──────────────────────────────────────────────
  const [status, setStatus]     = useState<AnimationStatus>('idle');
  const [speedIdx, setSpeedIdx] = useState<SpeedIndex>(1); // 默认 ×1

  /**
   * Ref（useRef）vs State（useState）的选择：
   *   Ref 的变化不触发重渲染，适合存"运行时内部数据"。
   *   State 的变化触发重渲染，适合存"UI 需要响应的数据"。
   */

  /**
   * 存储所有挂起的 setTimeout ID，用于批量清除。
   * 用 Ref 存是因为清除定时器不需要触发重渲染。
   */
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  /**
   * Generation 计数器：防竞态的核心机制。
   *
   * 问题场景：
   *   1. 用户点击运行，scheduleFrames 注册了 200 个 setTimeout
   *   2. 用户点击重置，我们调用 clearTimeout 尝试取消它们
   *   3. 但 clearTimeout 有时无法完全阻止"即将执行"的回调
   *   4. 导致已重置的网格被旧回调污染
   *
   * 解决方案：
   *   每次新运行/重置时，generationRef.current++（generation 自增）。
   *   每个 setTimeout 回调在执行前检查：
   *     if (generationRef.current !== myGen) return; // 已过期，忽略
   *   即使回调逃过了 clearTimeout，也会因为 generation 不匹配而自我取消。
   */
  const generationRef = useRef(0);

  /** 存储算法结果，暂停后 resume 时复用，不需要重新跑算法 */
  const resultRef = useRef<AlgorithmResult | null>(null);

  /**
   * 进度记录器：暂停时保存当前播放到第几帧，resume 时从断点续播。
   *   visitIdx：已播放的"探索节点"帧数
   *   pathIdx ：已播放的"路径节点"帧数
   *   phase   ：当前处于哪个阶段（'visit' 扫描阶段 / 'path' 路径阶段）
   */
  const progressRef = useRef({ visitIdx: 0, pathIdx: 0, phase: 'visit' as 'visit' | 'path' });

  /**
   * 用 Ref 同步最新 speedIdx，供 scheduleFrames 内的闭包读取。
   *
   * 问题：scheduleFrames 的 useCallback 依赖数组里没有 speedIdx，
   *      如果直接读 speedIdx 会读到闭包创建时的"旧值"（stale closure）。
   * 解决：每次 speedIdx 变化时同步到 speedIdxRef，
   *      scheduleFrames 内读 speedIdxRef.current 即可拿到最新值。
   */
  const speedIdxRef = useRef<SpeedIndex>(speedIdx);
  useEffect(() => { speedIdxRef.current = speedIdx; }, [speedIdx]);

  // 组件卸载时清理所有挂起的定时器（防内存泄漏）
  useEffect(() => {
    return () => {
      timerIds.current.forEach(clearTimeout);
      timerIds.current = [];
      generationRef.current++;
    };
  }, []);

  /**
   * 清除所有挂起的定时器，并自增 generation（使过期回调失效）。
   * 在 run/pause/reset 前调用，保证没有残留的旧动画帧。
   */
  const clearAllTimers = useCallback(() => {
    generationRef.current++;                  // generation 自增，使旧回调失效
    timerIds.current.forEach(clearTimeout);   // 取消所有已注册的定时器
    timerIds.current = [];                    // 清空 ID 列表
  }, []);

  /**
   * scheduleFrames：核心动画调度函数
   *
   * 将算法结果转化为两阶段逐帧动画：
   *   阶段一（扫描）：逐帧调用 markNodeVisited，把节点标蓝（探索波纹）
   *   阶段二（路径）：逐帧调用 markNodePath，把节点标金（追光效果）
   *
   * 每帧之间用 setTimeout 添加延迟，形成动画效果。
   *
   * @param result     算法结果
   * @param visitStart 从第几个探索帧开始（暂停续播时 > 0）
   * @param pathStart  从第几个路径帧开始（暂停续播时 > 0）
   * @param sIdx       当前速度档位
   */
  const scheduleFrames = useCallback(
    (result: AlgorithmResult, visitStart: number, pathStart: number, sIdx: SpeedIndex) => {
      const { visitedNodesInOrder, pathNodesInOrder } = result;
      const visitTotal = visitedNodesInOrder.length;
      const pathTotal  = pathNodesInOrder.length;
      const speed      = SPEED_PRESETS[sIdx];

      /**
       * 记录本次调度的 generation。
       * 所有回调都会闭包捕获这个值，执行时与最新 generationRef.current 比对。
       */
      const myGen = generationRef.current;

      const { visitInterval, pathInterval } = speed;

      /**
       * 极速模式：visitInterval=0, pathInterval=0
       * 同步执行所有帧，无 setTimeout，无动画延迟。
       * 适合"我只想看结果"的场景。
       */
      if (visitInterval === 0 && pathInterval === 0) {
        for (let i = visitStart; i < visitTotal; i++) {
          const n = visitedNodesInOrder[i];
          markNodeVisited(n.row, n.col);
        }
        for (let j = pathStart; j < pathTotal; j++) {
          const n = pathNodesInOrder[j];
          markNodePath(n.row, n.col);
          if (j > 0) consumeStamina(n); // j=0 是起点，不扣体力
        }
        progressRef.current = { visitIdx: visitTotal, pathIdx: pathTotal, phase: 'path' };

        if (pathTotal > 0) {
          checkGameOver(pathNodesInOrder);
        } else {
          markNoPath();
        }
        setIsAnimating(false);
        setStatus('done');
        return;
      }

      /**
       * 常规动画模式：用 setTimeout 逐帧调度
       *
       * 阶段一（探索扫描）：
       *   第 i 帧的延迟 = (i - visitStart) * visitInterval 毫秒
       *   例如 visitInterval=15ms，第 0 帧延迟 0ms，第 1 帧 15ms，第 2 帧 30ms...
       */
      for (let i = visitStart; i < visitTotal; i++) {
        const node = visitedNodesInOrder[i];
        const delay = (i - visitStart) * visitInterval;

        const id = setTimeout(() => {
          if (generationRef.current !== myGen) return; // 竞态检查，过期则忽略

          markNodeVisited(node.row, node.col);          // 把节点标记为"已探索"
          progressRef.current.visitIdx = i + 1;         // 更新进度（暂停时保存断点）

          if (i === visitTotal - 1) {
            progressRef.current.phase = 'path'; // 扫描阶段结束，切换到路径阶段
          }
        }, delay);

        timerIds.current.push(id);
      }

      /**
       * 阶段二（路径回放）：
       *   必须在扫描阶段完全结束后才开始。
       *   因此路径帧的基础延迟 = 扫描阶段总耗时 = (visitTotal - visitStart) * visitInterval
       *   然后再加上路径帧自身的偏移。
       */
      const visitDuration = (visitTotal - visitStart) * visitInterval;

      for (let j = pathStart; j < pathTotal; j++) {
        const node = pathNodesInOrder[j];
        const delay = visitDuration + (j - pathStart) * pathInterval;

        const id = setTimeout(() => {
          if (generationRef.current !== myGen) return;

          markNodePath(node.row, node.col);              // 把节点标记为"路径"
          if (j > 0) consumeStamina(node);               // 扣除体力（起点 j=0 不扣）
          progressRef.current.pathIdx = j + 1;

          // 最后一帧：动画全部完成，触发结算
          if (j === pathTotal - 1) {
            checkGameOver(pathNodesInOrder);
            setIsAnimating(false);
            setStatus('done');
          }
        }, delay);

        timerIds.current.push(id);
      }

      /**
       * 无路径情况：
       *   扫描阶段结束后，等待 visitDuration 然后弹出"无路径"提示。
       */
      if (pathTotal === 0) {
        const id = setTimeout(() => {
          if (generationRef.current !== myGen) return;
          markNoPath();
          setIsAnimating(false);
          setStatus('done');
        }, visitDuration);
        timerIds.current.push(id);
      }
    },
    [markNodeVisited, markNodePath, setIsAnimating, checkGameOver, markNoPath, consumeStamina],
  );

  /**
   * run：开始一次新的算法运行
   *
   * 步骤：
   *   1. 清除旧动画（clearAllTimers）
   *   2. 清除网格上的探索/路径痕迹（clearPathAndVisited）
   *   3. 同步调用算法函数，得到访问序列和路径序列
   *   4. 重置进度，启动游戏计时
   *   5. 调用 scheduleFrames 逐帧播放动画
   */
  const run = useCallback(() => {
    const startNode = grid[startPos.row]?.[startPos.col];
    const endNode   = grid[endPos.row]?.[endPos.col];
    if (!startNode || !endNode) return;

    clearAllTimers();
    clearPathAndVisited();

    // 算法是同步执行的（在深拷贝网格上），瞬间得到结果
    const result = algorithmFn(grid, startNode, endNode);
    resultRef.current = result;
    progressRef.current = { visitIdx: 0, pathIdx: 0, phase: 'visit' };

    startRun();           // 重置游戏状态（体力、步数、计时器）
    setIsAnimating(true); // 锁定网格编辑（动画中不允许修改网格）
    setStatus('running');
    scheduleFrames(result, 0, 0, speedIdxRef.current);
  }, [
    grid, startPos, endPos, algorithmFn,
    clearAllTimers, clearPathAndVisited,
    startRun, setIsAnimating, scheduleFrames,
  ]);

  /**
   * pause：暂停动画
   *
   * 步骤：
   *   1. clearAllTimers（使剩余帧失效，generation 自增）
   *   2. 此时 progressRef 里保存了最新的断点（帧序号）
   *   3. 设置状态为 paused
   *
   * 注意：暂停时网格已渲染的帧保持显示，仅停止后续帧。
   */
  const pause = useCallback(() => {
    if (status !== 'running') return;
    clearAllTimers();
    setIsAnimating(false);
    setStatus('paused');
  }, [status, clearAllTimers, setIsAnimating]);

  /**
   * resume：从断点续播
   *
   * 步骤：
   *   1. 读取 progressRef 中保存的断点（visitIdx / pathIdx）
   *   2. 重新调用 scheduleFrames，从断点位置开始调度剩余帧
   *
   * 注意：不重新跑算法，直接复用 resultRef 中缓存的结果。
   */
  const resume = useCallback(() => {
    if (status !== 'paused' || !resultRef.current) return;
    const { visitIdx, pathIdx } = progressRef.current;
    setIsAnimating(true);
    setStatus('running');
    scheduleFrames(resultRef.current, visitIdx, pathIdx, speedIdxRef.current);
  }, [status, setIsAnimating, scheduleFrames]);

  /**
   * reset：完全重置
   *
   * 清除所有定时器、清除网格痕迹、重置游戏数据、恢复 idle 状态。
   */
  const reset = useCallback(() => {
    clearAllTimers();
    clearPathAndVisited();
    resetGame();
    resultRef.current = null;
    progressRef.current = { visitIdx: 0, pathIdx: 0, phase: 'visit' };
    setIsAnimating(false);
    setStatus('idle');
  }, [clearAllTimers, clearPathAndVisited, resetGame, setIsAnimating]);

  /** setSpeed：切换速度档位（不影响当前动画，下次运行生效） */
  const setSpeed = useCallback((idx: SpeedIndex) => {
    setSpeedIdx(idx);
  }, []);

  return { status, speedIdx, run, pause, resume, reset, setSpeed };
}
