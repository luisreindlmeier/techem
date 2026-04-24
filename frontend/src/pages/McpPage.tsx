import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpIcon,
  BoltIcon,
  ChartPieIcon,
  CpuChipIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline'

import { Button } from '@/components/ui/button'
import { McpLoader } from '@/components/McpLoader'
import { McpSidebar } from '@/components/McpSidebar'
import {
  McpAssistantMessage,
  McpErrorMessage,
  McpUserMessage,
} from '@/components/McpMessage'
import { postMcpChat, type McpChatResponse, type McpReport } from '@/lib/mcp'
import { cn } from '@/lib/utils'

type SuggestionPrompt = {
  label: string
  description: string
  icon: React.ElementType
  stages: string[]
}

const suggestions: SuggestionPrompt[] = [
  {
    label: 'Summarize portfolio',
    description: 'Give me a structured overview of my portfolio performance this quarter.',
    icon: ChartPieIcon,
    stages: [
      'Reading portfolio index…',
      'Aggregating annual stats…',
      'Ranking consumers…',
    ],
  },
  {
    label: 'Detect anomalies',
    description: 'Identify properties with unusual energy or emission patterns.',
    icon: BoltIcon,
    stages: [
      'Loading per-property stats…',
      'Normalizing by unit count…',
      'Computing z-scores…',
      'Flagging outliers…',
    ],
  },
  {
    label: 'Generate full report',
    description: 'Generate the quarterly portfolio intelligence report with retrofit recommendations.',
    icon: DocumentChartBarIcon,
    stages: [
      'Reading portfolio index…',
      'Aggregating annual load per property…',
      'Ranking efficiency leaders…',
      'Modelling retrofit potential…',
      'Composing report…',
    ],
  },
]

const DEFAULT_STAGES = [
  'Thinking…',
  'Reading portfolio data…',
  'Analyzing patterns…',
  'Composing answer…',
]

type ChatMessage =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; response: McpChatResponse }
  | { id: number; role: 'error'; text: string }

export function McpPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [currentStages, setCurrentStages] = useState<string[]>(DEFAULT_STAGES)
  const [report, setReport] = useState<McpReport | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const messageIdRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const hasConversation = messages.length > 0 || loading
  const canShowPanel = report !== null

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  async function submitPrompt(prompt: string, stages: string[] = DEFAULT_STAGES) {
    const trimmed = prompt.trim()
    if (!trimmed || loading) return

    const userId = ++messageIdRef.current
    setMessages((m) => [...m, { id: userId, role: 'user', text: trimmed }])
    setInput('')
    setCurrentStages(stages)
    setLoading(true)

    try {
      const response = await postMcpChat(trimmed)
      const assistantId = ++messageIdRef.current
      setMessages((m) => [...m, { id: assistantId, role: 'assistant', response }])
      if (response.report) {
        setReport(response.report)
        setPanelOpen(true)
      }
    } catch (err) {
      const errorId = ++messageIdRef.current
      const text = err instanceof Error ? err.message : 'Techem MCP is unreachable.'
      setMessages((m) => [...m, { id: errorId, role: 'error', text }])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    submitPrompt(input)
  }

  function handleSuggestion(s: SuggestionPrompt) {
    submitPrompt(s.description, s.stages)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden px-4 pt-5 sm:px-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <header className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wider text-stone-400">
                  Techem MCP
                </div>
                {canShowPanel && (
                  <Button
                    size="sm"
                    onClick={() => setPanelOpen((prev) => !prev)}
                    className="animate-mcp-fade-in rounded-md border border-stone-950 bg-transparent text-xs text-stone-950 shadow-none hover:bg-stone-100"
                  >
                    {panelOpen ? 'Close panel' : 'Open panel'}
                  </Button>
                )}
              </div>
              {!hasConversation && (
                <>
                  <h1 className="text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
                    Ask anything about your portfolio
                  </h1>
                  <p className="text-sm leading-relaxed text-stone-500">
                    Natural-language access to your buildings, sensors, and forecasts. Powered by the
                    Techem MCP server and a structured LLM response layer.
                  </p>
                </>
              )}
            </header>

            {!hasConversation && (
              <section className="flex flex-col gap-3">
                <div className="text-xs font-medium uppercase tracking-wider text-stone-400">
                  Suggested prompts
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => handleSuggestion(suggestion)}
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
            )}
          </div>

          <div
            ref={scrollRef}
            className="mt-4 flex-1 overflow-y-auto"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-6">
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return <McpUserMessage key={msg.id} text={msg.text} />
                }
                if (msg.role === 'assistant') {
                  return <McpAssistantMessage key={msg.id} response={msg.response} />
                }
                return <McpErrorMessage key={msg.id} text={msg.text} />
              })}

              {loading && (
                <div className="animate-mcp-fade-in">
                  <McpLoader stages={currentStages} />
                </div>
              )}

              {!hasConversation && (
                <div className="flex flex-1 items-center justify-center py-6">
                  <p className="text-xs text-stone-400">
                    No conversation yet — send a prompt to get a structured response.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <form
              onSubmit={handleSubmit}
              className={cn(
                'flex flex-col gap-2 rounded-md border border-stone-300 bg-white p-3 shadow-sm transition-colors',
                'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
              )}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    submitPrompt(input)
                  }
                }}
                placeholder="Ask Techem MCP about your portfolio…"
                rows={2}
                disabled={loading}
                className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-stone-950 outline-none placeholder:text-stone-400 disabled:opacity-60"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
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
                  disabled={input.trim().length === 0 || loading}
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

      <McpSidebar isOpen={panelOpen && canShowPanel} report={report} />
    </div>
  )
}
