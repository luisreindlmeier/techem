import { cn } from '@/lib/utils'
import type { McpBlock, McpChatResponse, McpStat, McpTone } from '@/lib/mcp'

const toneClasses: Record<McpTone, string> = {
  positive: 'text-emerald-700',
  negative: 'text-brand',
  warning:  'text-amber-700',
  neutral:  'text-stone-900',
}

function StatGrid({ stats }: { stats: McpStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={`${s.label}-${i}`}
          className="rounded-md border border-stone-200 bg-white px-3 py-2.5"
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
            {s.label}
          </div>
          <div className={cn('mt-0.5 text-sm font-semibold', toneClasses[s.tone])}>
            {s.value}
          </div>
          {s.delta && (
            <div className="mt-0.5 text-[10px] text-stone-500">{s.delta}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function Block({ block }: { block: McpBlock }) {
  if (block.kind === 'paragraph') {
    return <p className="text-sm leading-relaxed text-stone-700">{block.text}</p>
  }
  if (block.kind === 'note') {
    return (
      <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
        {block.text}
      </div>
    )
  }
  if (block.kind === 'stats' && block.stats) {
    return <StatGrid stats={block.stats} />
  }
  if (block.kind === 'list' && block.items) {
    return (
      <div className="flex flex-col gap-1.5">
        {block.text && (
          <div className="text-xs font-medium uppercase tracking-wider text-stone-400">
            {block.text}
          </div>
        )}
        <ul className="flex flex-col gap-1.5 pl-4 text-sm text-stone-700 [&>li]:list-disc">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    )
  }
  return null
}

export function McpUserMessage({ text }: { text: string }) {
  return (
    <div className="flex animate-mcp-fade-in justify-end">
      <div className="max-w-[85%] rounded-md bg-stone-950 px-4 py-2.5 text-sm text-white">
        {text}
      </div>
    </div>
  )
}

export function McpAssistantMessage({ response }: { response: McpChatResponse }) {
  return (
    <div className="flex animate-mcp-fade-in flex-col gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
        {response.title}
      </div>
      <div className="flex flex-col gap-3">
        {response.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
      {response.sources.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {response.sources.map((s) => (
            <span
              key={s}
              className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[10px] text-stone-500"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function McpErrorMessage({ text }: { text: string }) {
  return (
    <div className="animate-mcp-fade-in rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {text}
    </div>
  )
}
