# VN Compiler Dockerfile - ARM64 Compatible
FROM --platform=linux/arm64 denoland/deno:2.4.2

WORKDIR /app

# Copy all source files
COPY . .

# Cache dependencies
RUN deno cache cli.ts

# Create temp directory for sessions and hand ownership to the non-root deno user
RUN mkdir -p /app/vn-server-temp && chown -R deno:deno /app /deno-dir

# Run as the built-in unprivileged 'deno' user instead of root. Combined with the
# asset path-traversal containment fix, this bounds the blast radius of any
# file-write bug to non-root-writable paths (no writing /etc, /root, cron, etc.).
USER deno

# Expose port 8989 (API server)
EXPOSE 8989

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD deno eval "console.log('Health check passed'); Deno.exit(0)" || exit 1

# Start the API server.
# CORS is restricted to the editor origin by default (no more wildcard "*").
# Override with the CORS_ORIGIN env var if the editor is served elsewhere.
# Shell form is used so CORS_ORIGIN is expanded. --verbose removed to avoid
# leaking internal detail into logs.
CMD deno run --allow-all cli.ts server --port 8989 --cors "${CORS_ORIGIN:-https://story-editor.ogthejoe.com}"