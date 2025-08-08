FROM denoland/deno:alpine

WORKDIR /app

# Copy source code
COPY . .

# Cache dependencies (adjust this based on your main file)
RUN deno cache cli.ts

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8989/health || exit 1

EXPOSE 8989

# Start the server (adjust command based on your setup)
CMD ["deno", "run", "-A", "cli.ts", "server", "--port", "8989", "--host", "0.0.0.0", "--verbose"]
