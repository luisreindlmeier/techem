import { useState } from 'react'
import {
  ArrowUpIcon,
  BoltIcon,
  ChartPieIcon,
  CpuChipIcon,
  PaperClipIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SuggestionPrompt = {
  label: string
  description: string
  icon: React.ElementType
}

const suggestions: SuggestionPrompt[] = [
  {
    label: 'Summarize portfolio',
    description: 'Give me a structured overview of my portfolio performance this quarter.',
    icon: ChartPieIcon,
  },
  {
    label: 'Detect anomalies',
    description: 'Identify properties with unusual energy or emission patterns.',
    icon: BoltIcon,
  },
  {
    label: 'Forecast emissions',
    description: 'Project CO2 emissions for the top 5 properties over the next 12 months.',
    icon: CpuChipIcon,
  },
]

export function McpPage() {
  const [input, setInput] = useState('')

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-400">
              <SparklesIcon className="h-3.5 w-3.5 text-brand" />
              <span>Techem MCP</span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              Ask anything about your portfolio
            </h1>
            <p className="text-sm leading-relaxed text-stone-500">
              Natural-language access to your buildings, sensors, and forecasts. Powered by the
              Techem MCP server and a structured LLM response layer.
            </p>
          </header>

          <section className="flex flex-col gap-3">
            <div className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Suggested prompts
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => setInput(suggestion.description)}
                  className="group flex h-full flex-col gap-2 rounded-md border border-stone-200 bg-white p-4 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"
                >
                  <div className="flex items-center gap-2">
                    <suggestion.icon className="h-4 w-4 text-stone-500 group-hover:text-brand" />
                    <span className="text-sm font-medium text-stone-900">{suggestion.label}</span>
                  </div>
                  <span className="text-xs leading-relaxed text-stone-500">
                    {suggestion.description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed border-stone-200 bg-white/60 p-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-100">
              <SparklesIcon className="h-5 w-5 text-stone-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-stone-900">No conversation yet</p>
            <p className="mt-1 max-w-sm text-xs text-stone-500">
              Send a prompt to receive a structured response from the Techem MCP layer.
              Responses will appear here with sections, sources, and suggested actions.
            </p>
          </section>
        </div>
      </div>

      <div className="border-t border-stone-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <form
            onSubmit={(event) => {
              event.preventDefault()
            }}
            className={cn(
              'flex flex-col gap-2 rounded-md border border-stone-300 bg-white p-3 shadow-sm transition-colors',
              'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
            )}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Techem MCP about your portfolio…"
              rows={2}
              className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-stone-950 outline-none placeholder:text-stone-400"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
                  title="Attach context"
                >
                  <PaperClipIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
                  title="Select MCP tool"
                >
                  <CpuChipIcon className="h-3.5 w-3.5" />
                  <span>MCP tools</span>
                </button>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={input.trim().length === 0}
                className="h-8 w-8 rounded-md bg-brand p-0 text-white hover:bg-brand/90 disabled:bg-stone-200 disabled:text-stone-400"
                title="Send"
              >
                <ArrowUpIcon className="h-4 w-4" />
              </Button>
            </div>
          </form>
          <p className="mt-2 text-center text-[11px] text-stone-400">
            Techem MCP can make mistakes. Verify critical decisions with raw data.
          </p>
        </div>
      </div>
    </div>
  )
}
