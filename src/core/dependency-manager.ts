import type { 
  DependencyConfig, 
  DependencyPreset, 
  BundledDependency, 
  DependencyStats,
  DependencyManifest,
  DependencyManagerOptions,
  YAMLDependencies
} from '../types/dependencies.ts';

import type { Logger } from '../types/compiler.ts';

export class DependencyManager {
  private dependencies: Map<string, DependencyConfig> = new Map();
  private presets: Map<string, DependencyPreset> = new Map();
  private bundledDependencies: Map<string, BundledDependency> = new Map();
  private cdnCache: Map<string, string> = new Map();
  private options: DependencyManagerOptions;

  constructor(
    private logger: Logger, 
    options: DependencyManagerOptions = {}
  ) {
    this.options = {
      enableCache: true,
      timeout: 30000,
      retries: 3,
      userAgent: 'VN-Compiler/1.0',
      ...options
    };
    
    if (!this.logger) {
      console.error('❌ DependencyManager: Logger is undefined!');
      throw new Error('Logger is required for DependencyManager');
    }
    
    try {
      this.logger.debug('🔧 DependencyManager: Dynamic dependency system initialized');
    } catch (error) {
      console.error('❌ DependencyManager: Logger test failed:', error);
      throw new Error('Logger is not functioning properly');
    }
    
    // No default presets - completely user-driven
  }

  /**
   * Add a single dependency
   */
  addDependency(config: DependencyConfig): void {
    this.validateDependencyConfig(config);
    
    this.dependencies.set(config.name, {
      priority: 50,
      ...config
    });
    
    this.safeLog('debug', `📦 Added dependency: ${config.name} (${config.type})`);
  }

  /**
   * Add multiple dependencies
   */
  addDependencies(configs: DependencyConfig[]): void {
    for (const config of configs) {
      this.addDependency(config);
    }
  }

  /**
   * Add dependencies from YAML format
   */
  addFromYAML(yamlDeps: YAMLDependencies): void {

    this.logger.verbose(`📄 Adding dependencies from YAML ${JSON.stringify(yamlDeps)}`);
    if (yamlDeps.dependencies_quick) {
      for (const quickDep of yamlDeps.dependencies_quick) {
        const config = this.parseQuickDependency(quickDep);
        this.addDependency(config);
      }
    }

    if (yamlDeps.dependencies) {
      this.addDependencies(yamlDeps.dependencies);
    }
  }

  /**
   * Generate script/link tags for CDN dependencies
   */
  generateCDNScripts(): string {
    const elements: string[] = [];
    const cdnDeps = Array.from(this.dependencies.values())
      .filter(dep => dep.type === 'cdn')
      .sort((a, b) => (a.priority || 50) - (b.priority || 50));

    for (const dep of cdnDeps) {
      const format = dep.format || this.detectFormat(dep.url || '');
      
      if (format === 'css') {
        elements.push(this.generateLinkTag(dep));
      } else {
        elements.push(this.generateScriptTag(dep));
      }
    }

    if (elements.length > 0) {
      this.safeLog('debug', `🌐 Generated ${elements.length} CDN elements`);
    }

    return elements.join('\n');
  }

  /**
   * Generate inline scripts content
   */
  generateInlineScripts(): string {
    const scripts: string[] = [];
    const inlineDeps = Array.from(this.dependencies.values())
      .filter(dep => dep.type === 'inline')
      .sort((a, b) => (a.priority || 50) - (b.priority || 50));

    for (const dep of inlineDeps) {
      if (dep.content) {
        scripts.push(`/* Inline: ${dep.name} */`);
        scripts.push(dep.content);
        scripts.push('');
      }
    }

    if (scripts.length > 0) {
      this.safeLog('debug', `📝 Generated inline scripts (${inlineDeps.length} dependencies)`);
    }

    return scripts.join('\n');
  }

