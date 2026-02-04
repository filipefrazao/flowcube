'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Laptop } from 'lucide-react'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center space-x-1 rounded-full border border-gray-200 dark:border-gray-700 p-1">
      <button 
        onClick={() => setTheme('light')} 
        className={`p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        aria-label="Light theme"
      >
        <Sun className="h-5 w-5 text-gray-800 dark:text-gray-200" />
      </button>
      <button 
        onClick={() => setTheme('dark')} 
        className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        aria-label="Dark theme"
      >
        <Moon className="h-5 w-5 text-gray-800 dark:text-gray-200" />
      </button>
      <button 
        onClick={() => setTheme('system')} 
        className={`p-2 rounded-full transition-colors ${theme === 'system' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        aria-label="System theme"
      >
        <Laptop className="h-5 w-5 text-gray-800 dark:text-gray-200" />
      </button>
    </div>
  )
}