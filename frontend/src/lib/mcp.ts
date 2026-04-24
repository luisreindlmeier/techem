const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export type McpTone = 'positive' | 'negative' | 'neutral' | 'warning'

export type McpStat = {
  label: string
  value: string
  delta: string | null
  tone: McpTone
}

export type McpCard = {
  title: string
  description: string
  metric: string | null
  tone: McpTone
}

export type McpBlock = {
  kind: 'paragraph' | 'list' | 'stats' | 'note'
  text: string | null
  items: string[] | null
  stats: McpStat[] | null
}

export type McpReportSection = {
  heading: string
  kind: 'paragraph' | 'list' | 'stats' | 'cards'
  paragraph: string | null
  items: string[] | null
  stats: McpStat[] | null
  cards: McpCard[] | null
}

export type McpReport = {
  title: string
  subtitle: string
  generated_at: string
  sections: McpReportSection[]
}

export type McpChatResponse = {
  tool: string
  title: string
  blocks: McpBlock[]
  report: McpReport | null
  sources: string[]
  stages: string[]
}

export async function postMcpChat(prompt: string): Promise<McpChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/mcp/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) {
    throw new Error(`MCP chat failed: ${res.status}`)
  }
  return res.json() as Promise<McpChatResponse>
}
