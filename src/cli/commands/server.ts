// commands/server.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { VNCompiler } from "../../core/compiler.ts";
import type { CLIArgs, CompileOptions, Logger } from "../../types/compiler.ts";
import { join, dirname } from "@std/path";
import { ensureDir } from "@std/fs";

/**
 * Server command implementation
 * Starts API server for remote compilation
 */
export async function serverCommand(
  args: CLIArgs,
  logger: Logger
): Promise<void> {
  try {
    const port = args.port || 8080;
    const corsOrigin = args.cors || "*";
    const workDir = args.workdir || "./vn-server-temp";

    logger.info(`🌐 Starting VN Compiler API Server`);
    logger.info(`📡 Server will run on http://localhost:${port}`);
    logger.info(`📁 Working directory: ${workDir}`);

    // Initialize API server
    const apiServer = new VNCompilerAPIServer(
      port,
      corsOrigin,
      workDir,
      args,
      logger
    );
    await apiServer.start();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ API server failed: ${errorMessage}`);

    if (args.verbose && error instanceof Error && error.stack) {
      logger.debug("Stack trace:");
      logger.debug(error.stack);
    }

    Deno.exit(1);
  }
}

/**
 * VN Compiler API Server class
 */
class VNCompilerAPIServer {
  private compiler: VNCompiler | null = null;
  private sessions: Map<string, CompilationSession> = new Map();

  constructor(
    private port: number,
    private corsOrigin: string,
    private workDir: string,
    private args: CLIArgs,
    private logger: Logger
  ) {}

  async start(): Promise<void> {
    // Initialize compiler
    this.logger.step(1, 3, "Initializing VN Compiler...");
    this.compiler = new VNCompiler(this.logger);
    await this.compiler.initialize();

    // Create working directory
    this.logger.step(2, 3, "Setting up working directory...");
    await ensureDir(this.workDir);

    // Start HTTP server
    this.logger.step(3, 3, "Starting API server...");
    await this.startHTTPServer();
  }

  private async startHTTPServer(): Promise<void> {
    const handler = async (request: Request): Promise<Response> => {
      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        return this.createCORSResponse();
      }

      try {
        const url = new URL(request.url);

        // Route API requests
        if (url.pathname.startsWith("/api/")) {
          const response = await this.handleAPI(request, url);
          return this.addCORSHeaders(response);
        }

        // Handle health check
        if (url.pathname === "/health") {
          return this.addCORSHeaders(
            new Response(
              JSON.stringify({
                status: "healthy",
                timestamp: new Date().toISOString(),
                version: "0.1.0",
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        // Default response
        return this.addCORSHeaders(
          new Response(
            JSON.stringify(
              {
                name: "VN Compiler API Server",
                version: "0.1.0",
                endpoints: {
                  "POST /api/session": "Create new compilation session",
                  "POST /api/session/:id/script": "Upload YAML script",
                  "POST /api/session/:id/asset": "Upload asset file",
                  "POST /api/session/:id/compile": "Compile project",
                  "GET /api/session/:id/download": "Download compiled HTML",
                  "GET /api/session/:id/status": "Get session status",
                  "DELETE /api/session/:id": "Delete session",
                  "GET /health": "Health check",
                },
              },
              null,
              2
            ),
            {
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`API request error: ${errorMessage}`);

        return this.addCORSHeaders(
          new Response(
            JSON.stringify({
              error: "Internal server error",
              message: errorMessage,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      }
    };

    // Show server info
    this.logger.success("🚀 VN Compiler API Server ready!");
    this.logger.info("🌐 API Endpoints:");
    this.logger.info(`   Health: http://localhost:${this.port}/health`);
    this.logger.info(
      `   Create Session: POST http://localhost:${this.port}/api/session`
    );
    this.logger.info(
      `   Upload Script: POST http://localhost:${this.port}/api/session/:id/script`
    );
    this.logger.info(
      `   Upload Asset: POST http://localhost:${this.port}/api/session/:id/asset`
    );
    this.logger.info(
      `   Compile: POST http://localhost:${this.port}/api/session/:id/compile`
    );
    this.logger.info(
      `   Download: GET http://localhost:${this.port}/api/session/:id/download`
    );
    this.logger.info(
      `   Status: GET http://localhost:${this.port}/api/session/:id/status`
    );

    // Start server
    await serve(handler, {
      port: this.port,
      onListen: () => {
        this.logger.success(
          `🎯 API Server running at http://localhost:${this.port}`
        );
        this.logger.info("📝 Ready to accept compilation requests");
        this.logger.info("🛑 Press Ctrl+C to stop");
      },
    });
  }

  private async handleAPI(request: Request, url: URL): Promise<Response> {
    const pathSegments = url.pathname.split("/").filter(Boolean);

    // Remove 'api' from segments
    pathSegments.shift();

    if (pathSegments[0] === "session") {
      return await this.handleSessionAPI(request, pathSegments.slice(1), url);
    }

    return new Response(
      JSON.stringify({
        error: "API endpoint not found",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private async handleSessionAPI(
    request: Request,
    segments: string[],
    url: URL
  ): Promise<Response> {
    const method = request.method;

    // POST /api/session - Create new session
    if (segments.length === 0 && method === "POST") {
      return await this.createSession(request);
    }

    // All other endpoints require session ID
    if (segments.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Session ID required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const sessionId = segments[0];
    const action = segments[1];

    switch (action) {
      case "script":
        if (method === "POST")
          return await this.uploadScript(sessionId, request);
        break;
      case "asset":
        if (method === "POST")
          return await this.uploadAsset(sessionId, request);
        break;
      case "compile":
        if (method === "POST")
          return await this.compileSession(sessionId, request);
        break;
      case "download":
        if (method === "GET") return await this.downloadCompiled(sessionId);
        break;
      case "status":
        if (method === "GET") return await this.getSessionStatus(sessionId);
        break;
      case undefined:
        if (method === "DELETE") return await this.deleteSession(sessionId);
        if (method === "GET") return await this.getSessionStatus(sessionId);
        break;
    }

    return new Response(
      JSON.stringify({
        error: "Invalid API endpoint or method",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private async createSession(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const sessionId = this.generateSessionId();

      const session = new CompilationSession(sessionId, this.workDir, {
        title: body.title || "Untitled VN",
        author: body.author,
        description: body.description,
        customCSS: body.customCSS,
        customJS: body.customJS,
        minify: body.minify || false,
      });

      await session.initialize();
      this.sessions.set(sessionId, session);

      this.logger.info(`📁 Created session: ${sessionId}`);

      return new Response(
        JSON.stringify({
          sessionId,
          status: "created",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({
          error: "Failed to create session",
          message: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  private async uploadScript(
    sessionId: string,
    request: Request
  ): Promise<Response> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Session not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const contentType = request.headers.get("content-type") || "";

      let scriptContent: string;

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("script") as File;
        if (!file) {
          return new Response(
            JSON.stringify({
              error: "No script file provided",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        scriptContent = await file.text();
      } else {
        // Assume raw YAML content
        scriptContent = await request.text();
      }

      await session.setScript(scriptContent);

      this.logger.info(`📝 Script uploaded to session: ${sessionId}`);

      return new Response(
        JSON.stringify({
          status: "script_uploaded",
          size: scriptContent.length,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({
          error: "Failed to upload script",
          message: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  private async uploadAsset(
    sessionId: string,
    request: Request
  ): Promise<Response> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Session not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const formData = await request.formData();
      const file = formData.get("asset") as File;
      const filename = (formData.get("filename") as string) || file.name;

      if (!file) {
        return new Response(
          JSON.stringify({
            error: "No asset file provided",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const assetData = new Uint8Array(await file.arrayBuffer());
      await session.addAsset(filename, assetData);

      this.logger.info(
        `🖼️ Asset uploaded to session ${sessionId}: ${filename}`
      );

      return new Response(
        JSON.stringify({
          status: "asset_uploaded",
          filename,
          size: assetData.length,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({
          error: "Failed to upload asset",
          message: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  private async compileSession(
    sessionId: string,
    request: Request
  ): Promise<Response> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Session not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!this.compiler) {
      return new Response(
        JSON.stringify({
          error: "Compiler not initialized",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const body = await request.json().catch(() => ({}));

      this.logger.info(`🔨 Compiling session: ${sessionId}`);
      const startTime = Date.now();

      const compileOptions = await session.getCompileOptions(body);
      const result = await this.compiler.compile(compileOptions);

      const compilationTime = Date.now() - startTime;

      if (result.success) {
        await session.setCompiledResult(result.outputPath!);

        this.logger.success(
          `✅ Compilation successful for session ${sessionId} (${compilationTime}ms)`
        );

        return new Response(
          JSON.stringify({
            status: "compiled",
            compilationTime,
            stats: result.stats,
            warnings: result.warnings || [],
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        this.logger.error(
          `❌ Compilation failed for session ${sessionId}: ${result.error}`
        );

        return new Response(
          JSON.stringify({
            status: "compilation_failed",
            error: result.error,
            warnings: result.warnings || [],
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Compilation error for session ${sessionId}: ${errorMessage}`
      );

      return new Response(
        JSON.stringify({
          status: "compilation_error",
          error: errorMessage,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  private async downloadCompiled(sessionId: string): Promise<Response> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Session not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const compiledHTML = await session.getCompiledHTML();
      if (!compiledHTML) {
        return new Response(
          JSON.stringify({
            error: "No compiled output available",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      this.logger.info(`📥 Download requested for session: ${sessionId}`);

      return new Response(compiledHTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${session
            .getTitle()
            .replace(/[^a-zA-Z0-9]/g, "_")}.html"`,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({
          error: "Failed to download compiled output",
          message: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  private async getSessionStatus(sessionId: string): Promise<Response> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Session not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        sessionId,
        status: session.getStatus(),
        created: session.getCreatedTime(),
        hasScript: session.hasScript(),
        assetCount: session.getAssetCount(),
        hasCompiledOutput: session.hasCompiledOutput(),
        title: session.getTitle(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private async deleteSession(sessionId: string): Promise<Response> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Session not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      await session.cleanup();
      this.sessions.delete(sessionId);

      this.logger.info(`🗑️ Session deleted: ${sessionId}`);

      return new Response(
        JSON.stringify({
          status: "deleted",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({
          error: "Failed to delete session",
          message: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  private createCORSResponse(): Response {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": this.corsOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  private addCORSHeaders(response: Response): Response {
    response.headers.set("Access-Control-Allow-Origin", this.corsOrigin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return response;
  }

  private generateSessionId(): string {
    return (
      "vn_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).substr(2, 9)
    );
  }
}

/**
 * Compilation Session class
 */
class CompilationSession {
  private createdTime: Date = new Date();
  private scriptContent: string | null = null;
  private assets: Map<string, Uint8Array> = new Map();
  private compiledHTMLPath: string | null = null;
  private sessionDir: string;

  constructor(
    private sessionId: string,
    private workDir: string,
    private options: {
      title?: string;
      author?: string;
      description?: string;
      customCSS?: string;
      customJS?: string;
      minify?: boolean;
    }
  ) {
    this.sessionDir = join(workDir, sessionId);
  }

  async initialize(): Promise<void> {
    await ensureDir(this.sessionDir);
    await ensureDir(join(this.sessionDir, "assets"));
  }

  async setScript(content: string): Promise<void> {
    this.scriptContent = content;
    const scriptPath = join(this.sessionDir, "script.yaml");
    await Deno.writeTextFile(scriptPath, content);
  }

  async addAsset(filename: string, data: Uint8Array): Promise<void> {
    this.assets.set(filename, data);

    const normalizedFilename = filename.replace(/\\/g, "/"); // Normalize path separators
    const assetPath = join(this.sessionDir, normalizedFilename);

    await ensureDir(dirname(assetPath));
    await Deno.writeFile(assetPath, data);

    console.log(`📁 Asset stored at: ${assetPath}`);
    console.log(`📁 Accessible as: ${normalizedFilename}`);
  }

  async getCompileOptions(extraOptions: any = {}): Promise<CompileOptions> {
    if (!this.scriptContent) {
      throw new Error("No script content available");
    }

    const scriptPath = join(this.sessionDir, "script.yaml");
    const outputPath = join(this.sessionDir, "output.html");

    // Set assetsDir to session directory itself (not assets subfolder)
    const assetsDir = this.assets.size > 0 ? this.sessionDir : undefined;

    // Debug: List all assets with their actual paths
    if (assetsDir) {
      console.log(`📦 Assets directory: ${assetsDir}`);
      console.log(`📦 Assets available:`, Array.from(this.assets.keys()));

      // Verify assets exist on disk at expected locations
      for (const [filename] of this.assets) {
        const assetPath = join(assetsDir, filename);
        try {
          const stat = await Deno.stat(assetPath);
          console.log(
            `✅ Asset verified: ${filename} (${stat.size} bytes) at ${assetPath}`
          );
        } catch (error) {
          console.log(`❌ Asset missing: ${filename} at ${assetPath}`);
        }
      }
    }

    return {
      input: scriptPath,
      output: outputPath,
      assetsDir,
      customCSS: this.options.customCSS,
      customJS: this.options.customJS,
      minify: extraOptions.minify ?? this.options.minify ?? false,
      title: extraOptions.title || this.options.title,
      metadata: {
        title: extraOptions.title || this.options.title || "Untitled VN",
        author: this.options.author,
        description: this.options.description,
        version: "1.0.0",
        created: this.createdTime.toISOString(),
        tags: ["visual-novel", "compiled-remotely"],
      },
      dev: false,
    };
  }

  async setCompiledResult(outputPath: string): Promise<void> {
    // Copy the compiled file to our session directory
    const sessionOutputPath = join(this.sessionDir, "compiled.html");
    await Deno.copyFile(outputPath, sessionOutputPath);
    this.compiledHTMLPath = sessionOutputPath;
  }

  async getCompiledHTML(): Promise<string | null> {
    if (!this.compiledHTMLPath) return null;

    try {
      return await Deno.readTextFile(this.compiledHTMLPath);
    } catch {
      return null;
    }
  }

  getStatus(): string {
    if (this.compiledHTMLPath) return "compiled";
    if (this.scriptContent) return "ready";
    return "created";
  }

  getCreatedTime(): string {
    return this.createdTime.toISOString();
  }

  hasScript(): boolean {
    return this.scriptContent !== null;
  }

  getAssetCount(): number {
    return this.assets.size;
  }

  hasCompiledOutput(): boolean {
    return this.compiledHTMLPath !== null;
  }

  getTitle(): string {
    return this.options.title || "untitled_vn";
  }

  async cleanup(): Promise<void> {
    try {
      await Deno.remove(this.sessionDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