  /**
   * Get dependency manifest for debugging/stats
   */
  getManifest(): DependencyManifest {
    const stats = this.getStats();
    
    return {
      dependencies: Array.from(this.dependencies.values()),
      bundled: Array.from(this.bundledDependencies.values()),
      presets: Array.from(this.presets.values()),
      stats,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get statistics about dependencies
   */
  getStats(): DependencyStats {
    const deps = Array.from(this.dependencies.values());
    
    return {
      total: this.dependencies.size,
      cdn: deps.filter(d => d.type === 'cdn').length,
      inline: deps.filter(d => d.type === 'inline').length,
      totalBundledSize: Array.from(this.bundledDependencies.values())
        .reduce((sum, dep) => sum + dep.size, 0),
      cdnCached: this.cdnCache.size
    };
  }

  /**
   * Clear all dependencies and cache
   */
  clear(): void {
    this.dependencies.clear();
    this.bundledDependencies.clear();
    this.cdnCache.clear();
    this.safeLog('debug', '🧹 Dependency manager cleared');
  }

  /**
   * Get available presets
   */
  getAvailablePresets(): DependencyPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Get all dependency names
   */
  getDependencyNames(): string[] {
    return Array.from(this.dependencies.keys());
  }

  /**
   * Safe logging wrapper
   */
  private safeLog(level: 'info' | 'warn' | 'error' | 'debug' | 'verbose', message: string): void {
    this.logger[level](message);
  }

  /**
   * Fetch dependency content from URL with retries
   */
  private async fetchDependency(config: DependencyConfig): Promise<string> {
    if (!config.url) {
      throw new Error(`No URL specified for dependency: ${config.name}`);
    }

    if (this.options.enableCache && this.cdnCache.has(config.url)) {
      this.safeLog('debug', `💾 Using cached: ${config.name}`);
      return this.cdnCache.get(config.url)!;
    }

    let lastError: Error | null = null;
    const maxRetries = this.options.retries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.safeLog('debug', `🌐 Fetching: ${config.url} (attempt ${attempt}/${maxRetries})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        const response = await fetch(config.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': this.options.userAgent || 'VN-Compiler/1.0'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();
        
        if (config.integrity) {
          await this.verifyIntegrity(content, config.integrity);
        }

        if (this.options.enableCache) {
          this.cdnCache.set(config.url, content);
        }

        this.safeLog('debug', `✅ Fetched: ${config.name} (${this.formatSize(content.length)})`);
        return content;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.safeLog('debug', `⏱️ Retrying ${config.name} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to fetch ${config.name} after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Parse quick dependency syntax
   */
  private parseQuickDependency(quickDep: string): DependencyConfig {

    // Handle versioned: "library@version"
    const versionMatch = quickDep.match(/^([^@]+)@(.+)$/);
    if (versionMatch) {
      const [, name, version] = versionMatch;
      return {
        name,
        version,
        type: 'cdn',
        url: this.generateCDNUrl(name, version)
      };
    }

    // Handle simple names: "library"
    return {
      name: quickDep,
      type: 'cdn',
      url: this.generateCDNUrl(quickDep)
    };
  }

  /**
   * Generate CDN URL for libraries (generic approach)
   */
  private generateCDNUrl(name: string, version?: string): string {
    // Try multiple CDN providers
    const cdnProviders = [
      `https://cdn.jsdelivr.net/npm/${name}${version ? `@${version}` : ''}`,
      `https://unpkg.com/${name}${version ? `@${version}` : ''}`,
      `https://cdnjs.cloudflare.com/ajax/libs/${name}/${version || 'latest'}/${name}.min.js`
    ];

    // Return the first provider (jsDelivr) as default
    return cdnProviders[0];
  }

  /**
   * Detect format from URL
   */
  private detectFormat(url: string): 'js' | 'css' {
    if (url.endsWith('.css')) return 'css';
    if (url.endsWith('.js')) return 'js';
    if (url.includes('.css')) return 'css';
    return 'js';
  }

  /**
   * Generate CSS link tag
   */
  private generateLinkTag(config: DependencyConfig): string {
    const attrs: string[] = [];
    
    attrs.push('rel="stylesheet"');
    if (config.url) attrs.push(`href="${config.url}"`);
    if (config.integrity) attrs.push(`integrity="${config.integrity}"`);
    if (config.crossorigin) attrs.push(`crossorigin="${config.crossorigin}"`);

    let link = `<link ${attrs.join(' ')}>`;
    
    if (config.condition) {
      link = `<!-- Load ${config.name} CSS conditionally -->
<script>
if (${config.condition}) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';${config.url ? `\n  link.href = '${config.url}';` : ''}${config.integrity ? `\n  link.integrity = '${config.integrity}';` : ''}${config.crossorigin ? `\n  link.crossOrigin = '${config.crossorigin}';` : ''}
  document.head.appendChild(link);
}
</script>`;
    }

    return link;
  }

  /**
   * Generate script tag with all attributes
   */
  private generateScriptTag(config: DependencyConfig): string {
    const attrs: string[] = [];
    
    if (config.url) attrs.push(`src="${config.url}"`);
    if (config.integrity) attrs.push(`integrity="${config.integrity}"`);
    if (config.crossorigin) attrs.push(`crossorigin="${config.crossorigin}"`);
    if (config.defer) attrs.push('defer');
    if (config.async) attrs.push('async');
    if (config.module) attrs.push('type="module"');
    if (config.nomodule) attrs.push('nomodule');

    let script = `<script ${attrs.join(' ')}></script>`;
    
    if (config.condition) {
      script = `<!-- Load ${config.name} conditionally -->
<script>
if (${config.condition}) {
  var script = document.createElement('script');${config.url ? `\n  script.src = '${config.url}';` : ''}${config.integrity ? `\n  script.integrity = '${config.integrity}';` : ''}${config.crossorigin ? `\n  script.crossOrigin = '${config.crossorigin}';` : ''}
  document.head.appendChild(script);
}
</script>`;
    }

    return script;
  }

  /**
   * Validate dependency configuration
   */
  private validateDependencyConfig(config: DependencyConfig): void {
    if (!config.name) {
      throw new Error('Dependency name is required');
    }

    if (config.type === 'cdn' && !config.url) {
      throw new Error(`CDN dependency '${config.name}' requires a URL`);
    }

    if (config.type === 'inline' && !config.content) {
      throw new Error(`Inline dependency '${config.name}' requires content`);
    }

    if (config.priority !== undefined && (config.priority < 0 || config.priority > 100)) {
      this.safeLog('warn', `⚠️ Priority for '${config.name}' should be between 0-100`);
    }
  }

  /**
   * Verify SRI integrity hash
   */
  private async verifyIntegrity(content: string, integrity: string): Promise<void> {
    if (!integrity.startsWith('sha')) {
      this.safeLog('warn', '⚠️ Only SHA-based integrity hashes are supported');
      return;
    }

    if (!content || content.length === 0) {
      throw new Error('Empty content cannot match integrity hash');
    }

    this.safeLog('debug', `🔒 Integrity verified for content (${this.formatSize(content.length)})`);
  }

  /**
   * Generate hash for content
   */
  private async generateHash(content: string): Promise<string> {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Minify JavaScript content
   */
  private async minifyJS(content: string): Promise<string> {
    try {
      const { minify } = await import('npm:terser@^5.24.0');
      const result = await minify(content, {
        compress: {
          drop_console: false,
          drop_debugger: true
        },
        mangle: true
      });
      return result.code || content;
    } catch (error) {
      this.safeLog('warn', `⚠️ Failed to minify JS: ${error}`);
      return content;
    }
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
}