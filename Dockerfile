# build JAR
FROM --platform=linux/amd64 maven:3-eclipse-temurin-25 AS build
WORKDIR /build/
COPY /third-party/TweetyProjectTeam/TweetyProject .
RUN --mount=type=cache,target=/root/.m2 \
    mvn --batch-mode \dependency:go-offline dependency:resolve-plugins
RUN --mount=type=cache,target=/root/.m2 \
    mvn --batch-mode --fail-fast -Dgpg.skip -Dmaven.test.skip \
    -pl org-tweetyproject-web -am \
    install
RUN --mount=type=cache,target=/root/.m2  \
    mvn --batch-mode --fail-fast -Dgpg.skip -Dmaven.test.skip \
    -pl org-tweetyproject-web \
    package spring-boot:repackage

FROM --platform=linux/amd64 caddy:builder AS caddy
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit \
    --output /usr/bin/caddy

# runtime
FROM --platform=linux/amd64 eclipse-temurin:25-jre
WORKDIR /opt/app
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 python3 python3-pip python3-venv curl graphviz && rm -rf /var/lib/apt/lists/*
# Install Node.js 24 (node:sqlite is stable in v24, no experimental flag needed)
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*
# Prepare server for static files and proxying to backend
RUN mkdir -p /var/www && chown www-data:www-data /var/www
COPY --from=caddy /usr/bin/caddy caddy
COPY /deployment/Caddyfile Caddyfile
COPY --chown=www-data:www-data /dist/ dist
# Prepare backend
# The TweetyProject web server expects /opt/app/logs to exist,
# even if we override the logging config and thus making the path unused.
RUN mkdir -p /opt/app/logs && chown www-data:www-data /opt/app/logs
COPY /deployment/logback.xml logback.xml
COPY --from=build /build/org-tweetyproject-web/target/web-*.jar web.jar
# Prepare graph-gen server
RUN python3 -m venv /opt/graph-gen-venv
COPY /servers/graph-gen/requirements.txt /opt/graph-gen-server/requirements.txt
RUN /opt/graph-gen-venv/bin/pip install --no-cache-dir -r /opt/graph-gen-server/requirements.txt
COPY /servers/graph-gen/server.py /opt/graph-gen-server/server.py
# Prepare argumentation-mcp server
RUN python3 -m venv /opt/argumentation-mcp-venv
COPY /servers/argumentation-mcp/requirements.txt /opt/argumentation-mcp-server/requirements.txt
RUN /opt/argumentation-mcp-venv/bin/pip install --no-cache-dir -r /opt/argumentation-mcp-server/requirements.txt
COPY /servers/argumentation-mcp/argumentation_mcp /opt/argumentation-mcp-server/argumentation_mcp
# Prepare share-server
COPY /servers/share/package.json /opt/share-server/package.json
COPY /servers/share/package-lock.json /opt/share-server/package-lock.json
RUN npm ci --prefix /opt/share-server
COPY /servers/share/src /opt/share-server/src
COPY /servers/share/tsconfig.json /opt/share-server/tsconfig.json
RUN mkdir -p /opt/share-server/data && chown www-data:www-data /opt/share-server/data
COPY --chmod=755 /deployment/wrapper_script.sh wrapper_script.sh
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:8080/ > /dev/null || exit 1
USER www-data
ENTRYPOINT ["./wrapper_script.sh"]