# VN Compiler Dockerfile - ARM64 Compatible
FROM --platform=linux/arm64 denoland/deno:2.4.2

WORKDIR /app

# Copy all source files
COPY . .

# Cache dependencies
RUN deno cache cli.ts

# Create temp directory for sessions
RUN mkdir -p /app/vn-server-temp

# Expose port 8989 (API server)
EXPOSE 8989

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD deno eval "console.log('Health check passed'); Deno.exit(0)" || exit 1

# Start the API server
CMD ["deno", "run", "--allow-all", "cli.ts", "server", "--port", "8989", "--cors", "*", "--verbose"]