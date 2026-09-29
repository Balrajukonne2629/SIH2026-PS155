/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        slate: {
          50:  'rgb(var(--color-slate-50) / <alpha-value>)',
          100: 'rgb(var(--color-slate-100) / <alpha-value>)',
          200: 'rgb(var(--color-slate-200) / <alpha-value>)',
          300: 'rgb(var(--color-slate-300) / <alpha-value>)',
          400: 'rgb(var(--color-slate-400) / <alpha-value>)',
          500: 'rgb(var(--color-slate-500) / <alpha-value>)',
          600: 'rgb(var(--color-slate-600) / <alpha-value>)',
          700: 'rgb(var(--color-slate-700) / <alpha-value>)',
          800: 'rgb(var(--color-slate-800) / <alpha-value>)',
          900: 'rgb(var(--color-slate-900) / <alpha-value>)',
          950: 'rgb(var(--color-slate-950) / <alpha-value>)',
        },
        app: 'var(--bg-app)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          raised: 'var(--bg-surface-raised)',
          elevated: 'var(--bg-surface-elevated)',
          hover: 'var(--bg-surface-hover)',
          input: 'var(--bg-input)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          subtle: 'var(--accent-subtle)',
        },
        status: {
          pass: 'var(--status-pass)',
          fail: 'var(--status-fail)',
          unknown: 'var(--status-unknown)',
          info: 'var(--status-info)',
          processing: 'var(--status-processing)',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace']
      }
    },
  },
  plugins: [],
}
