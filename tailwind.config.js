/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // 标题/展示字体 - Fraunces (温暖有机的衬线字体)
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        // 正文字体 - Source Sans 3 (温暖友好的无衬线)
        body: [
          'var(--font-source-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        // 数据/统计字体 - JetBrains Mono (清晰醒目的等宽字体)
        data: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
        // 中文字体回退
        chinese: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif'],
      },
      animation: {
        snowfall: 'snowfall linear infinite',
        twinkle: 'twinkle 2s ease-in-out infinite',
        'steam-rise': 'steam-rise ease-out infinite',
      },
      keyframes: {
        snowfall: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(360deg)', opacity: '0' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        'steam-rise': {
          '0%': { opacity: '0', transform: 'translateY(0) scale(1)' },
          '20%': { opacity: '0.6' },
          '100%': { opacity: '0', transform: 'translateY(-120px) scale(2.5)' },
        },
      },
      colors: {
        // 乌克兰蓝色系 - 信任、和平、天空
        ukraine: {
          blue: {
            50: '#E8F7FC',
            100: '#C0E8F7',
            200: '#8DD5F0',
            300: '#52BFE8',
            400: '#1FA8E1',
            500: '#076CB3', // Logo 蓝色 - UI 主色
            600: '#065A96',
            700: '#054878',
            800: '#04375B',
            900: '#02263E',
          },
          // 乌克兰金色系 - 希望、行动、麦田
          gold: {
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#F5B800', // 主色 - CTA 按钮
            600: '#D19A00',
            700: '#A67C00',
            800: '#7C5D00',
            900: '#523E00',
          },
        },
        // 温暖橙色系 - 紧迫、警告、失败
        warm: {
          50: '#FEF7F4',
          100: '#FDEBE4',
          200: '#FBCFBE',
          300: '#F7A989',
          400: '#F28354',
          500: '#E76F51',
          600: '#C85A3D',
          700: '#A54632',
          800: '#843628',
          900: '#6B2D21',
        },
        // 生命绿色系 - 成功、完成
        life: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        // 圣诞主题色系 - 温暖童话风格
        christmas: {
          // 酒红色 - 温暖、节日
          berry: {
            DEFAULT: '#9B2335',
            light: '#C4384C',
            dark: '#721A28',
          },
          // 松绿色 - 自然、永恒
          pine: {
            DEFAULT: '#1B4332',
            light: '#2D6A4F',
            dark: '#132A21',
          },
          // 暖金色 - 希望、魔法
          gold: {
            DEFAULT: '#D4AF37',
            light: '#E5C861',
            dark: '#B8962E',
          },
          // 奶油白 - 雪景、温馨
          cream: {
            DEFAULT: '#FDF8F3',
            dark: '#F5EBE0',
          },
        },
      },
    },
  },
  plugins: [],
}
