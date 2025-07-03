import { exists } from "@std/fs";
import { dirname, resolve } from "@std/path";
import type { ProjectConfig, Logger } from "../types/compiler.ts";

/**
 * Minimal configuration utilities - only what's actually used
 */

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ProjectConfig = {
  title: "VN Game",
  version: "1.0.0",
  input: "story.yaml",
  output: "index.html",
  theme: "base",
  minify: false,
  metadata: {
    tags: ["visual-novel", "interactive-fiction"]
  }
};

/**
 * Load configuration from file or return defaults
 * This is the ONLY function actually used by the compiler
 */
export async function loadConfig(configPath?: string, logger?: Logger): Promise<ProjectConfig> {
  if (!configPath) {
    const commonConfigFiles = [
      "vn-config.json",
      "vn-compiler.json", 
      "vnconfig.json"
    ];

    for (const file of commonConfigFiles) {
      if (await exists(file)) {
        configPath = file;
        logger?.debug(`📋 Found config file: ${file}`);
        break;
      }
    }

    if (!configPath) {
      logger?.debug("📋 No config file found, using defaults");
      return DEFAULT_CONFIG;
    }
  }

  try {
    logger?.debug(`📋 Loading config from: ${configPath}`);
    const configContent = await Deno.readTextFile(configPath);
    const config = JSON.parse(configContent);

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    if (mergedConfig.customCSS && !isAbsolute(mergedConfig.customCSS)) {
      mergedConfig.customCSS = resolve(dirname(configPath), mergedConfig.customCSS);
    }
    if (mergedConfig.customJS && !isAbsolute(mergedConfig.customJS)) {
      mergedConfig.customJS = resolve(dirname(configPath), mergedConfig.customJS);
    }
    if (mergedConfig.assetsDir && !isAbsolute(mergedConfig.assetsDir)) {
      mergedConfig.assetsDir = resolve(dirname(configPath), mergedConfig.assetsDir);
    }
    
    logger?.info(`✅ Configuration loaded from ${configPath}`);
    return mergedConfig;

  } catch (error) {
    const errorString = error instanceof Error ? error.message : String(error);
    logger?.warn(`⚠️  Failed to load config from ${configPath}: ${errorString}`);
    logger?.info("Using default configuration");
    return DEFAULT_CONFIG;
  }
}

/**
 * Simple helper to check if path is absolute
 */
function isAbsolute(path: string): boolean {
  return resolve(path) === path;
}
