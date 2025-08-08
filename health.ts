// Simple health check endpoint for Docker
export function handleHealth(): Response {
  return new Response(JSON.stringify({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "vn-compiler",
    port: 8989
  }), {
    status: 200,
    headers: { 
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
