#!/usr/bin/env -S deno run --allow-all

import { parseArgs } from "@std/cli/parse-args";
import type { CLIArgs } from "./src/types/compiler.ts";
import { Logger } from "./src/utils/logger.ts";
import { showHelp, showVersion } from "./src/cli/help.ts";

import { compileCommand } from "./src/cli/commands/compile.ts";
import { validateCommand } from "./src/cli/commands/validate.ts";
import { initCommand } from "./src/cli/commands/init.ts";
import { serveCommand } from "./src/cli/commands/serve.ts";
import { serverCommand } from "./src/cli/commands/server.ts";

const VERSION = "0.1.0";

async function main() {
  const args = parseArgs(Deno.args, {
    string: [
      "output", "css", "js", "assets", "template", "config", 
      "theme", "title", "port", "directory", "author", "description",
      "cors", "workdir"
    ],
    boolean: [
      "help", "version", "minify", "verbose", "watch", "dev", "no-watch"
    ],
    alias: {
      o: "output",
      c: "css", 
      j: "js",
      a: "assets",
      t: "template",
      h: "help",
      v: "version",
      m: "minify",
      w: "watch",
      p: "port",
      d: "dev"
    },
    default: {
      output: "index.html",
      theme: "modern",
      port: 3000,
      minify: false,
      dev: false,
      verbose: false,
      watch: true,
      cors: "*",
      workdir: "./vn-server-temp"
    }
  }) as CLIArgs;

  const logger = new Logger(args.verbose);

  try {
    if (args.version) {
      showVersion(VERSION);
      return;
    }

    if (args.help || args._.length === 0) {
      showHelp();
      return;
    }

    const command = args._[0];
    
    logger.debug(`Running command: ${command}`);
    logger.debug(`Args:`, args);

    switch (command) {
      case "compile":
        await compileCommand(args, logger);
        break;
        
      case "validate": 
        await validateCommand(args, logger);
        break;
        
      case "init":
        await initCommand(args, logger);
        break;
        
      case "serve":
        await serveCommand(args, logger);
        break;
        
      case "server":
        // Set default port for server command to 8080
        if (!args.port || args.port === 3000) {
          args.port = 8080;
        }
        await serverCommand(args, logger);
        break;
        
      default:
        logger.error(`Unknown command: ${command}`);
        logger.info("Run 'vn-compiler help' to see available commands");
        Deno.exit(1);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Fatal error: ${errorMessage}`);
    
    if (args.verbose && error instanceof Error && error.stack) {
      logger.debug("Stack trace:", error.stack);
    }
    
    if (errorMessage.includes("permission")) {
      logger.info("💡 Try running with appropriate permissions:");
      logger.info("   deno run -A cli.ts [command] [options]");
    }
    
    Deno.exit(1);
  }
}

addEventListener("unhandledrejection", (event) => {
  console.error("❌ Unhandled promise rejection:", event.reason);
  event.preventDefault();
  Deno.exit(1);
});

addEventListener("error", (event) => {
  console.error("❌ Uncaught exception:", event.error);
  event.preventDefault();
  Deno.exit(1);
});

if (import.meta.main) {
  await main();
}