import type {
  BundleOptions,
  GameData,
  Logger,
  ProcessedAsset,
  ThemeConfig,
} from '../types/compiler.ts';
import { TemplateManager } from './template-manager.ts';
import { ClientBuilder } from './client-builder.ts';
import { minify as minifyHTML } from 'npm:html-minifier-terser@^7.2.0';
import { minify as minifyJS } from 'npm:terser@^5.24.0';
import CleanCSS from 'npm:clean-css@^5.3.2';

/**
 * HTML Generator v1 - Modular Client Runtime Approach
 * Uses ClientBuilder for modular runtime loading and TemplateManager1 for themes
 */
export class HTMLGenerator {
  private clientBuilder: ClientBuilder;

  constructor(
    private templateManager: TemplateManager,
    private logger: Logger,
  ) {
    this.clientBuilder = new ClientBuilder(logger);
  }

  /**
   * Generate complete HTML bundle using modular approach
   */
  async generateBundle(options: BundleOptions, clientRuntimes?: Record<string, string>): Promise<string> {
    this.logger.info('🏗️ Generating HTML bundle (v1 modular)...');

    try {
      const runtimes = clientRuntimes || await this.clientBuilder.getAllClientRuntimes();
      
      const bundledCSS = this.bundleCSS(options, runtimes);
      
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
      });

      const finalHTML = options.minify ? await this.minifyHTML(html) : html;

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
  private bundleCSS(options: BundleOptions, clientRuntimes?: Record<string, string>): string {
    const components: string[] = [];

    components.push('');
    components.push(this.getBaseCSS());

    components.push('');
    if (clientRuntimes && clientRuntimes['ASSETS_THEME_CSS']) {
      components.push(clientRuntimes['ASSETS_THEME_CSS']);
      this.logger.debug('✅ Using external theme CSS asset');
    } else {
      const theme = this.templateManager.getTheme();
      components.push(theme.css);
      this.logger.warn('⚠️ Using fallback theme CSS (external asset not found)');
    }

    components.push('');
    components.push(this.getVNEngineCSS());

    components.push('');
    components.push(this.getInputHelperCSS());

    if (options.customCSS) {
      components.push('');
      components.push(options.customCSS);
    }

    let bundledCSS = components.join('\n\n');

    bundledCSS = this.templateManager.applyThemeVariables(bundledCSS, this.templateManager.getTheme());

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

    this.logger.verbose(`🎨 CSS bundled (v1): ${this.formatSize(bundledCSS.length)}`);
    return bundledCSS;
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
  }): string {
    const title = data.title || data.gameData.metadata.title || 'VN Game';
    let html = template
      .replaceAll('{{VN_TITLE}}', this.escapeHTML(title))
      .replace('{{META_DESCRIPTION}}', this.escapeHTML(data.metadata.description || data.title))
      .replace('{{META_AUTHOR}}', this.escapeHTML(data.metadata.author || ''))
      .replace('{{META_KEYWORDS}}', this.escapeHTML((data.metadata.tags || []).join(', ')))
      .replace('{{BUNDLED_CSS}}', data.css)
      .replace('{{RUNTIME_DATA}}', data.runtimeData)
      .replace('{{GENERATION_TIMESTAMP}}', new Date().toISOString())
      .replace('{{SCENE_COUNT}}', data.gameData.scenes.length.toString())
      .replace('{{INPUT_HELPER_COUNT}}', data.gameData.inputHelpers.length.toString())
      .replace('{{RUNTIME_SCRIPTS}}', this.generateRuntimeScripts(data.clientRuntimes, data.customJS));

    for (const [placeholder, content] of Object.entries(data.clientRuntimes)) {
      this.logger.debug(`🔄 Replacing placeholder {{${placeholder}}} with ${content.length} chars`);
      html = html.replace(`{{${placeholder}}}`, content);
    }

    return html;
  }

  /**
   * Generate runtime scripts for injection
   */
  private generateRuntimeScripts(clientRuntimes: Record<string, string>, customJS?: string): string {
    const scripts: string[] = [];
    
    const scriptOrder = [
      'UTILS_POLYFILLS_JS',
      'UTILS_DEBUG_HELPERS_JS',
      'VENDOR_VN_ENGINE_LOADER_JS',
      'VENDOR_HANDLEBARS_LOADER_JS',
      'RUNTIME_ASSET_MANAGER_JS',
      'RUNTIME_INPUT_MANAGER_JS',
      'RUNTIME_UI_MANAGER_JS',
      'RUNTIME_SCENE_MANAGER_JS',
      'RUNTIME_FEED_MANAGER_JS',
      'RUNTIME_MENU_MANAGER_JS',
      'RUNTIME_SAVE_MANAGER_JS',
      'RUNTIME_VN_COMPILER_RUNTIME_JS',
      'RUNTIME_GAME_INITIALIZATION_JS'
    ];

    for (const scriptKey of scriptOrder) {
      if (clientRuntimes[scriptKey]) {
        scripts.push(`<script>\n${clientRuntimes[scriptKey]}\n</script>`);
      }
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
        metadata: options.gameData.metadata,
        variables: options.gameData.metadata.variables || {},
        inputHelpers: options.gameData.inputHelpers,
        assets: this.createAssetManifest(options.assets),
      },
      config: {
        theme: 'default',
        minified: options.minify,
        version: '1.0.0',
        generated: new Date().toISOString(),
      },
      debug: {
        scriptType: typeof options.gameData.script,
        sceneCount: options.gameData.scenes.length,
        compiledAt: new Date().toISOString(),
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
}
