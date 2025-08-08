# Simple VN Compiler Dockerfile
FROM denoland/deno:1.40.0

WORKDIR /app

# Copy all source files
COPY . .

# Cache dependencies
RUN deno cache cli.ts

# Create temp directory for sessions
RUN mkdir -p /app/vn-server-temp

# Expose port 8989 (API server)
EXPOSE 8989

# Start the API server
CMD ["deno", "run", "--allow-all", "cli.ts", "server", "--port", "8989", "--cors", "*", "--verbose"]