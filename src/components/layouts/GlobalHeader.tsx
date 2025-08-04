"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FolderHeart, TestTube, PlayCircle, FileHeart, Sparkles, User, LogOut, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { useLanguage } from "@/contexts/language-context"

export function GlobalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const { t, language } = useLanguage()

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      }
    }
    checkAuth()
  }, [pathname]) // Re-check auth when pathname changes

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const navItems = [
    {
      href: "/",
      label: t('dashboard.title'),
      icon: Home,
    },
    {
      href: "/projects",
      label: t('common.projects'),
      icon: FolderHeart,
    },
    {
      href: "/test-suites",
      label: t('common.testSuites'),
      icon: TestTube,
    },
    {
      href: "/reports",
      label: t('common.reports'),
      icon: FileHeart,
    },
    {
      href: "/settings",
      label: t('common.settings'),
      icon: Sparkles,
    },
    {
      href: "/help",
      label: t('common.help'),
      icon: HelpCircle,
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <TestTube className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-xl">Web Test Forge for Next.js</span>
            </Link>
            <span className="text-xs text-gray-500">Powered By Cruzy Japan</span>
            
            <nav className={cn("hidden md:flex items-center", language === 'ja' ? "space-x-0" : "space-x-1")}>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href !== "/" && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-lg transition-colors",
                      isActive
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      language === 'ja' 
                        ? "text-xs px-2 py-2 space-x-1" 
                        : "px-4 py-2 space-x-2"
                    )}
                  >
                    <Icon className={language === 'ja' ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">{user.name || user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100] bg-white border shadow-lg">
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('common.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('common.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" onClick={() => router.push('/login')}>
                {t('auth.login')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}