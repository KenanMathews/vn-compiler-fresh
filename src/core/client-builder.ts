// src/core/client-builder.ts
import type { Logger } from "../types/compiler.ts";

/**
 * Client Builder for VN Compiler
 * Manages loading and bundling of client-side runtime files
 */
export class ClientBuilder {
  private clientRuntimeCache: Map<string, string> = new Map();

  constructor(private logger: Logger) {}

  /**
   * Load and return client runtime file content
   */
  async loadClientRuntime(fileName: string): Promise<string> {
    if (this.clientRuntimeCache.has(fileName)) {
      return this.clientRuntimeCache.get(fileName)!;
    }

    try {
      const content = await this.readClientFile(fileName);
      this.clientRuntimeCache.set(fileName, content);
      return content;
    } catch (error) {
      const errorMsg = `❌ Failed to load client runtime file ${fileName}: ${error}`;
      this.logger.error(errorMsg);
      console.error(errorMsg);
      throw error;
    }
  }

  /**
   * Get all client runtime files content
   */
  async getAllClientRuntimes(): Promise<Record<string, string>> {
    const files = [
      'utils/polyfills.js',
      'runtime/dom-observer-manager.js',
      'runtime/vn-compiler-runtime.js',
      'runtime/asset-manager.js',
      'runtime/input-manager.js',
      'runtime/component-manager.js',
      'runtime/base-component.js',
      'runtime/ui-manager.js',
      'runtime/scene-manager.js',
      'runtime/feed-manager.js',
      'runtime/menu-manager.js',
      'runtime/save-manager.js',
      'runtime/game-initialization.js',
      'utils/debug-helpers.js',
      'assets/template.html',
      'assets/theme.css'
    ];
  
    const loadPromises = files.map(async (file) => {
      try {
        const content = await this.loadClientRuntime(file);
        const placeholder = this.getPlaceholderName(file);
        return { placeholder, content, success: true };
      } catch (error) {
        const placeholder = this.getPlaceholderName(file);
        const fallbackContent = this.getFallbackContent(file);
        console.log(`📁 Fallback ${file} → ${placeholder} (${fallbackContent.length} chars)`);
        return { placeholder, content: fallbackContent, success: false };
      }
    });
  
    const results = await Promise.all(loadPromises);
    
    const runtimes: Record<string, string> = {};
    for (const result of results) {
      runtimes[result.placeholder] = result.content;
    }
  
    const successCount = results.filter(r => r.success).length;
    this.logger.info(`📦 Loaded ${successCount}/${files.length} client runtime files (${files.length - successCount} fallbacks)`);
    
    return runtimes;
  }

  /**
   * Clear client runtime cache
   */
  clearCache(): void {
    this.clientRuntimeCache.clear();
    this.logger.debug("🧹 Client runtime cache cleared");
  }

