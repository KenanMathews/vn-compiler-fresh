interface SceneData {
  name: string;
  instructions: unknown[];
  [key: string]: unknown;
}

interface TemplateEngineInfo {
  type: string;
  async: boolean;
}

type HelperFunction = (...args: unknown[]) => unknown;

interface VNEngineInterface {
  loadScript: (content: string, filename?: string) => Promise<void> | void;
  getAllScenes: () => SceneData[];
  getTemplateEngineInfo: () => TemplateEngineInfo;
  registerHelper: (name: string, helper: HelperFunction) => void;
  destroy: () => void;
}

import type {
  CompileOptions,
  CompilerContext,
  CompileResult,
  GameData,
  InputHelperConfig,
  ComponentHelperConfig,
  Logger,
  ProcessedAsset,
} from '../types/compiler.ts';

import { VNComponentHelperSystem } from './component-system.ts';
import { VNSceneManager } from './scene-manager.ts';
import { AssetBundler } from './asset-bundler.ts';
import { HTMLGenerator } from './html-generator.ts';
import { TemplateManager } from './template-manager.ts';
import { ClientBuilder } from './client-builder.ts';

export class VNCompiler {
  private vnEngine: any = null;
  private componentSystem: VNComponentHelperSystem | null = null;
  private sceneManager: VNSceneManager | null = null;
  private assetBundler: AssetBundler | null = null;
  private htmlGenerator: HTMLGenerator | null = null;
  private templateManager: TemplateManager | null = null;
  private clientBuilder: ClientBuilder | null = null;
  private clientAssets: Record<string, string> | null = null;
  private context: CompilerContext | null = null;

  constructor(private logger: Logger) {}

