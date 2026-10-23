import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? 'is-dark' : ''}`}
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={onToggle}
    >
      <span className="theme-toggle-thumb" aria-hidden="true">
        <Sun className="theme-toggle-icon theme-toggle-sun" size={16} />
        <Moon className="theme-toggle-icon theme-toggle-moon" size={16} />
      </span>
    </button>
  )
}
