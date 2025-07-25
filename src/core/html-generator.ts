import type {
  BundleOptions,
  ComponentHelperConfig,
  GameData,
  Logger,
  ProcessedAsset,
  ThemeConfig,
} from '../types/compiler.ts';
import { DependencyManager } from './dependency-manager.ts';
import { TemplateManager } from './template-manager.ts';
import { ClientBuilder } from './client-builder.ts';
import { minify as minifyHTML } from 'npm:html-minifier-terser@^7.2.0';
import { minify as minifyJS } from 'npm:terser@^5.24.0';
import CleanCSS from 'npm:clean-css@^5.3.2';
import { dirname, resolve, isAbsolute } from "@std/path";



/**
 * HTML Generator v1 - Modular Client Runtime Approach
 * Uses ClientBuilder for modular runtime loading and TemplateManager1 for themes
 */
export class HTMLGenerator {
  private clientBuilder: ClientBuilder;
  private dependencyManager: DependencyManager;
  private yamlFilePath: string | null = null;

  constructor(
    private templateManager: TemplateManager,
    private logger: Logger,
  ) {
    this.clientBuilder = new ClientBuilder(logger);
    this.dependencyManager = new DependencyManager(logger);
  }

  /**
   * Generate complete HTML bundle using modular approach
   */
  async generateBundle(options: BundleOptions, clientRuntimes?: Record<string, string>): Promise<string> {
    this.logger.info('🏗️ Generating HTML bundle (v1 modular)...');

    try {
      this.yamlFilePath = options.input;
      await this.processDependencies(options);

      const runtimes = clientRuntimes || await this.clientBuilder.getAllClientRuntimes();
      const bundledCSS = this.bundleCSS(options, runtimes, options.gameData.components);

      
      const runtimeData = this.generateRuntimeData(options);
      
      const template = this.templateManager.getGameShellTemplate();
      const html = this.assembleHTML(template, {
        title: options.title,
        css: bundledCSS,
        runtimeData,
        clientRuntimes: runtimes,
        metadata: options.metadata,
        gameData: options.gameData,
        customJS: options.customJS || '',
        dependencyManager: this.dependencyManager,
      });


      const finalHTML = options.minify ? await this.minifyHTML(html) : html;

      this.logDependencyStats();

      this.logger.info(`✅ HTML bundle generated (v1): ${this.formatSize(finalHTML.length)}`);
      return finalHTML;
    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to generate HTML bundle (v1): ${errorString}`);
      throw error;
    }
  }

  /**
   * Bundle CSS components for client
   */
  private bundleCSS(options: BundleOptions, clientRuntimes?: Record<string, string>, componentData?: ComponentHelperConfig[]): string {
    const cssComponents: string[] = [];

    // Set theme from metadata before building CSS
    this.templateManager.setThemeFromMetadata(options.metadata);
    const currentTheme = this.templateManager.getCurrentThemeId();
    this.logger.debug(`🎨 Using theme: ${currentTheme}`);

    // Start with theme variables (always first)
    cssComponents.push('/* Theme Variables */');
    cssComponents.push(this.templateManager.getThemeVariablesCSS());

    const dependencyScripts = this.generateDependencyScripts(this.dependencyManager);
    if (dependencyScripts.css && dependencyScripts.css.trim()) {
      cssComponents.push('/* Dependency CSS */');
      cssComponents.push(dependencyScripts.css);
    }

    // Add base structural CSS
    cssComponents.push('/* Base CSS */');
    cssComponents.push(this.getBaseCSS());

    // Add external theme CSS or fallback
    cssComponents.push('/* Theme CSS */');
    if (clientRuntimes && clientRuntimes['ASSETS_THEME_CSS']) {
      cssComponents.push(clientRuntimes['ASSETS_THEME_CSS']);
      this.logger.debug('✅ Using external theme CSS asset');
    } else {
      const theme = this.templateManager.getTheme();
      if (theme.css) {
        cssComponents.push(theme.css);
        this.logger.debug('✅ Using loaded theme CSS');
      } else {
        this.logger.info(`ℹ️ No external theme CSS found, using built-in theme: ${currentTheme}`);
        // Built-in themes rely on CSS variables defined above
      }
    }

    // Add VN Engine CSS
    cssComponents.push('/* VN Engine CSS */');
    cssComponents.push(this.getVNEngineCSS());

    // Add input helper CSS
    cssComponents.push('/* Input Helper CSS */');
    cssComponents.push(this.getInputHelperCSS());

    // Add component CSS
    cssComponents.push('/* Component CSS */');
    cssComponents.push(this.getComponentCSS(componentData || []));

    // Add custom CSS if provided
    if (options.customCSS) {
      cssComponents.push('/* Custom CSS */');
      cssComponents.push(options.customCSS);
    }

    let bundledCSS = cssComponents.join('\n\n');

    // Apply theme variables to the entire CSS bundle
    bundledCSS = this.templateManager.applyThemeVariables(bundledCSS, this.templateManager.getTheme());

    // Minify if requested
    if (options.minify) {
      this.logger.verbose('🗜️ Minifying CSS...');
      try {
        const cleanCSS = new CleanCSS({ level: 2, returnPromise: false });
        const minified = cleanCSS.minify(bundledCSS);
        bundledCSS = minified.styles;
      } catch (error) {
        const errorString = error instanceof Error ? error.message : String(error);
        this.logger.warn(`⚠️ CSS minification failed: ${errorString}`);
      }
    }

    this.logger.verbose(`🎨 CSS bundled with theme '${currentTheme}': ${this.formatSize(bundledCSS.length)}`);
    return bundledCSS;
  }

  /**
   * Get available themes for documentation/debugging
   */
  getAvailableThemes(): Array<{id: string, name: string, category: string, description: string}> {
    return this.templateManager.getAvailableThemes();
  }

  /**
   * Assemble the final HTML document with client runtimes
   */
  private assembleHTML(template: string, data: {
    title: string;
    css: string;
    runtimeData: string;
    clientRuntimes: Record<string, string>;
    metadata: any;
    gameData: GameData;
    customJS?: string;
    dependencyManager: DependencyManager;
  }): string {
    const title = data.title || data.gameData.metadata.title || 'VN Game';
    const dependencyScripts = this.generateDependencyScripts(data.dependencyManager);
    let html = template
      .replaceAll('{{VN_TITLE}}', this.escapeHTML(title))
      .replace('{{META_DESCRIPTION}}', this.escapeHTML(data.metadata.description || data.title))
      .replace('{{META_AUTHOR}}', this.escapeHTML(data.metadata.author || ''))
      .replace('{{META_KEYWORDS}}', this.escapeHTML((data.metadata.tags || []).join(', ')))
      .replace('{{BUNDLED_CSS}}', data.css)
      .replace('{{RUNTIME_DATA}}', data.runtimeData)
      .replace('{{GENERATION_TIMESTAMP}}', new Date().toISOString())
      .replace('{{SCENE_COUNT}}', data.gameData.scenes.length.toString())
      .replace('{{DEPENDENCY_SCRIPTS}}', dependencyScripts.head)
      .replace('{{RUNTIME_SCRIPTS}}', this.generateRuntimeScripts(data.clientRuntimes, data.customJS, data.gameData.components));

    for (const [placeholder, content] of Object.entries(data.clientRuntimes)) {
      this.logger.debug(`🔄 Replacing placeholder {{${placeholder}}} with ${content.length} chars`);
      html = html.replace(`{{${placeholder}}}`, content);
    }

    return html;
  }

  /**
   * Generate runtime scripts for injection
   */
  private generateRuntimeScripts(clientRuntimes: Record<string, string>, customJS?: string, componentData?: ComponentHelperConfig[], dependencyScripts?: string ): string {
    const scripts: string[] = [];

    if (dependencyScripts && dependencyScripts.trim()) {
      scripts.push(dependencyScripts);
    }
    const scriptOrder = [
      'UTILS_POLYFILLS_JS',
      'VENDOR_VN_ENGINE_LOADER_JS',
      'RUNTIME_ASSET_MANAGER_JS',
      'RUNTIME_DOM_OBSERVER_MANAGER_JS',
      'RUNTIME_INPUT_MANAGER_JS',
      'RUNTIME_BASE_COMPONENT_JS',
      'RUNTIME_COMPONENT_MANAGER_JS',
      'RUNTIME_UI_MANAGER_JS',
      'RUNTIME_SCENE_MANAGER_JS',
      'RUNTIME_FEED_MANAGER_JS',
      'RUNTIME_MENU_MANAGER_JS',
      'RUNTIME_SAVE_MANAGER_JS',
      'RUNTIME_VN_COMPILER_RUNTIME_JS',
      'RUNTIME_GAME_INITIALIZATION_JS',
      'UTILS_DEBUG_HELPERS_JS',
    ];

    for (const scriptKey of scriptOrder) {
      if (clientRuntimes[scriptKey]) {
        scripts.push(`<script>\n${clientRuntimes[scriptKey]}\n</script>`);
      }
    }

    // Add component JavaScript files
    const componentJS = this.getComponentJS(componentData || []);
    if (componentJS.trim()) {
      scripts.push(`<script>\n// Component JavaScript\n${componentJS}\n</script>`);
      this.logger.verbose('🧩 Component JS bundled into runtime scripts');
    }

    // Add custom JavaScript if provided
    if (customJS && customJS.trim()) {
      scripts.push(`<script>\n// Custom JavaScript\n${customJS}\n</script>`);
      this.logger.verbose('📄 Custom JS injected into runtime scripts');
    }

    return scripts.join('\n');
  }

