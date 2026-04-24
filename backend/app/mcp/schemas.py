from typing import Literal

from pydantic import BaseModel


Tone = Literal["positive", "negative", "neutral", "warning"]


class McpStat(BaseModel):
    label: str
    value: str
    delta: str | None = None
    tone: Tone = "neutral"


class McpCard(BaseModel):
    title: str
    description: str
    metric: str | None = None
    tone: Tone = "neutral"


class McpBlock(BaseModel):
    """One chunk of the chat-side (inline) answer."""
    kind: Literal["paragraph", "list", "stats", "note"]
    text: str | None = None
    items: list[str] | None = None
    stats: list[McpStat] | None = None


class McpReportSection(BaseModel):
    heading: str
    kind: Literal["paragraph", "list", "stats", "cards"]
    paragraph: str | None = None
    items: list[str] | None = None
    stats: list[McpStat] | None = None
    cards: list[McpCard] | None = None


class McpReport(BaseModel):
    title: str
    subtitle: str
    generated_at: str
    sections: list[McpReportSection]


class McpChatRequest(BaseModel):
    prompt: str


class McpChatResponse(BaseModel):
    tool: str
    title: str
    blocks: list[McpBlock]
    report: McpReport | None = None
    sources: list[str]
    stages: list[str]
