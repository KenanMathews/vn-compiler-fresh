import { exists } from "@std/fs";
import { extname, resolve } from "@std/path";
import type { Logger } from "../types/compiler.ts";

/**
 * Minimal file system utilities - only what's actually used
 */

/**
 * Validate that an input file exists and is readable
 * This is the ONLY function actually used by the compiler
 */
export async function validateInputFile(filePath: string, logger?: Logger): Promise<void> {
  try {
    const resolvedPath = resolve(filePath);
    
    if (!await exists(resolvedPath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const stat = await Deno.stat(resolvedPath);
    if (!stat.isFile) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    try {
      await Deno.readTextFile(resolvedPath);
      logger?.debug(`✅ Input file validated: ${filePath}`);
    } catch (error) {
      if (error instanceof Deno.errors.PermissionDenied) {
        throw new Error(`Permission denied reading file: ${filePath}`);
      }
      const errorString = error instanceof Error ? error.message : String(error);
      throw new Error(`Cannot read file: ${filePath} - ${errorString}`);
    }

    const ext = extname(filePath).toLowerCase();
    if (!['.yaml', '.yml'].includes(ext)) {
      logger?.warn(`⚠️  Input file does not have a YAML extension: ${filePath}`);
    }

  } catch (error) {
    const errorString = error instanceof Error ? error.message : String(error);
    logger?.error(`❌ Input file validation failed: ${errorString}`);
    throw error;
  }
}
