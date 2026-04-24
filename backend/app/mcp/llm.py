"""OpenAI-driven agent loop that reasons over the MCP tools.

Flow:
  user prompt
    → GPT with TOOL schemas
    → GPT emits tool_calls
    → we execute them against Supabase / Open-Meteo / forecast services
    → results fed back
    → GPT produces final natural-language answer
  We collect the sources used and (if generate_portfolio_report was called)
  attach the produced report to the response so it shows in the sidebar.
"""
from __future__ import annotations

import json
import logging

from openai import OpenAI

from app.config import settings
from app.mcp.llm_tools import (
    OPENAI_TOOL_SCHEMAS,
    TOOL_FUNCTIONS,
    TOOL_SOURCE_LABELS,
)
from app.mcp.schemas import McpBlock, McpChatResponse, McpReport


logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """\
You are Techem MCP — a portfolio-intelligence assistant for a property energy management system.

You have tools to read the live portfolio data (properties, annual energy / cost / CO₂ stats, \
energy-mix breakdown, forecasts, anomaly scans, and a full report generator). Use them. \
Never fabricate numbers — if a tool can give you the number, call it.

Guidelines:
- Answer in English, in a concise, executive tone. No filler.
- Lead with the answer. Facts first, context second.
- When showing numbers, include units (kWh, MWh, € , kg CO₂e).
- Call multiple tools when needed. Don't guess.
- Only call generate_portfolio_report when the user explicitly asks for a full report / overview / executive summary.
- If a tool returns an error or nothing useful, say so plainly rather than making something up.
- Keep the final answer under ~180 words unless the user asked for more detail.
"""

MAX_ITERATIONS = 5
DEFAULT_STAGES = [
    "Thinking…",
    "Calling MCP tools…",
    "Reading portfolio data…",
    "Composing answer…",
]


def _execute_tool(name: str, args: dict) -> tuple[dict, McpReport | None]:
    """Run a tool and peel off the report handle if present."""
    func = TOOL_FUNCTIONS.get(name)
    if func is None:
        return {"error": f"unknown tool {name}"}, None
    try:
        result = func(**args)
    except TypeError as exc:
        return {"error": f"invalid arguments for {name}: {exc}"}, None
    except Exception as exc:
        logger.exception("tool %s failed", name)
        return {"error": f"{name} failed: {exc}"}, None

    if isinstance(result, dict) and "_report" in result:
        report = result.pop("_report")
        return result, report

    return result, None


def run_llm_chat(prompt: str) -> McpChatResponse:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = OpenAI(api_key=settings.openai_api_key)

    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": prompt},
    ]

    report: McpReport | None = None
    sources: list[str] = []
    seen_sources: set[str] = set()

    for iteration in range(MAX_ITERATIONS):
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            tools=OPENAI_TOOL_SCHEMAS,
            temperature=0.2,
        )
        msg = response.choices[0].message

        if not msg.tool_calls:
            # Final natural-language answer.
            text = (msg.content or "").strip() or "No answer produced."
            return McpChatResponse(
                tool="llm",
                title="Techem MCP",
                blocks=[McpBlock(kind="paragraph", text=text)],
                report=report,
                sources=sources,
                stages=DEFAULT_STAGES,
            )

        # Persist the assistant turn that made the tool calls.
        messages.append({
            "role": "assistant",
            "content": msg.content,
            "tool_calls": [
                {
                    "id":   tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ],
        })

        for tc in msg.tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}

            result, maybe_report = _execute_tool(name, args)
            if maybe_report is not None:
                report = maybe_report

            label = TOOL_SOURCE_LABELS.get(name)
            if label and label not in seen_sources:
                sources.append(label)
                seen_sources.add(label)

            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      json.dumps(result, default=str),
            })

    # Safety net — if the loop never terminated cleanly, return what we have.
    return McpChatResponse(
        tool="llm",
        title="Techem MCP",
        blocks=[McpBlock(
            kind="note",
            text="The model exceeded the tool-use iteration budget. Try rephrasing the question.",
        )],
        report=report,
        sources=sources,
        stages=DEFAULT_STAGES,
    )
