import { VNCompiler } from "../../core/compiler.ts";
import type { CLIArgs, CompileOptions, Logger } from "../../types/compiler.ts";
import { loadConfig } from "../../utils/config.ts";
import { validateInputFile } from "../../utils/file-system.ts";

/**
 * Compile command implementation
 * Transforms YAML scripts into standalone HTML games
 */
export async function compileCommand(args: CLIArgs, logger: Logger): Promise<void> {
  const startTime = Date.now();
  
  try {
    if (args._.length < 2) {
      logger.error("❌ Input file is required");
      logger.info("Usage: vn-compiler compile <input.yaml> [options]");
      logger.info("Run 'vn-compiler help compile' for more information");
      Deno.exit(1);
    }

    const inputFile = args._[1];
    logger.info(`🎮 Starting compilation: ${inputFile}`);

    await validateInputFile(inputFile, logger);

    const config = await loadConfig(args.config, logger);
    
    const options: CompileOptions = {
      input: inputFile,
      output: args.output || config.output || "game.html",
      assetsDir: args.assets || config.assetsDir,
      customCSS: args.css || config.customCSS,
      customJS: args.js || config.customJS,
      minify: args.minify ?? config.minify ?? false,
      title: args.title || config.metadata?.title,
      metadata: {
        title: args.title || config.title,
        author: config.metadata?.author,
        description: config.metadata?.description,
        version: config.version || "1.0.0",
        created: new Date().toISOString(),
        tags: config.metadata?.tags || ["visual-novel", "interactive-fiction"]
      },
      templates: config.templates,
      dev: args.dev || false
    };

    logger.debug("📋 Compilation options:");
    logger.debug(`   Input: ${options.input}`);
    logger.debug(`   Output: ${options.output}`);
    logger.debug(`   Assets: ${options.assetsDir || 'none'}`);
    logger.debug(`   Minify: ${options.minify}`);
    logger.debug(`   Dev mode: ${options.dev}`);

    logger.step(1, 4, "Initializing VN Compiler...");
    const compiler = new VNCompiler(logger);
    await compiler.initialize();

    logger.step(2, 4, "Compiling YAML script...");
    const result = await compiler.compile(options);

    if (!result.success) {
      logger.error(`❌ Compilation failed: ${result.error}`);
      
      if (result.warnings && result.warnings.length > 0) {
        logger.warn("⚠️  Warnings during compilation:");
        result.warnings.forEach(warning => logger.warn(`   ${warning}`));
      }
      
      Deno.exit(1);
    }

    const compilationTime = Date.now() - startTime;
    logger.step(3, 4, "Compilation successful!");
    
    if (result.stats) {
      logger.info("📊 Compilation Statistics:");
      logger.info(`   Scenes: ${result.stats.sceneCount}`);
      logger.info(`   Assets: ${result.stats.assetCount}`);
      logger.info(`   Output Size: ${formatFileSize(result.stats.outputSize)}`);
      logger.info(`   Template Engine: ${result.stats.templateEngine}`);
      logger.info(`   Compilation Time: ${compilationTime}ms`);
    }

    logger.step(4, 4, "Output ready!");
    logger.success(`✅ Game compiled successfully: ${result.outputPath}`);
    
    if (result.warnings && result.warnings.length > 0) {
      logger.warn("⚠️  Compilation completed with warnings:");
      result.warnings.forEach(warning => logger.warn(`   ${warning}`));
    }

    if (options.dev) {
      logger.info("💡 Development Tips:");
      logger.info("   • Open the HTML file in a browser to test");
      logger.info("   • Use browser DevTools to debug");
      logger.info("   • Check the console for VN Engine logs");
      logger.info(`   • Try: vn-compiler serve ${inputFile} for live reload`);
    }

    if (options.minify) {
      logger.info("🚀 Production build complete!");
      logger.info("   • File is optimized for deployment");
      logger.info("   • All assets are bundled or referenced");
      logger.info("   • Ready to upload to web hosting");
    }

    compiler.destroy();

  } catch (error) {
    const compilationTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Compilation failed after ${compilationTime}ms`);
    logger.error(`Error: ${errorMessage}`);
    
    if (args.verbose && error instanceof Error && error.stack) {
      logger.debug("Stack trace:");
      logger.debug(error.stack);
    }

    if (errorMessage.includes("No such file")) {
      logger.info("💡 Make sure the input file path is correct");
      logger.info("   • Check file spelling and location");
      logger.info("   • Use absolute path if relative path fails");
    } else if (errorMessage.includes("YAML")) {
      logger.info("💡 YAML syntax error detected");
      logger.info("   • Check indentation (use spaces, not tabs)");
      logger.info("   • Validate YAML syntax online");
      logger.info("   • Run: vn-compiler validate <file> for details");
    } else if (errorMessage.includes("Permission")) {
      logger.info("💡 File permission error");
      logger.info("   • Check read/write permissions");
      logger.info("   • Try running with elevated permissions");
    } else if (errorMessage.includes("assets")) {
      logger.info("💡 Asset processing error");
      logger.info("   • Check assets directory path");
      logger.info("   • Ensure asset files are accessible");
      logger.info("   • Verify supported file formats");
    }

    Deno.exit(1);
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Validate compile arguments
 */
function validateCompileArgs(args: CLIArgs): string[] {
  const errors: string[] = [];
  
  if (args.output && !args.output.endsWith('.html')) {
    errors.push("Output file must have .html extension");
  }
  
  if (args.port && (args.port < 1000 || args.port > 65535)) {
    errors.push("Port must be between 1000 and 65535");
  }
  
  return errors;
}
