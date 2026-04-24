"""Techem MCP layer.

Exposes "tools" over our existing data services. The current wire format is a
single HTTP endpoint (`POST /api/v1/mcp/chat`) that takes a natural-language
prompt, routes it to a tool, runs the tool against the data layer, and returns
a structured response (blocks + optional report + sources).

The tool signatures and schemas here can be lifted out and re-exposed over
native MCP (stdio/SSE) later without changing the underlying functions.
"""
