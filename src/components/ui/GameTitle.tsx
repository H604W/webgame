import { motion, type Variants, type TargetAndTransition } from 'framer-motion';

const TITLE = '深渊逃生';
const SUBTITLE = 'ABYSS ESCAPE · 寻路算法可视化';

// 容器：控制子元素错开入场
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

// 单字弹入
const charVariants: Variants = {
  hidden:  { opacity: 0, y: 28, scale: 0.6 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 18 },
  } as TargetAndTransition,
};

// 副标题淡入
const subtitleVariants: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const, delay: 0.6 },
  } as TargetAndTransition,
};

// 光晕背景
const glowVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 1, ease: 'easeOut' as const },
  } as TargetAndTransition,
};

export function GameTitle() {
  return (
    <div className="relative flex flex-col items-center select-none">

      {/* 背景光晕 */}
      <motion.div
        className="absolute -inset-8 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, rgba(239,68,68,0.10) 50%, transparent 70%)',
        }}
        variants={glowVariants}
        initial="hidden"
        animate="visible"
      />

      {/* 主标题：逐字弹入 + 熔岩流光 */}
      <motion.div
        className="flex gap-1 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {TITLE.split('').map((char, i) => (
          <motion.span
            key={i}
            className="text-lava text-5xl font-black tracking-tight drop-shadow-lg"
            style={{ display: 'inline-block' }}
            variants={charVariants}
            whileHover={{
              scale: 1.25,
              rotate: [-3, 3, -2, 0],
              transition: { duration: 0.3 },
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>

      {/* 下划线装饰 */}
      <motion.div
        className="relative z-10 mt-1 h-0.5 rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent, #f97316, #a855f7, #3b82f6, transparent)',
        }}
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: '100%', opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.55 }}
      />

      {/* 副标题 */}
      <motion.p
        className="relative z-10 mt-2 text-xs tracking-[0.3em] text-gray-500 font-mono uppercase"
        variants={subtitleVariants}
        initial="hidden"
        animate="visible"
      >
        {SUBTITLE}
      </motion.p>
    </div>
  );
}
