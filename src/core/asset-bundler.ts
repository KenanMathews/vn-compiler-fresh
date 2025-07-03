import { walk } from "@std/fs/walk";
import { extname, basename, relative } from "@std/path";
import type { ProcessedAsset, Logger } from "../types/compiler.ts";

/**
 * Asset Bundler for VN Compiler
 * Processes images, audio, video files for embedding or referencing
 */
export class AssetBundler {
  private supportedExtensions = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
    audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
    video: ['.mp4', '.webm', '.avi', '.mov', '.wmv', '.flv']
  };

  private maxEmbedSize = 1024 * 1024;

  constructor(private logger: Logger) {}

  /**
   * Process all assets in a directory
   */
  async processAssets(assetsDir: string): Promise<ProcessedAsset[]> {
    this.logger.info(`🎨 Processing assets from: ${assetsDir}`);
    
    try {
      const dirStat = await Deno.stat(assetsDir);
      if (!dirStat.isDirectory) {
        throw new Error(`Asset path is not a directory: ${assetsDir}`);
      }

      const assets: ProcessedAsset[] = [];
      
      for await (const entry of walk(assetsDir, { includeDirs: false })) {
        if (this.isSupportedAsset(entry.path)) {
          try {
            const asset = await this.processAsset(entry.path, assetsDir);
            assets.push(asset);
            this.logger.debug(`✅ Processed asset: ${asset.name} (${asset.type})`);
          } catch (error) {
            const errorString = error instanceof Error ? error.message : String(error); 
            this.logger.warn(`⚠️  Failed to process asset ${entry.path}: ${errorString}`);
          }
        } else {
          this.logger.debug(`⏭️  Skipping unsupported file: ${entry.path}`);
        }
      }

      this.logger.info(`📦 Processed ${assets.length} assets`);
      this.logAssetStats(assets);
      
      return assets;
      
    } catch (error) {
        const errorString = error instanceof Error ? error.message : String(error); 
        if (errorString.includes('No such file')) {
            this.logger.warn(`📁 Assets directory not found: ${assetsDir}`);
            return [];
        }
        throw new Error(`Failed to process assets: ${errorString}`);
    }
  }

  /**
   * Process a single asset file
   */
  private async processAsset(filePath: string, baseDir: string): Promise<ProcessedAsset> {
    const stat = await Deno.stat(filePath);
    const extension = extname(filePath).toLowerCase();
    const name = basename(filePath);
    const relativePath = relative(baseDir, filePath);
    
    const type = this.getAssetType(extension);
    
    const key = this.generateAssetKey(relativePath);
    
    const asset: ProcessedAsset = {
      key,
      name,
      path: relativePath,
      type,
      size: stat.size
    };

    if (stat.size <= this.maxEmbedSize && type === 'image') {
      asset.data = await this.embedAsBase64(filePath);
      this.logger.debug(`📎 Embedded ${name} as base64 (${this.formatSize(stat.size)})`);
    } else {
      asset.url = relativePath;
      this.logger.debug(`🔗 Referenced ${name} as external file (${this.formatSize(stat.size)})`);
    }

    if (type === 'image') {
      asset.metadata = await this.getImageMetadata(filePath);
    } else if (type === 'audio' || type === 'video') {
      asset.metadata = await this.getMediaMetadata(filePath);
    }

    return asset;
  }

  /**
   * Register asset helpers with VN Engine
   */
  registerAssetHelpers(vnEngine: any, assets: ProcessedAsset[]): void {
    this.logger.debug("Registering asset helpers with VN Engine...");

    const assetMap = new Map(assets.map(asset => [asset.key, asset]));
    
    vnEngine.registerHelper('showImage', (assetKey: string, alt?: string, className?: string) => {
      return this.createImageHelper(assetMap, assetKey, alt, className);
    });

    vnEngine.registerHelper('playAudio', (assetKey: string, autoplay: boolean = false, loop: boolean = false) => {
      return this.createAudioHelper(assetMap, assetKey, autoplay, loop);
    });

    vnEngine.registerHelper('playVideo', (assetKey: string, autoplay: boolean = false, loop: boolean = false, className?: string) => {
      return this.createVideoHelper(assetMap, assetKey, autoplay, loop, className);
    });

    vnEngine.registerHelper('assetInfo', (assetKey: string) => {
      const asset = assetMap.get(assetKey);
      return asset ? {
        name: asset.name,
        type: asset.type,
        size: this.formatSize(asset.size),
        metadata: asset.metadata
      } : null;
    });

    this.logger.info("✅ Asset helpers registered");
  }

  /**
   * Generate asset manifest for runtime
   */
  generateAssetManifest(assets: ProcessedAsset[]): any {
    return {
      version: '1.0',
      generated: new Date().toISOString(),
      assets: assets.map(asset => ({
        key: asset.key,
        name: asset.name,
        type: asset.type,
        size: asset.size,
        embedded: !!asset.data,
        url: asset.url,
        metadata: asset.metadata
      })),
      stats: {
        total: assets.length,
        embedded: assets.filter(a => !!a.data).length,
        external: assets.filter(a => !!a.url).length,
        totalSize: assets.reduce((sum, a) => sum + a.size, 0)
      }
    };
  }

  private isSupportedAsset(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return Object.values(this.supportedExtensions).flat().includes(ext);
  }

  private getAssetType(extension: string): 'image' | 'audio' | 'video' | 'unknown' {
    if (this.supportedExtensions.image.includes(extension)) return 'image';
    if (this.supportedExtensions.audio.includes(extension)) return 'audio';
    if (this.supportedExtensions.video.includes(extension)) return 'video';
    return 'unknown';
  }

  private generateAssetKey(relativePath: string): string {
    return relativePath
      .replace(extname(relativePath), '')
      .replace(/[\/\\]/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase();
  }

  private async embedAsBase64(filePath: string): Promise<string> {
    const data = await Deno.readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    
    const mimeType = this.getMimeType(extension);
    
    const base64 = btoa(String.fromCharCode(...data));
    
    return `data:${mimeType};base64,${base64}`;
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  private async getImageMetadata(filePath: string): Promise<any> {
    return {
      format: extname(filePath).substring(1).toUpperCase()
    };
  }

  private async getMediaMetadata(filePath: string): Promise<any> {
    return {
      format: extname(filePath).substring(1).toUpperCase()
    };
  }

  private createImageHelper(assetMap: Map<string, ProcessedAsset>, assetKey: string, alt?: string, className?: string): string {
    const asset = assetMap.get(assetKey);
    if (!asset) {
      return `<!-- Asset not found: ${assetKey} -->`;
    }

    const src = asset.data || asset.url || '';
    const altText = alt || asset.name;
    const cssClass = className ? ` class="${className}"` : '';
    
    return `<img src="${src}" alt="${altText}"${cssClass} data-asset="${assetKey}">`;
  }

  private createAudioHelper(assetMap: Map<string, ProcessedAsset>, assetKey: string, autoplay: boolean, loop: boolean): string {
    const asset = assetMap.get(assetKey);
    if (!asset) {
      return `<!-- Audio asset not found: ${assetKey} -->`;
    }

    const src = asset.url || '';
    const autoAttr = autoplay ? ' autoplay' : '';
    const loopAttr = loop ? ' loop' : '';
    
    return `<audio src="${src}" controls${autoAttr}${loopAttr} data-asset="${assetKey}"></audio>`;
  }

  private createVideoHelper(assetMap: Map<string, ProcessedAsset>, assetKey: string, autoplay: boolean, loop: boolean, className?: string): string {
    const asset = assetMap.get(assetKey);
    if (!asset) {
      return `<!-- Video asset not found: ${assetKey} -->`;
    }

    const src = asset.url || '';
    const autoAttr = autoplay ? ' autoplay' : '';
    const loopAttr = loop ? ' loop' : '';
    const cssClass = className ? ` class="${className}"` : '';
    
    return `<video src="${src}" controls${autoAttr}${loopAttr}${cssClass} data-asset="${assetKey}"></video>`;
  }

  private logAssetStats(assets: ProcessedAsset[]): void {
    const stats = {
      total: assets.length,
      images: assets.filter(a => a.type === 'image').length,
      audio: assets.filter(a => a.type === 'audio').length,
      video: assets.filter(a => a.type === 'video').length,
      embedded: assets.filter(a => !!a.data).length,
      external: assets.filter(a => !!a.url).length,
      totalSize: assets.reduce((sum, a) => sum + a.size, 0)
    };

    this.logger.info(`📊 Asset Statistics:`);
    this.logger.info(`   Total: ${stats.total} files`);
    this.logger.info(`   Images: ${stats.images}, Audio: ${stats.audio}, Video: ${stats.video}`);
    this.logger.info(`   Embedded: ${stats.embedded}, External: ${stats.external}`);
    this.logger.info(`   Total size: ${this.formatSize(stats.totalSize)}`);
  }

  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
}