  /**
   * Generate runtime data for the game
   */
  private generateRuntimeData(options: BundleOptions): string {
    const runtimeData = {
      gameData: {
        script: options.gameData.script,
        scenes: options.gameData.scenes,
        metadata: options.metadata,
        variables: options.metadata.variables || {},
        assets: this.createAssetManifest(options.assets),
      },
      config: {
        theme: 'default',
        minified: options.minify,
        version: '1.0.0',
        generated: new Date().toISOString(),
        dependencies: this.dependencyManager.getStats(),
      },
      debug: {
        scriptType: typeof options.gameData.script,
        sceneCount: options.gameData.scenes.length,
        compiledAt: new Date().toISOString(),
        dependencyManifest: this.dependencyManager.getManifest(),
      },
    };

    return `window.VN_RUNTIME_DATA = ${JSON.stringify(runtimeData, null, options.minify ? 0 : 2)};`;
  }

  /**
   * Create asset manifest for runtime
   */
  private createAssetManifest(assets: ProcessedAsset[]): any {
    const manifest: Record<string, any> = {};
    for (const asset of assets) {
      manifest[asset.key] = {
        name: asset.name,
        type: asset.type,
        size: asset.size,
        data: asset.data,
        url: asset.url,
        metadata: asset.metadata,
      };
    }
    return manifest;
  }

