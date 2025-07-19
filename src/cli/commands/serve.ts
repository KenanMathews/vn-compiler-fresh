import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.208.0/http/file_server.ts";
import { VNCompiler } from "../../core/compiler.ts";
import type { CLIArgs, CompileOptions, Logger } from "../../types/compiler.ts";
import { loadConfig } from "../../utils/config.ts";
import { validateInputFile } from "../../utils/file-system.ts";
import { dirname, join } from "@std/path";
import { ScriptValidator } from "./validate.ts";

/**
 * Serve command implementation
 * Starts development server with hot reload
 */
export async function serveCommand(args: CLIArgs, logger: Logger): Promise<void> {
  try {
    // Validate input arguments
    if (args._.length < 2) {
      logger.error("❌ Input file is required");
      logger.info("Usage: vn-compiler serve <input.yaml> [options]");
      logger.info("Run 'vn-compiler help serve' for more information");
      Deno.exit(1);
    }

    const inputFile = args._[1];
    const port = args.port || 3000;
    const watchEnabled = args["no-watch"] ? false : (args.watch !== false); // Default to true unless --no-watch is specified

    logger.info(`🌐 Starting development server: ${inputFile}`);
    logger.info(`📡 Server will run on http://localhost:${port}`);

    // Validate input file
    await validateInputFile(inputFile, logger);

    // Initialize development server
    const devServer = new DevelopmentServer(inputFile, port, watchEnabled, args, logger);
    devServerInstance = devServer; // Assign to global variable for signal handler
    await devServer.start();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Development server failed: ${errorMessage}`);
    
    if (args.verbose && error instanceof Error && error.stack) {
      logger.debug("Stack trace:");
      logger.debug(error.stack);
    }
    
    Deno.exit(1);
  }
}

/**
 * Development Server class
 */
class DevelopmentServer {
  private compiler: VNCompiler | null = null;
  private lastCompiledHTML: string = '';
  private lastCompileTime: number = 0;
  private watchAbortController: AbortController | null = null;
  private websocketClients: Set<WebSocket> = new Set();
  private compileOptions: CompileOptions | null = null;

  constructor(
    private inputFile: string,
    private port: number,
    private watchEnabled: boolean,
    private args: CLIArgs,
    private logger: Logger
  ) {}

  async start(): Promise<void> {
    // Initialize compiler
    this.logger.step(1, 4, "Initializing VN Compiler...");
    this.compiler = new VNCompiler(this.logger);
    await this.compiler.initialize();

    // Prepare compile options
    this.logger.step(2, 4, "Loading configuration...");
    await this.prepareCompileOptions();

    // Initial compilation
    this.logger.step(3, 4, "Performing initial compilation...");
    await this.compileGame();

    // Start file watcher if enabled
    if (this.watchEnabled) {
      this.logger.step(4, 4, "Starting file watcher...");
      this.startFileWatcher();
    } else {
      this.logger.step(4, 4, "File watching disabled");
    }

    // Start HTTP server
    this.logger.success("🚀 Development server ready!");
    await this.startHTTPServer();
  }

  private async prepareCompileOptions(): Promise<void> {
    const config = await loadConfig(this.args.config, this.logger);
    
    this.compileOptions = {
      input: this.inputFile,
      output: "dev-game.html",
      assetsDir: this.args.assets || config.assetsDir,
      customCSS: this.args.css || config.customCSS,
      customJS: this.args.js || config.customJS,
      minify: false,
      title: this.args.title,
      metadata: {
        author: config.metadata?.author,
        description: config.metadata?.description,
        version: config.version || "dev",
        created: new Date().toISOString(),
        tags: config.metadata?.tags || ["visual-novel", "development"]
      },
      templates: config.templates,
      dev: true
    };
  }

  private async compileGame(): Promise<void> {
    if (!this.compiler || !this.compileOptions) {
      throw new Error("Compiler not initialized");
    }

    try {
      const startTime = Date.now();
      const result = await this.compiler.compile(this.compileOptions);
      
      if (result.success) {
        // Read the compiled HTML
        this.lastCompiledHTML = await Deno.readTextFile(this.compileOptions.output);
        this.lastCompileTime = Date.now();
        
        const compilationTime = Date.now() - startTime;
        this.logger.success(`✅ Compilation successful (${compilationTime}ms)`);
        
        if (result.stats) {
          const stats = result.stats as any;
          this.logger.debug(`📊 Stats: ${stats.sceneCount} scenes, ${stats.assetCount} assets, ${stats.inputHelperCount} inputs`);
        }

        // Inject development enhancements
        this.lastCompiledHTML = this.injectDevelopmentFeatures(this.lastCompiledHTML);
        
        // Notify WebSocket clients
        this.notifyClients('reload', { 
          compilationTime, 
          stats: result.stats,
          timestamp: this.lastCompileTime
        });

        // Clean up temporary file
        try {
          await Deno.remove(this.compileOptions.output);
        } catch {
          // Ignore cleanup errors
        }

      } else {
        this.logger.error(`❌ Compilation failed: ${result.error}`);
        
        // Notify clients of error
        this.notifyClients('error', { 
          error: result.error,
          warnings: result.warnings 
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Compilation error: ${errorMessage}`);
      this.notifyClients('error', { error: errorMessage });
    }
  }

  private injectDevelopmentFeatures(html: string): string {
    // Inject WebSocket client for live reload
    const websocketScript = `
<script>
  // Development WebSocket Client
  (function() {
    const ws = new WebSocket('ws://localhost:${this.port}/ws');
    
    ws.onopen = function() {
      console.log('🔧 Development server connected');
    };
    
    ws.onmessage = function(event) {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'reload':
          console.log('🔄 Reloading due to file changes...');
          location.reload();
          break;
        case 'error':
          console.error('❌ Compilation error:', data.payload.error);
          showDevError(data.payload);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    };
    
    ws.onclose = function() {
      console.log('🔌 Development server disconnected');
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        location.reload();
      }, 1000);
    };
    
    function showDevError(errorData) {
      // Create or update error overlay
      let overlay = document.getElementById('dev-error-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'dev-error-overlay';
        overlay.style.cssText = \`
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          z-index: 10000;
          padding: 20px;
          overflow: auto;
          font-family: monospace;
        \`;
        document.body.appendChild(overlay);
      }
      
      overlay.innerHTML = \`
        <div style="max-width: 800px; margin: 0 auto;">
          <h2 style="color: #ff6b6b; margin-bottom: 20px;">🚨 Compilation Error</h2>
          <pre style="background: #333; padding: 15px; border-radius: 5px; overflow-x: auto;">
\${errorData.error}
          </pre>
          \${errorData.warnings && errorData.warnings.length > 0 ? \`
          <h3 style="color: #ffd93d; margin: 20px 0 10px;">⚠️ Warnings</h3>
          <ul style="color: #ffd93d;">
            \${errorData.warnings.map(w => \`<li>\${w}</li>\`).join('')}
          </ul>
          \` : ''}
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="margin-top: 20px; padding: 10px 20px; background: #007bff; border: none; color: white; border-radius: 5px; cursor: pointer;">
            Close
          </button>
        </div>
      \`;
    }
    
    // Add development info panel
    window.addEventListener('load', function() {
      const devInfo = document.createElement('div');
      devInfo.id = 'dev-info-panel';
      devInfo.style.cssText = \`
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
        font-family: monospace;
        z-index: 9999;
        opacity: 0.7;
      \`;
      devInfo.innerHTML = \`
        🔧 DEV MODE<br>
        Port: ${this.port}<br>
        Watch: ${this.watchEnabled ? 'ON' : 'OFF'}
      \`;
      document.body.appendChild(devInfo);
    });
  })();
</script>
    `;

    // Inject before closing body tag
    return html.replace('</body>', `${websocketScript}\n</body>`);
  }

  private startFileWatcher(): void {
    if (!this.watchEnabled) return;

    this.watchAbortController = new AbortController();
    const signal = this.watchAbortController.signal;

    // Watch the input file and related directories
    this.watchFile(this.inputFile, signal);
    
    // Watch assets directory if specified
    if (this.compileOptions?.assetsDir) {
      this.watchDirectory(this.compileOptions.assetsDir, signal);
    }

    // Watch custom CSS/JS files
    if (this.compileOptions?.customCSS) {
      this.watchFile(this.compileOptions.customCSS, signal);
    }
    if (this.compileOptions?.customJS) {
      this.watchFile(this.compileOptions.customJS, signal);
    }

    this.logger.success("👀 File watcher active");
  }

  private async watchFile(filePath: string, signal: AbortSignal): Promise<void> {
    try {
      const watcher = Deno.watchFs(filePath, { recursive: false });
      
      for await (const event of watcher) {
        if (signal.aborted) break;
        
        if (event.kind === "modify" || event.kind === "create") {
          this.logger.info(`📝 File changed: ${filePath}`);
          this.debounceCompile();
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`⚠️  Failed to watch ${filePath}: ${errorMessage}`);
      }
    }
  }

  private async watchDirectory(dirPath: string, signal: AbortSignal): Promise<void> {
    try {
      const stat = await Deno.stat(dirPath);
      if (!stat.isDirectory) return;

      const watcher = Deno.watchFs(dirPath, { recursive: true });
      
      for await (const event of watcher) {
        if (signal.aborted) break;
        
        if (event.kind === "modify" || event.kind === "create" || event.kind === "remove") {
          this.logger.info(`📁 Directory changed: ${dirPath}`);
          this.debounceCompile();
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.debug(`Could not watch directory ${dirPath}: ${errorMessage}`);
      }
    }
  }

  private compileTimeout: number | null = null;

  private debounceCompile(): void {
    // Clear existing timeout
    if (this.compileTimeout) {
      clearTimeout(this.compileTimeout);
    }

    // Set new timeout
    this.compileTimeout = setTimeout(() => {
      this.logger.info("🔄 Recompiling due to file changes...");
      this.compileGame();
    }, 300); // 300ms debounce
  }

  private async startHTTPServer(): Promise<void> {
    const handler = async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      
      // Handle WebSocket upgrade
      if (url.pathname === '/ws') {
        return this.handleWebSocket(request);
      }
      
      // Handle API endpoints
      if (url.pathname.startsWith('/api/')) {
        return await this.handleAPI(request, url);
      }
      
      // Handle static assets from configured assets directory
      if (url.pathname.startsWith('/assets/') && this.compileOptions?.assetsDir) {
        return await this.handleAsset(request, url);
      }
      
      // Handle main game
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return this.handleGame(request);
      }
      
      // Handle static files from current working directory (for development convenience)
      if (url.pathname !== '/' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/ws')) {
        return await this.handleStaticFile(request, url);
      }
      
      // 404 for other routes
      return new Response('Not Found', { status: 404 });
    };

    // Show server info
    this.logger.info("🌐 Development server endpoints:");
    this.logger.info(`   Game: http://localhost:${this.port}/`);
    this.logger.info(`   Status: http://localhost:${this.port}/api/status`);
    this.logger.info(`   Validate: http://localhost:${this.port}/api/validate`);
    this.logger.info(`   WebSocket: ws://localhost:${this.port}/ws`);
    if (this.compileOptions?.assetsDir) {
      this.logger.info(`   Assets: http://localhost:${this.port}/assets/`);
    }
    this.logger.info(`   Static Files: http://localhost:${this.port}/<filename> (from current directory)`);

    // Start server
    await serve(handler, { port: this.port, onListen: () => {
      this.logger.success(`🎯 Server running at http://localhost:${this.port}`);
      this.logger.info("📝 Edit your YAML file to see live changes");
      this.logger.info("🛑 Press Ctrl+C to stop");
    }});
  }

  private handleWebSocket(request: Request): Response {
    try {
      const { socket, response } = Deno.upgradeWebSocket(request);
      
      socket.onopen = () => {
        this.websocketClients.add(socket);
        this.logger.debug("🔌 WebSocket client connected");
      };
      
      socket.onclose = () => {
        this.websocketClients.delete(socket);
        this.logger.debug("🔌 WebSocket client disconnected");
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            // Handle pong response
          }
        } catch {
          // Ignore invalid messages
        }
      };
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`WebSocket error: ${errorMessage}`);
      return new Response('WebSocket Upgrade Failed', { status: 400 });
    }
  }

  private async handleAPI(request: Request, url: URL): Promise<Response> {
    switch (url.pathname) {
      case '/api/status':
        return this.handleStatusAPI();
      case '/api/reload':
        return this.handleReloadAPI();
      case '/api/validate':
        return await this.handleValidateAPI();
      default:
        return new Response('API endpoint not found', { status: 404 });
    }
  }

  private handleStatusAPI(): Response {
    const status = {
      status: 'running',
      lastCompile: this.lastCompileTime,
      watchEnabled: this.watchEnabled,
      connectedClients: this.websocketClients.size,
      inputFile: this.inputFile,
      port: this.port
    };
    
    return new Response(JSON.stringify(status, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private handleReloadAPI(): Response {
    this.logger.info("🔄 Manual reload requested");
    this.compileGame();
    return new Response('Reload triggered', { status: 200 });
  }

  private async handleValidateAPI(): Promise<Response> {
    if (!this.compiler || !this.compileOptions) {
      return new Response(JSON.stringify({
        valid: false,
        error: "Compiler not initialized"
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Read current YAML file
      const content = await Deno.readTextFile(this.inputFile);
      
      // Create validator instance
      const validator = new ScriptValidator(this.logger);
      
      // Validate the content
      const result = await validator.validate(content, this.inputFile);
      
      // Return validation results as JSON
      return new Response(JSON.stringify({
        valid: result.valid,
        errors: result.errors.map(error => ({
          type: error.type,
          message: error.message,
          location: error.location,
          suggestion: error.suggestion
        })),
        warnings: result.warnings,
        timestamp: new Date().toISOString(),
        file: this.inputFile
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Validation error: ${errorMessage}`);
      
      return new Response(JSON.stringify({
        valid: false,
        error: `Validation failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        file: this.inputFile
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleAsset(request: Request, url: URL): Promise<Response> {
    if (!this.compileOptions?.assetsDir) {
      return new Response('Assets not configured', { status: 404 });
    }

    try {
      const assetPath = url.pathname.replace('/assets/', '');
      const fullPath = join(this.compileOptions.assetsDir, assetPath);
      
      const response = await serveFile(request, fullPath);
      return response;
    } catch {
      return new Response('Asset not found', { status: 404 });
    }
  }

  private async handleStaticFile(request: Request, url: URL): Promise<Response> {
    try {
      // Get the file path relative to current working directory
      const filePath = url.pathname.slice(1); // Remove leading slash
      
      // Security check: prevent directory traversal
      if (filePath.includes('..') || filePath.includes('//')) {
        return new Response('Forbidden', { status: 403 });
      }
      
      // Get current working directory (where the YAML file is located)
      const workingDir = dirname(this.inputFile);
      const fullPath = join(workingDir, filePath);
      
      // Check if file exists and is not a directory
      let fileInfo;
      try {
        fileInfo = await Deno.stat(fullPath);
      } catch {
        return new Response('File not found', { status: 404 });
      }
      
      if (fileInfo.isDirectory) {
        return new Response('Directory listing not allowed', { status: 403 });
      }
      
      const response = await serveFile(request, fullPath);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Static file error: ${errorMessage}`);
      return new Response('File not found', { status: 404 });
    }
  }

  private handleGame(request: Request): Response {
    if (!this.lastCompiledHTML) {
      return new Response('Game not compiled yet', { status: 503 });
    }

    return new Response(this.lastCompiledHTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  private notifyClients(type: string, payload: any): void {
    const message = JSON.stringify({ type, payload });
    
    for (const client of this.websocketClients) {
      try {
        client.send(message);
      } catch (error) {
        // Remove dead connections
        this.websocketClients.delete(client);
      }
    }
  }

  async stop(): Promise<void> {
    this.logger.info("🛑 Stopping development server...");
    
    // Stop file watcher
    if (this.watchAbortController) {
      this.watchAbortController.abort();
    }
    
    // Close WebSocket connections
    for (const client of this.websocketClients) {
      try {
        client.close();
      } catch {
        // Ignore close errors
      }
    }
    
    // Cleanup compiler
    if (this.compiler) {
      this.compiler.destroy();
    }
    
    this.logger.success("✅ Development server stopped");
  }
}

// Handle Ctrl+C gracefully
let devServerInstance: DevelopmentServer | null = null;

Deno.addSignalListener("SIGINT", async () => {
  if (devServerInstance !== null) {
    await devServerInstance.stop();
  }
  Deno.exit(0);
});