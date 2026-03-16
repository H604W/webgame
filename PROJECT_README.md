# 深渊逃生（ABYSS ESCAPE）— 寻路算法可视化 Web 游戏

> 一个将经典寻路算法游戏化的交互式 Web 应用，融合算法可视化、地形权重、战争迷雾与成就评定系统。

---

## 项目概述

「深渊逃生」是一款以寻路算法为核心玩法的浏览器游戏。玩家在 20×20 的网格地图上自由绘制障碍与泥沼地形，选择算法让"探险者"从起点寻路至终点，算法的探索过程与最优路径以逐帧动画实时呈现。不同地形消耗不同体力，最终根据剩余体力、步数、耗时进行 S/A/B/C/F 五档成就评定。

**在线预览**：`npm run dev` 本地启动，访问 `http://localhost:5173`

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI 框架，函数组件 + Hooks |
| TypeScript | 5.6 | 全量类型覆盖 |
| Vite | 6.0 | 构建工具，极速 HMR |
| Zustand | 5.0 | 轻量全局状态管理 |
| Framer Motion | 12 | 节点动画、标题动效、弹窗过渡 |
| TailwindCSS | 3.4 | 原子化 CSS，自定义关键帧动画 |

---

## 核心亮点

### 1. 三种经典算法的完整实现与可视化

在**网格深拷贝**上运行算法，不污染原始状态，返回统一 `AlgorithmResult` 接口：

- **BFS（广度优先搜索）**：FIFO 队列，四方向扩展，无权网格下保证最短跳数路径
- **Dijkstra（带权最短路）**：配合自实现泛型 `MinHeap`（二叉堆，O(log n) push/pop），按节点地形权重计算加权最优路径，泥沼权重 = 3
- **A\*（启发式搜索）**：在 Dijkstra 基础上引入曼哈顿距离启发函数 `f = g + h`，搜索效率显著优于 BFS/Dijkstra，同样支持地形权重

```
// 三种算法均支持地形权重，接口统一
interface AlgorithmResult {
  visitedOrder: GridNode[];   // 探索序列，驱动访问动画
  pathOrder:    GridNode[];   // 最优路径序列，驱动追光动画
  success:      boolean;
}
```

### 2. 手写泛型最小堆 `MinHeap<T>`

为 Dijkstra 和 A* 提供高性能优先级队列，支持自定义比较函数，无第三方依赖：

```typescript
class MinHeap<T> {
  push(item: T): void   // O(log n) 上浮
  pop(): T | undefined  // O(log n) 下沉
  peek(): T | undefined // O(1)
}
```

### 3. 多档速度 + 暂停续播的动画引擎

`useAlgorithm` Hook 实现了完整的**动画状态机**（`idle → running ↔ paused → done`）：

- **5 档速度**：×0.5 / ×1 / ×2 / ×5 / 极速，极速模式同步批量执行、无 setTimeout 开销
- **暂停/继续**：通过 `progressRef` 记录帧序号断点，`resume` 从断点精确续播，不丢帧
- **generation 机制**：每次新运行自增 generation ID，过期回调自动丢弃，彻底杜绝竞态条件

### 4. 游戏化体力与成就系统

- **体力系统**：路径动画逐节点扣减，地形不同消耗不同（普通格 -1，泥沼 -3），体力条三色渐变（绿→黄→红）+低体力闪烁警告
- **成就评定**：结算弹窗依据剩余体力百分比输出 S/A/B/C/F 五档，伴随体力条动画与汉字标题特效
- **战争迷雾**（`FogOverlay`）：以曼哈顿距离判断玩家视野半径，已探索区域自动揭露，迷雾消散附带 Framer Motion 淡出动画

### 5. 丰富的动画表现

- **节点访问动画**（`visited`）：蓝色水波扩散，scale + borderRadius 变形
- **路径动画**（`path`）：金色追光弹跳，scale + y偏移 + 动态 boxShadow
- **标题动效**：汉字逐字弹入（spring 弹簧动画） + 熔岩流光渐变色（CSS @keyframes）
- `Node` 组件使用 `React.memo` + 自定义比较函数，400 节点同屏仅重渲染状态变更节点

### 6. 关卡与自由绘图系统

内置 4 个精心设计的关卡（简单旷野 / 泥泞迷宫 / 泥泞深渊 / 自由模式），`useLevel` Hook 负责关卡加载（重置状态 → 重建网格 → 叠加预设 → 原子写入 store）。

`useMouseDrag` Hook 处理鼠标拖拽绘墙：左键按空格绘墙、按墙体擦墙，右键强制擦墙，`lastCellRef` 去重防抖，起/终点节点受保护。

---

## 项目结构

```
src/
├── algorithms/          # 三种寻路算法实现
│   ├── bfs.ts
│   ├── dijkstra.ts
│   └── astar.ts
├── utils/               # 基础数据结构与工具
│   ├── MinHeap.ts       # 手写泛型最小堆
│   └── heuristic.ts     # 曼哈顿/切比雪夫/欧几里得启发函数
├── store/               # Zustand 全局状态
│   ├── gridStore.ts     # 网格状态（20×20 节点数据）
│   └── gameStore.ts     # 游戏状态（体力/步数/计时）
├── hooks/               # 核心业务逻辑
│   ├── useAlgorithm.ts  # 动画引擎（状态机 + 多档速度 + 暂停续播）
│   ├── useMouseDrag.ts  # 鼠标拖拽绘墙
│   └── useLevel.ts      # 关卡加载与切换
├── levels/              # 关卡定义数据
├── components/
│   ├── grid/            # 网格容器、节点、战争迷雾
│   ├── panel/           # 控制栏、状态栏
│   └── ui/              # 结算弹窗、标题组件
└── types/               # 全局 TypeScript 类型定义
```

---

## 简历描述参考

**寻路算法可视化 Web 游戏「深渊逃生」** | React + TypeScript + Zustand + Framer Motion

- 独立实现 BFS、Dijkstra、A* 三种寻路算法，支持地形权重（泥沼 cost=3），手写泛型最小堆（MinHeap）为 Dijkstra/A* 提供 O(log n) 优先级队列
- 设计多档速度（×0.5~极速）+ 暂停/续播动画引擎，引入 generation 机制解决 setTimeout 竞态问题；逐帧调度访问/路径两阶段动画，400 节点同屏流畅运行
- 基于 Zustand 拆分网格状态与游戏状态双 Store，配合 React.memo + 自定义比较函数，单次算法动画期间减少约 90% 无效重渲染
- 实现战争迷雾（曼哈顿距离视野计算）、体力消耗系统、S/A/B/C/F 成就评定、4 关卡预设及自由绘图模式，使算法演示具备完整的游戏体验闭环

---

## 本地运行

```bash
cd webgame
npm install
npm run dev
# 访问 http://localhost:5173
```

构建生产版本：

```bash
npm run build
npm run preview
```
