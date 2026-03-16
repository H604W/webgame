/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        /* 标题熔岩流光：渐变色位移 */
        'lava-flow': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        /* 标题字符弹入 */
        'char-pop': {
          '0%':   { opacity: '0', transform: 'translateY(24px) scale(0.7)' },
          '60%':  { opacity: '1', transform: 'translateY(-4px) scale(1.05)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        /* 副标题淡入上移 */
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        /* 脉冲光晕 */
        'pulse-glow': {
          '0%, 100%': { opacity: '0.15', transform: 'scale(1)' },
          '50%':      { opacity: '0.35', transform: 'scale(1.08)' },
        },
        /* 浮动粒子 */
        'float-y': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-16px)' },
        },
        /* 扫描线 */
        'scan-line': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        /* 边框流光 */
        'border-glow': {
          '0%, 100%': { boxShadow: '0 0 6px rgba(99,102,241,0.4)' },
          '50%':      { boxShadow: '0 0 18px rgba(99,102,241,0.8), 0 0 36px rgba(99,102,241,0.3)' },
        },
      },
      animation: {
        'lava-flow':   'lava-flow 4s ease infinite',
        'char-pop':    'char-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        'fade-up':     'fade-up 0.6s ease both',
        'pulse-glow':  'pulse-glow 3s ease-in-out infinite',
        'float-y':     'float-y 4s ease-in-out infinite',
        'scan-line':   'scan-line 8s linear infinite',
        'border-glow': 'border-glow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
