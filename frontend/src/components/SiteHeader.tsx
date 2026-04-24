import { useEffect, useRef, useState } from 'react'

import lottie, { type AnimationItem } from 'lottie-web'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import { Input } from '@/components/ui/input'
import { getProperties } from '@/lib/api'
import type { PropertyItem } from '@/lib/types'

type SiteHeaderProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  isMobileSidebarOpen: boolean
  onToggleSidebar: () => void
  selectedPropertyId: number | null
  onPropertyChange: (id: number | null) => void
}

const CLOSED_FRAME = 0
const OPEN_FRAME = 45
const END_FRAME = 60

export function SiteHeader({
  searchQuery,
  onSearchChange,
  isMobileSidebarOpen,
  onToggleSidebar,
  selectedPropertyId,
  onPropertyChange,
}: SiteHeaderProps) {
  const mobileMenuAnimationHostRef = useRef<HTMLSpanElement | null>(null)
  const mobileMenuAnimationRef = useRef<AnimationItem | null>(null)
  const [properties, setProperties] = useState<PropertyItem[]>([])

  useEffect(() => {
    getProperties()
      .then(setProperties)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!mobileMenuAnimationHostRef.current) {
      return
    }

    const animation = lottie.loadAnimation({
      container: mobileMenuAnimationHostRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: '/animations/menu.json',
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    })

    mobileMenuAnimationRef.current = animation

    animation.addEventListener('DOMLoaded', () => {
      animation.goToAndStop(CLOSED_FRAME, true)
    })

    return () => {
      animation.destroy()
      mobileMenuAnimationRef.current = null
    }
  }, [])

  useEffect(() => {
    const animation = mobileMenuAnimationRef.current
    if (!animation) {
      return
    }

    if (isMobileSidebarOpen) {
      animation.playSegments([CLOSED_FRAME, OPEN_FRAME], true)
      return
    }

    animation.playSegments([OPEN_FRAME, END_FRAME], true)
  }, [isMobileSidebarOpen])

  return (
    <header className="sticky top-0 z-[60] h-16 border-b border-stone-200 bg-white/95 backdrop-blur-sm md:z-30">
      <button
        type="button"
        className="fixed right-3 top-3 z-[90] inline-flex h-10 w-10 items-center justify-center p-0 text-stone-900 md:hidden"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
        aria-expanded={isMobileSidebarOpen}
      >
        <span ref={mobileMenuAnimationHostRef} className="h-8 w-8" aria-hidden="true" />
      </button>

      <div className="flex h-full items-center px-3 md:px-4">
        <div className="hidden w-full items-center gap-2 md:flex">
          <label className="relative block min-w-0 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              type="search"
              placeholder="Search"
              aria-label="Search"
              className="h-10 border-stone-200 bg-stone-50 pl-10 text-sm text-stone-950 placeholder:text-stone-400 focus-visible:border-[#E30613] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </label>

          <label className="w-52 shrink-0">
            <span className="sr-only">Gebäude auswählen</span>
            <select
              className="h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#E30613] focus:ring-0"
              value={selectedPropertyId ?? ''}
              onChange={(e) => {
                const val = e.target.value
                onPropertyChange(val === '' ? null : Number(val))
              }}
              aria-label="Gebäude auswählen"
            >
              <option value="">Alle Gebäude</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.city} · {p.zipcode}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  )
}
