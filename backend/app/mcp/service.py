"""Prompt → response entry point.

Two modes:
  1. LLM mode (OPENAI_API_KEY set) — GPT reasons over the MCP tools and can
     answer arbitrary questions about the portfolio.
  2. Keyword mode (no key) — deterministic keyword routing to one of three
     canonical tools. Used as a reliable offline fallback so the demo still
     works without an API key.
"""
from __future__ import annotations

import logging

from app.config import settings
from app.mcp.schemas import McpChatResponse
from app.mcp.tools import SOURCES, tool_detect_anomalies, tool_generate_report, tool_portfolio_summary


logger = logging.getLogger(__name__)


REPORT_KEYWORDS = ("report", "generate", "quarterly", "executive", "intelligence", "full report")
ANOMALY_KEYWORDS = ("anomal", "unusual", "outlier", "detect", "spike", "flag")
SUMMARY_KEYWORDS = ("summar", "overview", "portfolio", "performance", "kpi", "kpis")


def _keyword_route(prompt: str) -> str:
    p = prompt.lower().strip()
    if any(k in p for k in REPORT_KEYWORDS):
        return "generate_report"
    if any(k in p for k in ANOMALY_KEYWORDS):
        return "detect_anomalies"
    if any(k in p for k in SUMMARY_KEYWORDS):
        return "portfolio_summary"
    return "portfolio_summary"


def _run_keyword(prompt: str) -> McpChatResponse:
    tool_name = _keyword_route(prompt)
    if tool_name == "generate_report":
        payload = tool_generate_report()
    elif tool_name == "detect_anomalies":
        payload = tool_detect_anomalies()
    else:
        payload = tool_portfolio_summary()

    return McpChatResponse(
        tool=payload["tool"],
        title=payload["title"],
        blocks=payload["blocks"],
        report=payload["report"],
        sources=SOURCES,
        stages=payload["stages"],
    )


def run_chat(prompt: str) -> McpChatResponse:
    if settings.openai_api_key:
        try:
            from app.mcp.llm import run_llm_chat  # lazy import: OpenAI SDK only loaded when needed
            return run_llm_chat(prompt)
        except Exception:
            logger.exception("LLM path failed; falling back to keyword router")
    return _run_keyword(prompt)