  /**
   * Minify the final HTML
   */
  private async minifyHTML(html: string): Promise<string> {
    try {
      return await minifyHTML(html, {
        collapseWhitespace: true,
        removeComments: true,
        removeEmptyAttributes: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
      });
    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️ HTML minification failed: ${errorString}`);
      return html;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHTML(text: string): string {
    if (typeof document !== 'undefined' && document?.createElement) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Format byte size for logging
   */
  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  private getBaseCSS(): string {
    return `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
#vn-container { max-width: 800px; margin: 0 auto; padding: 20px; min-height: 100vh; }`;
  }

  private getVNEngineCSS(): string {
    return `.vn-dialogue { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
.vn-choice { background: #007bff; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; margin: 5px 0; }
.vn-choice:hover { background: #0056b3; }`;
  }

  private getInputHelperCSS(): string {
    return `.vn-input { padding: 10px 12px; border: 1px solid #ccc; border-radius: 4px; width: 100%; }
.vn-input:focus { outline: none; border-color: #007bff; }`;
  }

  private getComponentCSS(components: ComponentHelperConfig[]): string {
    const cssContent: string[] = [];
    const processedPaths = new Set<string>();
    
    for (const component of components) {
      if (component && component.cssPath && !processedPaths.has(component.cssPath)) {
        processedPaths.add(component.cssPath);
        
        const resolvedPath = this.resolveComponentPath(component.cssPath);
        if (!resolvedPath) {
          this.logger.warn(`⚠️ Could not resolve CSS path for component: ${component.componentName} (${component.cssPath})`);
          continue;
        }
        
        try {
          const cssExists = Deno.statSync(resolvedPath).isFile;
          if (cssExists) {
            const cssData = Deno.readTextFileSync(resolvedPath);
            cssContent.push(`/* Component: ${component.componentName} (${component.cssPath}) */`);
            cssContent.push(`/* Resolved from: ${resolvedPath} */`);
            cssContent.push(cssData);
            this.logger.debug(`✅ Loaded CSS for component: ${component.componentName} from ${resolvedPath}`);
          }
        } catch (error) {
          const errorString = error instanceof Error ? error.message : String(error);
          this.logger.warn(`⚠️ Could not load CSS file for component: ${component.componentName} (${resolvedPath}) - ${errorString}`);
        }
      }
    }
    
    return cssContent.join('\n\n');
  }

  private getComponentJS(components: ComponentHelperConfig[]): string {
    const jsContent: string[] = [];
    const processedPaths = new Set<string>();
    
    for (const component of components) {
      if (component && component.scriptPath && !processedPaths.has(component.scriptPath)) {
        processedPaths.add(component.scriptPath);
        
        const resolvedPath = this.resolveComponentPath(component.scriptPath);
        if (!resolvedPath) {
          this.logger.warn(`⚠️ Could not resolve JS path for component: ${component.componentName} (${component.scriptPath})`);
          continue;
        }
        
        try {
          const jsExists = Deno.statSync(resolvedPath).isFile;
          if (jsExists) {
            let jsData = Deno.readTextFileSync(resolvedPath);
            
            // Strip ES6 export statements for browser compatibility
            jsData = jsData
              .replace(/^export\s+default\s+\w+;?\s*$/gm, '')
              .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
              .replace(/^export\s+\w+\s+/gm, '')
              .trim();
            
            jsContent.push(jsData);
            this.logger.debug(`✅ Loaded JS for component: ${component.componentName} from ${resolvedPath}`);
          }
        } catch (error) {
          const errorString = error instanceof Error ? error.message : String(error);
          this.logger.warn(`⚠️ Could not load JS file for component: ${component.componentName} (${resolvedPath}) - ${errorString}`);
        }
      }
    }
    
    return jsContent.join('\n\n');
  }
  private resolveComponentPath(componentPath: string): string | null {
    let startegy = null;
    if (isAbsolute(componentPath)) {
      return componentPath;
    }
    const strategies = [
      () => {
        this.logger.debug(`Yaml file path: ${this.yamlFilePath}`);
        if (this.yamlFilePath) {
          const yamlDir = dirname(this.yamlFilePath);
          return resolve(yamlDir, componentPath);
        }
        return null;
      },
      
      () => {
        try {
          const execDir = dirname(Deno.execPath());
          return resolve(execDir, componentPath);
        } catch {
          return null;
        }
      },
      
      () => resolve(Deno.cwd(), componentPath)
    ];

    for (const strategy of strategies) {
      this.logger.debug(`🔄 Trying resolution strategy for: ${componentPath}`);
      const resolvedPath = strategy();
      if (resolvedPath) {
        try {
          const stat = Deno.statSync(resolvedPath);
          if (stat.isFile) {
            return resolvedPath;
          }
        } catch {
          continue;
        }
      }
    }

    this.logger.debug(`❌ All resolution strategies failed for: ${componentPath}`);
    if (this.yamlFilePath) {
      this.logger.debug(`   YAML file: ${this.yamlFilePath}`);
      this.logger.debug(`   YAML dir: ${dirname(this.yamlFilePath)}`);
    }
    this.logger.debug(`   CWD: ${Deno.cwd()}`);
    
    return null;
  }

  private async processDependencies(options: BundleOptions): Promise<void> {
    // Clear any existing dependencies
    this.dependencyManager.clear();

    // Add dependencies from YAML if present
    if (options.yamlDependencies) {
      this.dependencyManager.addFromYAML(options.yamlDependencies);
    }

    // Add additional dependencies from options
    if (options.dependencies) {
      this.dependencyManager.addDependencies(options.dependencies);
    }

    // Bundle dependencies if requested
    if (options.bundleDependencies) {
      await this.dependencyManager.bundleDependencies(options.minify);
    }

    const stats = this.dependencyManager.getStats();
    if (stats.total > 0) {
      this.logger.info(`📦 Processed ${stats.total} dependencies (${stats.bundled} bundled, ${stats.cdn} CDN)`);
    }
  }

  private logDependencyStats(): void {
    const manifest = this.dependencyManager.getManifest();
    const stats = manifest.stats;

    if (stats.total > 0) {
      this.logger.info('📊 Dependency Statistics:');
      this.logger.info(`   Total: ${stats.total} dependencies`);
      this.logger.info(`   CDN: ${stats.cdn}, Bundled: ${stats.bundled}, Inline: ${stats.inline}`);
      if (stats.totalBundledSize > 0) {
        this.logger.info(`   Bundled size: ${this.formatSize(stats.totalBundledSize)}`);
      }
    }
  }

  private generateDependencyScripts(dependencyManager: DependencyManager): { head: string; body: string ; css: string } {
    const head: string[] = [];
    const body: string[] = [];
    let dependencyCSS = '';

    // Add CDN scripts to head
    const cdnScripts = dependencyManager.generateCDNScripts();
    if (cdnScripts.trim()) {
      head.push('<!-- External Dependencies (CDN) -->');
      head.push(cdnScripts);
    }

    // Add bundled scripts to body (before runtime)
    const bundledContent = dependencyManager.generateBundledScripts();
    if (bundledContent.js && bundledContent.js.trim()) {
      body.push('<!-- Bundled Dependencies (JS) -->');
      body.push(`<script>\n${bundledContent.js}\n</script>`);
    }

    if (bundledContent.css && bundledContent.css.trim()) {
      dependencyCSS = bundledContent.css;
    }

    // Add inline scripts to body
    const inlineScripts = dependencyManager.generateInlineScripts();
    if (inlineScripts.trim()) {
      body.push('<!-- Inline Dependencies -->');
      body.push(`<script>\n${inlineScripts}\n</script>`);
    }

    return {
      head: head.join('\n'),
      body: body.join('\n'),
      css: dependencyCSS
    };
  }
}