  /**
   * Initialize the VN Compiler with all subsystems
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing VN Compiler...');

    try {
      this.vnEngine = await this.createServerSafeVNEngine();
      this.logger.verbose('✅ VN Engine initialized');

      this.clientBuilder = new ClientBuilder(this.logger);
      this.clientAssets = await this.clientBuilder.getAllClientRuntimes();
      this.logger.verbose(`✅ Loaded ${Object.keys(this.clientAssets).length} client assets`);

      this.templateManager = new TemplateManager(this.logger);
      this.templateManager.initialize();
      this.templateManager.setClientAssets(this.clientAssets);

      this.componentSystem = new VNComponentHelperSystem(this.vnEngine, this.logger);
      this.sceneManager = new VNSceneManager(this.logger);
      this.assetBundler = new AssetBundler(this.logger);
      this.htmlGenerator = new HTMLGenerator(this.templateManager, this.logger);

      this.logger.info('✅ All subsystems initialized');
    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      this.logger.error('❌ Failed to initialize VN Compiler:', errorString);
      throw new Error(`Initialization failed: ${errorString}`);
    }
  }

  /**
   * Compile YAML script to standalone HTML game
   */
  async compile(options: CompileOptions): Promise<CompileResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`🎮 Compiling: ${options.input} → ${options.output}`);

      this.validateCompileOptions(options);
      this.context = this.createContext(options);

      const scriptContent = await this.loadScript(options.input);
      const parsedScript = await this.parseYAMLScript(scriptContent);
      
      this.logger.verbose('📋 YAML structure:', {
        hasTitle: !!parsedScript.title,
        hasScenes: !!parsedScript.scenes,
        sceneCount: parsedScript.scenes ? Object.keys(parsedScript.scenes as any).length : 0,
        hasDependencies: !!(parsedScript.dependencies || parsedScript.dependencies_quick),
      });

      const yamlMetadata = {
        ...options.metadata,
        title: parsedScript.title as string || options.metadata?.title || "VN Game",
        description: parsedScript.description as string || options.metadata?.description,
        variables: parsedScript.variables || {},
        styles: parsedScript.styles || {},
      };

      const yamlDependencies = {
        dependencies: parsedScript.dependencies as any[],
        dependencies_quick: parsedScript.dependencies_quick as string[],
      };

      const scenesData = parsedScript.scenes as Record<string, unknown>;
      const scenesYAML = await this.convertScenesObjectToYAML(scenesData);
      
      this.vnEngine.loadScript(scenesYAML, options.input);
      const scenes = this.vnEngine.getAllScenes();
      this.logger.info(`📝 Processed ${scenes.length} scenes`);

      const assets = await this.processAssets(options.assetsDir);
      const yamlAssets = this.extractYAMLAssets(parsedScript);
      const allAssets = [...assets, ...yamlAssets];
      const componentHelpers = this.extractComponentHelpers(options.input,scenes);
      
      this.logger.info(`🎨 Processed ${assets.length} assets, ${yamlAssets.length} YAML assets,  ${componentHelpers.length} components`);

      const gameData: GameData = {
        script: scenesYAML,
        scenes,
        assets: allAssets,
        metadata: yamlMetadata,
        components: componentHelpers,
      };

      const html = await this.generateHTML(gameData, options, yamlDependencies);

      await this.writeOutput(options.output, html);

      const stats = {
        sceneCount: scenes.length,
        assetCount: allAssets.length,
        outputSize: html.length,
        compilationTime: Date.now() - startTime,
        templateEngine: this.vnEngine.getTemplateEngineInfo().type,
      };

      this.logger.info(`✅ Compilation completed in ${stats.compilationTime}ms`);
      this.logger.info(`📦 Output: ${this.formatSize(stats.outputSize)}`);

      return {
        success: true,
        outputPath: options.output,
        stats,
      };

    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      this.logger.error('❌ Compilation failed:', errorString);

      return {
        success: false,
        error: errorString,
        warnings: [],
      };
    }
  }

  /**
   * Generate HTML using HTMLGenerator
   */
  private async generateHTML(gameData: GameData, options: CompileOptions, yamlDependencies?: any): Promise<string> {
    if (!this.htmlGenerator || !this.templateManager) {
      throw new Error('HTML Generator not initialized');
    }

    this.logger.verbose('🏗️ Generating HTML bundle...');
    
    const finalTitle = options.title || gameData.metadata.title || 'VN Game';

    const theme = this.templateManager.getTheme();

    return await this.htmlGenerator.generateBundle({
      input: options.input,
      title: finalTitle,
      theme,
      assets: gameData.assets,
      gameData,
      minify: options.minify || false,
      metadata: gameData.metadata,
      customCSS: options.customCSS ? await this.readCustomFile(options.customCSS, 'CSS') : undefined,
      customJS: options.customJS ? await this.readCustomFile(options.customJS, 'JS') : undefined,
      yamlDependencies: yamlDependencies || {},
    }, this.clientAssets || undefined);
  }

  /**
   * Read custom CSS/JS file with error handling
   */
  private async readCustomFile(filePath: string, type: string): Promise<string> {
    try {
      const content = await Deno.readTextFile(filePath);
      this.logger.verbose(`📄 Loaded custom ${type}: ${filePath}`);
      return content;
    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️ Failed to load custom ${type} file ${filePath}: ${errorString}`);
      return '';
    }
  }

  /**
   * Create a server-safe VN Engine instance for compilation
   */
  private async createServerSafeVNEngine(): Promise<VNEngineInterface> {
    const { createVNEngine } = await import('vn-engine');

    try {
      return await createVNEngine({
        environment: 'server',
        disableBrowserFeatures: true,
        skipDOMInitialization: true,
      });
    } catch (_error) {
      this.logger.verbose('Using basic VN Engine initialization...');
      return await createVNEngine();
    }
  }

  /**
   * Convert scenes object to YAML string format
   */
  private async convertScenesObjectToYAML(scenesData: Record<string, unknown>): Promise<string> {
    try {
      const { stringify } = await import('https://deno.land/std@0.208.0/yaml/mod.ts');
      return stringify(scenesData);
    } catch (error) {
      this.logger.error(`Failed to convert scenes to YAML: ${error}`);
      return '';
    }
  }

  /**
   * Parse YAML script content
   */
  private async parseYAMLScript(content: string): Promise<Record<string, unknown>> {
    try {
      const { parse } = await import('https://deno.land/std@0.208.0/yaml/mod.ts');
      const result = parse(content);
      return typeof result === 'object' && result !== null ? result as Record<string, unknown> : {};
    } catch (error) {
      this.logger.warn(`YAML parsing failed: ${error}. Using fallback parser`);
      return {
        scenes: [],
        variables: {},
        metadata: {},
      };
    }
  }

  /**
   * Load script from file or direct content
   */
  private async loadScript(inputPath: string): Promise<string> {
    try {
      if (inputPath.includes('\n') || inputPath.includes('scene:')) {
        return inputPath;
      }
      return await Deno.readTextFile(inputPath);
    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load script: ${errorString}`);
    }
  }

  /**
   * Process assets directory
   */
  private async processAssets(assetsDir?: string): Promise<ProcessedAsset[]> {
    if (!assetsDir || !this.assetBundler) {
      return [];
    }

    try {
      return await this.assetBundler.processAssets(assetsDir);
    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to process assets: ${errorString}`);
      return [];
    }
  }

  /**
   * Extract component helpers from scenes
   */
  private extractComponentHelpers(scriptPath: string, scenes: SceneData[]): ComponentHelperConfig[] {
    if (!this.componentSystem) return [];
    this.componentSystem.initializeScriptFolder(scriptPath);
    return this.componentSystem.extractComponentHelpers(scenes);
  }

  /**
   * Extract YAML assets from parsed script
   */
  private extractYAMLAssets(parsedScript: Record<string, unknown>): ProcessedAsset[] {
    const yamlAssets: ProcessedAsset[] = [];
    
    if (parsedScript.assets && Array.isArray(parsedScript.assets)) {
      for (const asset of parsedScript.assets) {
        if (typeof asset === 'object' && asset !== null) {
          const assetObj = asset as any;
          yamlAssets.push({
            key: assetObj.key || assetObj.name || 'unknown',
            name: assetObj.name || assetObj.key || 'unnamed',
            path: assetObj.url || assetObj.path || '',
            type: this.normalizeAssetType(assetObj.type),
            size: 0, // Unknown for YAML-defined assets
            url: assetObj.url || assetObj.path,
            metadata: assetObj.metadata || {
              description: assetObj.description
            }
          });
        }
      }
      
      this.logger.debug(`📦 Extracted ${yamlAssets.length} assets from YAML`);
    }
    
    return yamlAssets;
  }

  /**
   * Normalize asset type to match ProcessedAsset interface
   */
  private normalizeAssetType(type: string): 'image' | 'audio' | 'video' | 'unknown' {
    if (!type) return 'unknown';
    
    const normalizedType = type.toLowerCase();
    if (['image', 'img', 'picture', 'photo'].includes(normalizedType)) return 'image';
    if (['audio', 'sound', 'music'].includes(normalizedType)) return 'audio';
    if (['video', 'movie', 'film'].includes(normalizedType)) return 'video';
    
    return 'unknown';
  }

  /**
   * Write output file
   */
  private async writeOutput(outputPath: string, html: string): Promise<void> {
    try {
      const outputDir = outputPath.split('/').slice(0, -1).join('/');
      if (outputDir) {
        await Deno.mkdir(outputDir, { recursive: true });
      }
      await Deno.writeTextFile(outputPath, html);
    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write output: ${errorString}`);
    }
  }

  /**
   * Validate compile options
   */
  private validateCompileOptions(options: CompileOptions): void {
    if (!options.input) {
      throw new Error('Input script path is required');
    }
    if (!options.output) {
      throw new Error('Output path is required');
    }
  }

  /**
   * Create compilation context
   */
  private createContext(options: CompileOptions): CompilerContext {
    return {
      options,
      vnEngine: this.vnEngine,
      sceneManager: this.sceneManager,
      componentSystem: this.componentSystem,
      assetBundler: this.assetBundler,
      htmlGenerator: this.htmlGenerator,
      logger: this.logger,
    };
  }

  /**
   * Format byte size for display
   */
  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Get VN Engine instance (for external use)
   */
  getVNEngine(): any {
    return this.vnEngine;
  }

  /**
   * Get compilation context
   */
  getContext(): CompilerContext | null {
    return this.context;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.vnEngine) {
      this.vnEngine.destroy();
    }
    this.context = null;
    this.logger.verbose('VN Compiler destroyed');
  }
}
