import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import type { AnimationItem } from 'lottie-web'
import {
  ArrowRightStartOnRectangleIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'

import { cn } from '@/lib/utils'

export type Page = 'dashboard' | 'portfolio' | 'analytics' | 'mcp' | 'settings'

type SidebarNavProps = {
  isMobileOpen: boolean
  onCloseMobile: () => void
  activePage: Page
  onNavigate: (page: Page) => void
}

const navigationItems: { label: string; page: Page; icon: React.ElementType }[] = [
  { label: 'Dashboard', page: 'dashboard', icon: Squares2X2Icon },
  { label: 'Portfolio', page: 'portfolio', icon: BuildingOffice2Icon },
  { label: 'Analytics', page: 'analytics', icon: ChartBarIcon },
  { label: 'Techem MCP', page: 'mcp', icon: ChatBubbleLeftRightIcon },
]

function LottieIcon({
  path,
  playing,
  active,
  className,
}: {
  path: string
  playing: boolean
  active: boolean
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<AnimationItem | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path,
    })
    animRef.current = anim
    return () => anim.destroy()
  }, [path])

  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    if (playing) {
      anim.setDirection(1)
      anim.play()
    } else {
      anim.setDirection(-1)
      anim.play()
    }
  }, [playing])

  return (
    <div
      ref={containerRef}
      className={cn(
        'shrink-0 [&_path]:transition-none [&_svg]:overflow-visible',
        active ? '[&_path]:stroke-brand' : '[&_path]:stroke-stone-500',
        className,
      )}
    />
  )
}

export function SidebarNav({ isMobileOpen, onCloseMobile, activePage, onNavigate }: SidebarNavProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [settingsHovered, setSettingsHovered] = useState(false)

  return (
    <>
      <div
        className={cn('fixed inset-0 z-[70] bg-stone-950/20 md:hidden', isMobileOpen ? 'block' : 'hidden')}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-[80] h-screen w-56 border-r border-stone-200 bg-white/95 backdrop-blur-sm transition-transform duration-200 ease-out md:sticky md:z-10 md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-center px-3 py-2">
            <img
              src="/techem-horizon-logo.png"
              alt="Techem Horizon"
              className="h-16 w-auto max-w-[160px] object-contain"
            />
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 p-2">
            {navigationItems.map((item) => {
              const active = activePage === item.page
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => {
                    onNavigate(item.page)
                    onCloseMobile()
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand/[0.07] text-brand'
                      : 'text-stone-700 hover:bg-stone-100 hover:text-stone-950',
                  )}
                >
                  <item.icon
                    className={cn('h-5 w-5 shrink-0', active ? 'text-brand' : 'text-stone-500')}
                  />
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="border-t border-stone-200 p-2">
            {userMenuOpen && (
              <button
                type="button"
                onClick={() => setUserMenuOpen(false)}
                className="mb-0.5 flex w-full items-center gap-3 rounded-md px-3 py-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium">Sign out</span>
              </button>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-2 transition-colors',
                  userMenuOpen ? 'bg-stone-100' : 'hover:bg-stone-100',
                )}
              >
                <img
                  src="/futury-logo.png"
                  alt="Futury"
                  className="h-9 w-9 shrink-0 rounded-md object-contain"
                />
                <div className="flex min-w-0 flex-col text-left">
                  <span className="truncate text-xs font-semibold text-stone-900">Futury</span>
                  <span className="truncate text-[10px] text-stone-400">Premium License</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('settings')
                  onCloseMobile()
                }}
                onMouseEnter={() => setSettingsHovered(true)}
                onMouseLeave={() => setSettingsHovered(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                title="Settings"
              >
                <LottieIcon
                  path="/animations/settings.json"
                  playing={settingsHovered || activePage === 'settings'}
                  active={activePage === 'settings'}
                  className="h-5 w-5"
                />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
