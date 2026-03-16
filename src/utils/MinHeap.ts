/**
 * 泛型最小堆（Binary Min-Heap）
 *
 * ──────────────────────────────────────────────────────
 * 什么是二叉堆？
 *   二叉堆是一棵"完全二叉树"（所有层都填满，最后一层从左向右填），
 *   用一维数组模拟，节点 i 的：
 *     - 左孩子  下标 = 2*i + 1
 *     - 右孩子  下标 = 2*i + 2
 *     - 父节点  下标 = Math.floor((i-1)/2)，等价于 (i-1) >> 1
 *
 * 最小堆性质：
 *   每个节点的值 ≤ 两个子节点的值。
 *   因此堆顶（下标 0）始终是"最小"元素。
 *
 * 为什么要用堆？
 *   Dijkstra / A* 每次都需要取出"代价最小的节点"，
 *   如果用普通数组线性扫描是 O(n)，用最小堆是 O(log n)，
 *   大幅提升搜索效率。
 *
 * 时间复杂度：
 *   push（插入）  O(log n)  — 上浮
 *   pop（删除堆顶）O(log n)  — 下沉
 *   peek（查看堆顶）O(1)
 * ──────────────────────────────────────────────────────
 *
 * 泛型 T：
 *   调用时传入具体类型，如 MinHeap<{ node: GridNode; cost: number }>。
 *
 * compareFn：
 *   (a, b) => number
 *   返回负数 → a 优先级更高（排在前面）
 *   返回正数 → b 优先级更高
 *   返回 0   → 优先级相同
 *   示例：按 cost 升序 → (a, b) => a.cost - b.cost
 */
export class MinHeap<T> {
  /** 内部存储数组，下标 0 是堆顶（最小元素） */
  private heap: T[] = [];

  /**
   * 比较函数，决定哪个元素"优先级更高"（值更小）
   * readonly 表示构造后不可替换
   */
  private readonly compareFn: (a: T, b: T) => number;

  constructor(compareFn: (a: T, b: T) => number) {
    this.compareFn = compareFn;
  }

  /** 当前堆中元素数量 */
  get size(): number {
    return this.heap.length;
  }

  /** 堆是否为空 */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * 查看堆顶元素（最小值），不移除。O(1)
   * 堆为空时返回 undefined。
   */
  peek(): T | undefined {
    return this.heap[0];
  }

  /**
   * 插入新元素。O(log n)
   *
   * 步骤：
   *   1. 把新元素追加到数组末尾（树的最后一个位置）
   *   2. 向上冒泡，直到满足堆性质
   */
  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * 取出并移除堆顶元素（最小值）。O(log n)
   *
   * 步骤：
   *   1. 保存堆顶（待返回）
   *   2. 把最后一个元素移到堆顶
   *   3. 向下沉降，恢复堆性质
   *   4. 返回原堆顶
   *
   * 为什么要把"最后一个"移到顶部而不是直接删除？
   *   直接删除堆顶会破坏"完全二叉树"结构；
   *   用末尾元素填补，然后下沉，可以在 O(log n) 内重新满足堆性质。
   */
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;

    const top = this.heap[0];              // 保存堆顶（最终返回值）
    const last = this.heap.pop()!;         // 取出末尾元素（同时缩短数组）

    if (this.heap.length > 0) {
      this.heap[0] = last;                 // 末尾元素填到堆顶
      this.sinkDown(0);                    // 向下沉降恢复堆性质
    }

    return top;
  }

  /**
   * 上浮（bubble up / sift up）
   *
   * 从 idx 位置开始，不断与父节点比较：
   *   若当前节点 < 父节点 → 交换，继续向上
   *   否则 → 已满足堆性质，停止
   *
   * 用位运算 (idx-1) >> 1 代替 Math.floor((idx-1)/2)，效果相同但更快。
   */
  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;  // 父节点下标

      if (this.compareFn(this.heap[idx], this.heap[parent]) < 0) {
        // 当前节点优先级更高（更小），与父节点交换
        [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
        idx = parent;  // 继续向上检查
      } else {
        break;  // 已满足堆性质
      }
    }
  }

  /**
   * 下沉（sink down / sift down）
   *
   * 从 idx 位置开始，不断与"左右子节点中较小的那个"比较：
   *   若存在子节点比当前节点更小 → 与最小子节点交换，继续向下
   *   否则 → 已满足堆性质，停止
   */
  private sinkDown(idx: number): void {
    const n = this.heap.length;

    while (true) {
      let smallest = idx;           // 假设当前节点最小
      const left  = 2 * idx + 1;   // 左孩子下标
      const right = 2 * idx + 2;   // 右孩子下标

      // 比较左孩子
      if (left < n && this.compareFn(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      // 比较右孩子
      if (right < n && this.compareFn(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === idx) break;  // 当前节点已是三者中最小，停止

      // 与最小子节点交换，继续向下
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}
