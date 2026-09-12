#!/bin/bash

# Follows https://docs.docker.com/engine/containers/multi-service_container/

# Start the first process
java -jar ./web.jar --logging.config=./logback.xml --server.port=8081 &

# Start the second process
/opt/graph-gen-venv/bin/uvicorn server:app --app-dir /opt/graph-gen-server --host 127.0.0.1 --port 8082 &

# Start the third process
PORT=8001 DB_PATH=/opt/share-server/data/shares.db \
  FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}" \
  ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-*}" \
  STATS_TOKEN="${STATS_TOKEN:-}" \
  node /opt/share-server/node_modules/.bin/tsx /opt/share-server/src/index.ts &

# Start the argumentation MCP server, but only when it can authenticate requests:
# without a static token (Tier 1) or an OIDC issuer (Tier 2) the /mcp endpoint
# would be unauthenticated, so it stays disabled (Caddy then returns 502 for
# /mcp) until one is configured.
if [ -n "${MCP_STATIC_TOKEN:-}" ] || [ -n "${MCP_OAUTH_ISSUER:-}" ]; then
  PYTHONPATH=/opt/argumentation-mcp-server \
    ARGUMENTATION_MCP_TRANSPORT=http \
    ARGUMENTATION_MCP_HTTP_HOST=127.0.0.1 \
    ARGUMENTATION_MCP_HTTP_PORT=8083 \
    ARGUMENTATION_MCP_DUNG_URL=http://localhost:8081/dung \
    ARGUMENTATION_MCP_GRAPH_GEN_URL=http://localhost:8082 \
    ARGUMENTATION_MCP_RESOURCE_SERVER_URL="${MCP_RESOURCE_SERVER_URL:-https://agonproject.aig.fernuni-hagen.de/mcp}" \
    ARGUMENTATION_MCP_STATIC_TOKEN="${MCP_STATIC_TOKEN:-}" \
    ARGUMENTATION_MCP_OAUTH_ISSUER="${MCP_OAUTH_ISSUER:-}" \
    ARGUMENTATION_MCP_OAUTH_AUDIENCE="${MCP_OAUTH_AUDIENCE:-}" \
    ARGUMENTATION_MCP_REQUIRED_SCOPES="${MCP_REQUIRED_SCOPES:-}" \
    ARGUMENTATION_MCP_ALLOWED_HOSTS="${MCP_ALLOWED_HOSTS:-*}" \
    /opt/argumentation-mcp-venv/bin/python -m argumentation_mcp &
else
  echo "argumentation-mcp: no MCP_STATIC_TOKEN or MCP_OAUTH_ISSUER set; /mcp endpoint disabled" >&2
fi

# Start the last process
./caddy run --config ./Caddyfile &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
