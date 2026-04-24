import {
  BellIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'

import { cn } from '@/lib/utils'

export type Page = 'dashboard' | 'portfolio' | 'analytics' | 'alerts' | 'settings'

type SidebarNavProps = {
  isMobileOpen: boolean
  onCloseMobile: () => void
  activePage: Page
  onNavigate: (page: Page) => void
}

const navigationItems: { label: string; page: Page; icon: React.ElementType }[] = [
  { label: 'Dashboard',  page: 'dashboard',  icon: Squares2X2Icon      },
  { label: 'Portfolio',  page: 'portfolio',  icon: BuildingOffice2Icon  },
  { label: 'Analytics',  page: 'analytics',  icon: ChartBarIcon         },
  { label: 'Alerts',     page: 'alerts',     icon: BellIcon             },
  { label: 'Settings',   page: 'settings',   icon: Cog6ToothIcon        },
]

export function SidebarNav({ isMobileOpen, onCloseMobile, activePage, onNavigate }: SidebarNavProps) {
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
                      ? 'bg-[#E30613]/[0.07] text-[#E30613]'
                      : 'text-stone-700 hover:bg-stone-100 hover:text-stone-950',
                  )}
                >
                  <item.icon
                    className={cn('h-5 w-5 shrink-0', active ? 'text-[#E30613]' : 'text-stone-500')}
                  />
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#E30613]" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
