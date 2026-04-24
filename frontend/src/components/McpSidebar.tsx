import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import type { McpReport, McpReportSection, McpStat, McpTone } from '@/lib/mcp'

const MIN_WIDTH     = 22
const MAX_WIDTH     = 60
const DEFAULT_WIDTH = 34

const toneClasses: Record<McpTone, string> = {
  positive: 'text-emerald-700',
  negative: 'text-brand',
  warning:  'text-amber-700',
  neutral:  'text-stone-900',
}

const cardBorderTone: Record<McpTone, string> = {
  positive: 'border-emerald-200',
  negative: 'border-brand/40',
  warning:  'border-amber-200',
  neutral:  'border-stone-200',
}

type McpSidebarProps = {
  isOpen: boolean
  report: McpReport | null
}

function StatRow({ stat }: { stat: McpStat }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
        {stat.label}
      </div>
      <div className={cn('mt-0.5 text-sm font-semibold', toneClasses[stat.tone])}>
        {stat.value}
      </div>
      {stat.delta && (
        <div className="mt-0.5 text-[10px] text-stone-500">{stat.delta}</div>
      )}
    </div>
  )
}

function Section({ section, index }: { section: McpReportSection; index: number }) {
  return (
    <section
      className="flex animate-mcp-fade-in flex-col gap-2"
      style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {section.heading}
      </h3>

      {section.kind === 'paragraph' && section.paragraph && (
        <p className="text-sm leading-relaxed text-stone-700">{section.paragraph}</p>
      )}

      {section.kind === 'list' && section.items && (
        <ul className="flex flex-col gap-1.5 pl-4 text-sm text-stone-700 [&>li]:list-disc">
          {section.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      {section.kind === 'stats' && section.stats && (
        <div className="grid grid-cols-2 gap-2">
          {section.stats.map((s, i) => (
            <StatRow key={`${s.label}-${i}`} stat={s} />
          ))}
        </div>
      )}

      {section.kind === 'cards' && section.cards && (
        <div className="flex flex-col gap-2">
          {section.cards.map((c, i) => (
            <div
              key={i}
              className={cn('rounded-md border bg-white p-3', cardBorderTone[c.tone])}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-stone-900">{c.title}</p>
                {c.metric && (
                  <span className={cn('shrink-0 text-xs font-semibold', toneClasses[c.tone])}>
                    {c.metric}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">{c.description}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function McpSidebar({ isOpen, report }: McpSidebarProps) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const [dragging,   setDragging]   = useState(false)

  const dragRef = useRef({ active: false, startX: 0, startW: 0 })

  function handleDragStart(e: React.MouseEvent) {
    dragRef.current = { active: true, startX: e.clientX, startW: panelWidth }
    setDragging(true)
    e.preventDefault()
    document.body.style.userSelect = 'none'
    document.body.style.cursor     = 'col-resize'
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current.active) return
      const delta = ((dragRef.current.startX - e.clientX) / window.innerWidth) * 100
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragRef.current.startW + delta)))
    }
    function onUp() {
      if (!dragRef.current.active) return
      dragRef.current.active         = false
      setDragging(false)
      document.body.style.userSelect = ''
      document.body.style.cursor     = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  return (
    <div
      className="relative h-full flex-shrink-0 overflow-hidden"
      style={{
        width:      isOpen ? `${panelWidth}%` : 0,
        transition: dragging ? 'none' : 'width 300ms ease-in-out',
      }}
    >
      <div className="absolute inset-3 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl">
        <div
          className="absolute left-0 top-0 z-10 h-full w-3 cursor-col-resize"
          onMouseDown={handleDragStart}
        />

        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                Report
              </p>
              <h2 className="mt-0.5 truncate text-sm font-semibold text-stone-900">
                {report?.title ?? 'No report generated'}
              </h2>
              {report?.subtitle && (
                <p className="mt-0.5 truncate text-[11px] text-stone-400">{report.subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {report ? (
              <div className="flex flex-col gap-5">
                {report.sections.map((section, i) => (
                  <Section key={i} section={section} index={i} />
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-stone-500">Nothing here yet</p>
                <p className="max-w-xs text-xs text-stone-400">
                  Ask Techem MCP to generate a portfolio report — it will render in this panel.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