  /**
   * Read client file from disk (with fallback for compiled binaries)
   */
  private async readClientFile(fileName: string): Promise<string> {
    // Try multiple path resolution strategies
    const possiblePaths = [
      // Development mode - relative to source
      new URL(`./client/${fileName}`, import.meta.url),
      // Compiled binary mode - relative to working directory  
      `./src/core/client/${fileName}`,
      // Alternative compiled path
      `src/core/client/${fileName}`
    ];

    for (const path of possiblePaths) {
      try {
        const content = await Deno.readTextFile(path);
        this.logger.debug(`📁 Loaded client runtime: ${fileName} from ${path}`);
        return content;
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    throw new Error(`Cannot read client file ${fileName} from any location`);
  }

  /**
   * Get placeholder name for template replacement
   */
  private getPlaceholderName(fileName: string): string {
    return fileName
      .replace('/', '_')
      .replace(/-/g, '_')
      .replace(/\.js$/, '_JS')
      .replace(/\.html$/, '_HTML')
      .replace(/\.css$/, '_CSS')
      .toUpperCase();
  }

  /**
   * Get fallback content for missing files
   */
  private getFallbackContent(fileName: string): string {
    const fallbacks: Record<string, string> = {
      'utils/polyfills.js': `// Browser polyfills`,
      
      'utils/debug-helpers.js': `// Debug helpers
if (typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.VN_DEBUG)) {
  window.vnDebug = {
    info: () => console.log('Debug helpers loaded'),
    version: '1.0.0'
  };
  console.log('🐛 Debug helpers loaded');
}`,

      'vendor/vn-engine-loader.js': `// VN Engine ES Module Import
console.log('📦 Loading VN Engine...');
let createVNEngine;
(async () => {
  try {
    const vnEngineModule = await import('vn-engine');
    createVNEngine = vnEngineModule.createVNEngine;
    window.createVNEngine = createVNEngine;
    console.log('✅ VN Engine loaded');
    window.dispatchEvent(new CustomEvent('vn-engine-ready', { detail: { createVNEngine } }));
  } catch (error) {
    console.error('❌ Failed to load VN Engine:', error);
    throw error;
  }
})();`,

      'runtime/vn-compiler-runtime.js': `// VN Compiler Runtime
class VNCompilerRuntime {
  constructor() {
    this.vnEngine = null;
    this.gameData = null;
    this.initialized = false;
  }
  
  async initialize(runtimeData) {
    console.log('🎮 Initializing VN Compiler Runtime...');
    this.gameData = runtimeData.gameData;
    
    await this.waitForVNEngine();
    this.vnEngine = await createVNEngine();
    this.vnEngine.loadScript(this.gameData.script);
    
    this.initialized = true;
    console.log('✅ VN Compiler Runtime initialized');
  }
  
  async waitForVNEngine() {
    if (typeof createVNEngine !== 'undefined') return;
    return new Promise((resolve) => {
      window.addEventListener('vn-engine-ready', () => resolve());
    });
  }
  
  getGameInterface() {
    return {
      continue: () => this.vnEngine.continue(),
      makeChoice: (index) => this.vnEngine.makeChoice(index),
      getCurrentScene: () => this.vnEngine.getCurrentScene(),
      restart: () => this.vnEngine.restart()
    };
  }
  
  async startGame() {
    const scenes = this.vnEngine.getAllScenes();
    if (scenes.length > 0) {
      this.vnEngine.startScene(scenes[0]);
      this.renderCurrentInstruction();
    }
  }
  
  renderCurrentInstruction() {
    const result = this.vnEngine.continue();
    if (result.type === 'display_dialogue') {
      document.getElementById('vn-content').innerHTML = result.content;
      document.getElementById('vn-continue').style.display = 'block';
    }
  }
}
window.VNCompilerRuntime = VNCompilerRuntime;`,

      'runtime/asset-manager.js': `// Asset Manager
class AssetManager {
  constructor(assetManifest) {
    this.assets = assetManifest || {};
  }
  getAsset(key) { return this.assets[key] || null; }
}`,

      'runtime/dom-observer-manager.js': `// DOM Observer Manager (Fallback)
class DOMObserverManager {
  constructor() {
    this.isInitialized = false;
    this.pendingMounts = new Map();
  }
  
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }
  
  waitForElementById(elementId, callback, timeout = 10000) {
    const checkElement = () => {
      const element = document.getElementById(elementId);
      if (element) {
        callback(element);
      } else {
        setTimeout(checkElement, 10);
      }
    };
    checkElement();
  }
  
  waitForElement(selector, callback, timeout = 10000) {
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        callback(element);
      } else {
        setTimeout(checkElement, 10);
      }
    };
    checkElement();
  }
}
window.DOMObserverManager = DOMObserverManager;
if (typeof module === 'undefined') {
  window.domObserver = new DOMObserverManager();
}`,

      'runtime/input-manager.js': `// Input Manager
class InputManager {
  constructor(vnEngine) {
    this.vnEngine = vnEngine;
  }
}`,

      'runtime/scene-manager.js': `// Scene Manager
class SceneManager {
  constructor() {
    this.currentSceneId = '';
  }
}`,

      'runtime/game-initialization.js': `// Game Initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.log('🎮 Initializing VN Game...');
    const runtime = new VNCompilerRuntime();
    await runtime.initialize(window.VN_RUNTIME_DATA);
    window.vnGame = runtime.getGameInterface();
    window.vnRuntime = runtime;
    await runtime.startGame();
    
    // Setup continue button
    document.getElementById('vn-continue').addEventListener('click', () => {
      runtime.renderCurrentInstruction();
    });
    
    console.log('✅ VN Game initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize VN Game:', error);
  }
});`
    };

    return fallbacks[fileName] || `// Fallback content for ${fileName}\nconsole.log('📁 Loaded fallback: ${fileName}');`;
  }
}