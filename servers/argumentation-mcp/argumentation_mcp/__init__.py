"""Abstract argumentation MCP service.

A typed, transport-independent adapter that exposes AgonProject's abstract
argumentation reasoning (via the TweetyProject ``/dung`` backend) as MCP tools.
"""

from __future__ import annotations

# Domain contract version. Bump the major only on a breaking change to the
# framework/result/error shapes (see docs/mcp-argumentation-service.md).
SCHEMA_VERSION = "1"

# Server implementation version, independent of the schema version.
SERVICE_VERSION = "0.1.0"

SERVER_NAME = "argumentation-mcp"

__all__ = ["SCHEMA_VERSION", "SERVICE_VERSION", "SERVER_NAME"]
