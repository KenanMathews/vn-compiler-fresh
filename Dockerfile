FROM denoland/deno:alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy source code
COPY . .

# Cache dependencies
RUN deno cache cli.ts

# Health check for API server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8989/health || exit 1

EXPOSE 8989

# Start the API server for remote compilation
CMD ["deno", "run", "-A", "cli.ts", "server", "--port", "8989", "--cors", "*", "--verbose"]
