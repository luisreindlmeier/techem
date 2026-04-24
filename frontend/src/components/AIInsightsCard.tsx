import { useEffect, useRef, useState } from 'react'
import { ArrowUpIcon, SparklesIcon } from '@heroicons/react/24/outline'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getDashboardAISummary } from '@/lib/api'

type AIInsightsCardProps = {
  onOpenChat?: (prompt: string) => void
}

export function AIInsightsCard({ onOpenChat }: AIInsightsCardProps) {
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const streamRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (streamRef.current !== null) window.clearTimeout(streamRef.current)
    }
  }, [])

  function streamOut(text: string) {
    setSummary('')
    let i = 0
    const tick = () => {
      i = Math.min(text.length, i + Math.max(2, Math.floor(text.length / 120)))
      setSummary(text.slice(0, i))
      if (i < text.length) {
        streamRef.current = window.setTimeout(tick, 18)
      } else {
        setRunning(false)
      }
    }
    tick()
  }

  async function handleGenerate() {
    setRunning(true)
    setError(null)
    setSummary('')
    try {
      const response = await getDashboardAISummary()
      streamOut(response.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
      setRunning(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const prompt = input.trim()
    if (!prompt) return
    onOpenChat?.(prompt)
    setInput('')
  }

  return (
    <article className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
            AI insights
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-stone-900">Portfolio summary</h3>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10">
          <SparklesIcon className="h-4 w-4 text-brand" />
        </div>
      </div>

      <div className="mt-4 min-h-[100px] rounded-md border border-stone-100 bg-stone-50 p-3">
        {summary ? (
          <p className="text-xs leading-relaxed text-stone-700">
            {summary}
            {running && <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse bg-stone-500" />}
          </p>
        ) : error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : (
          <p className="text-xs italic text-stone-400">
            Generate a natural-language executive summary from the portfolio snapshot.
          </p>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        onClick={handleGenerate}
        disabled={running}
        className="mt-3 w-full bg-stone-900 text-white hover:bg-stone-800"
      >
        {running ? 'Generating…' : summary ? 'Regenerate summary' : 'Generate Portfolio Summary'}
      </Button>

      <form
        onSubmit={handleSubmit}
        className={cn(
          'mt-4 flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2 py-1.5',
          'transition-colors focus-within:border-brand',
        )}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="min-w-0 flex-1 bg-transparent text-xs text-stone-900 outline-none placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={input.trim().length === 0}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-stone-200 disabled:text-stone-400"
          title="Open MCP chat"
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
      </form>
    </article>
  )
}
