'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Laptop } from 'lucide-react'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center space-x-1 rounded-full border border-border p-1">
      <button 
        onClick={() => setTheme('light')} 
        className={`p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-surface-hover' : 'hover:bg-surface-hover'}`}
        aria-label="Light theme"
      >
        <Sun className="h-5 w-5 text-text-primary" />
      </button>
      <button 
        onClick={() => setTheme('dark')} 
        className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-surface-hover' : 'hover:bg-surface-hover'}`}
        aria-label="Dark theme"
      >
        <Moon className="h-5 w-5 text-text-primary" />
      </button>
      <button 
        onClick={() => setTheme('system')} 
        className={`p-2 rounded-full transition-colors ${theme === 'system' ? 'bg-surface-hover' : 'hover:bg-surface-hover'}`}
        aria-label="System theme"
      >
        <Laptop className="h-5 w-5 text-text-primary" />
      </button>
    </div>
  )
}