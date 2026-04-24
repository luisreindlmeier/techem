import { useEffect, useRef, useState } from 'react'

import lottie, { type AnimationItem } from 'lottie-web'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PropertyItem } from '@/lib/types'

type SiteHeaderProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  isMobileSidebarOpen: boolean
  onToggleSidebar: () => void
  selectedPropertyId: number | null
  onPropertyChange: (id: number | null) => void
  properties: PropertyItem[]
}

const CLOSED_FRAME = 0
const OPEN_FRAME   = 45
const END_FRAME    = 60

const MAX_SUGGESTIONS = 8

function matches(p: PropertyItem, q: string): boolean {
  const lq = q.toLowerCase()
  return (
    (p.name ?? '').toLowerCase().includes(lq) ||
    p.city.toLowerCase().includes(lq) ||
    p.zipcode.includes(q) ||
    p.energysource.toLowerCase().includes(lq)
  )
}

export function SiteHeader({
  searchQuery,
  onSearchChange,
  isMobileSidebarOpen,
  onToggleSidebar,
  selectedPropertyId,
  onPropertyChange,
  properties,
}: SiteHeaderProps) {
  const mobileMenuAnimationHostRef = useRef<HTMLSpanElement | null>(null)
  const mobileMenuAnimationRef     = useRef<AnimationItem | null>(null)
  const searchWrapperRef           = useRef<HTMLDivElement | null>(null)

  const [showSuggestions, setShow]       = useState(false)
  const [highlightedIdx, setHighlighted] = useState(-1)

  // Close on click outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShow(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Lottie mobile menu
  useEffect(() => {
    if (!mobileMenuAnimationHostRef.current) return
    const animation = lottie.loadAnimation({
      container: mobileMenuAnimationHostRef.current,
      renderer:  'svg',
      loop:      false,
      autoplay:  false,
      path:      '/animations/menu.json',
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    })
    mobileMenuAnimationRef.current = animation
    animation.addEventListener('DOMLoaded', () => animation.goToAndStop(CLOSED_FRAME, true))
    return () => { animation.destroy(); mobileMenuAnimationRef.current = null }
  }, [])

  useEffect(() => {
    const animation = mobileMenuAnimationRef.current
    if (!animation) return
    if (isMobileSidebarOpen) { animation.playSegments([CLOSED_FRAME, OPEN_FRAME], true); return }
    animation.playSegments([OPEN_FRAME, END_FRAME], true)
  }, [isMobileSidebarOpen])

  const trimmed    = searchQuery.trim()
  const suggestions: PropertyItem[] = trimmed.length > 0
    ? properties.filter((p) => matches(p, trimmed)).slice(0, MAX_SUGGESTIONS)
    : []
  const open = showSuggestions && suggestions.length > 0

  function handleChange(value: string) {
    onSearchChange(value)
    setHighlighted(-1)
    setShow(true)
  }

  function selectSuggestion(p: PropertyItem) {
    onSearchChange(p.name ?? p.city)
    onPropertyChange(p.id)
    setShow(false)
    setHighlighted(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[highlightedIdx])
    } else if (e.key === 'Escape') {
      setShow(false)
    }
  }

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

          {/* Search with autocomplete */}
          <div ref={searchWrapperRef} className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 z-10" />
            <Input
              value={searchQuery}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setShow(true)}
              onKeyDown={handleKeyDown}
              type="search"
              placeholder="Search buildings…"
              aria-label="Search buildings"
              aria-autocomplete="list"
              aria-expanded={open}
              className="h-10 border-stone-200 bg-stone-50 pl-10 text-sm text-stone-950 placeholder:text-stone-400 focus-visible:border-[#E30613] focus-visible:ring-0 focus-visible:ring-offset-0"
            />

            {open && (
              <div
                role="listbox"
                aria-label="Building suggestions"
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-stone-200 bg-white shadow-lg"
              >
                {suggestions.map((p, i) => (
                  <button
                    key={p.id}
                    role="option"
                    type="button"
                    aria-selected={i === highlightedIdx ? 'true' : 'false'}
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(p) }}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-2.5 text-left',
                      i > 0 && 'border-t border-stone-100',
                      i === highlightedIdx ? 'bg-stone-50' : 'hover:bg-stone-50',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-900">{p.name ?? p.city}</p>
                      <p className="text-xs text-stone-400">
                        ZIP {p.zipcode} · {p.energysource}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="w-52 shrink-0">
            <span className="sr-only">Select building</span>
            <select
              className="h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#E30613] focus:ring-0"
              value={selectedPropertyId ?? ''}
              onChange={(e) => {
                const val = e.target.value
                onPropertyChange(val === '' ? null : Number(val))
              }}
              aria-label="Select building"
            >
              <option value="">All buildings</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.city} · {p.zipcode}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  )
}
