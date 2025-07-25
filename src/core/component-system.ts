import type { Logger } from "../types/compiler.ts";
import { dirname } from "@std/path";

/**
 * Component Helper Configuration
 */
export interface ComponentHelperConfig {
  id: string;                    // Unique component instance ID
  componentName: string;         // Component class name (e.g., 'MapComponent')
  scriptPath: string;           // Path to component file (e.g., './components/map.js')
  cssPath?: string;             // Optional path to component CSS file (e.g., './components/map.css')
  instanceId: string;           // User-defined instance name (e.g., 'worldMap')
  config: Record<string, unknown>;  // Component configuration options
  sceneId: string;              // Scene where component is used
  instructionIndex: number;     // Position in scene instructions
}

/**
 * VN Component Interface
 */
export interface VNComponent {
  // Lifecycle methods
  mount(container: HTMLElement): Promise<void> | void;
  unmount(): Promise<void> | void;
  update(config: Record<string, any>): Promise<void> | void;
  
  // VN Engine integration
  onGameStateChange?(state: any): void;
  onSceneChange?(sceneId: string): void;
  
  // Communication
  emit(event: string, data: any): void;
}

/**
 * Component Metadata
 */
export interface ComponentMetadata {
  name: string;
  instances: string[];          // List of instance IDs
  scenes: string[];            // Scenes where component is used
  scriptPath: string;
  loaded: boolean;
  mountCount: number;
}

/**
 * VN Component Helper System
 * Extracts, validates, and manages interactive components
 */
export class VNComponentHelperSystem {
  private components: Map<string, ComponentHelperConfig> = new Map();
  private componentCounter = 0;
  private mountedComponents: Map<string, VNComponent> = new Map();
  private loadedScripts: Map<string, any> = new Map();
  private componentMetadata: Map<string, ComponentMetadata> = new Map();
  private scriptFolder: string = new URL('.', import.meta.url).pathname;

  constructor(
    private vnEngine: any,
    private logger: Logger,
  ) {}

  /**
   * Initialize script folder path
   */
  initializeScriptFolder(scriptPath: string): void {
    this.scriptFolder = dirname(scriptPath);
  }

  /**
   * Extract component helpers from parsed scenes (mirrors input system)
   */
  extractComponentHelpers(scenes: any[]): ComponentHelperConfig[] {
    this.logger.debug("🔍 Extracting component helpers from scenes...");
    
    const helpers: ComponentHelperConfig[] = [];
    
    // Handle VN Engine scene format (array of scene objects)
    if (Array.isArray(scenes)) {
      for (const scene of scenes) {
        if (scene && scene.name && scene.instructions) {
          const sceneHelpers = this.extractFromScene(scene.name, scene.instructions);
          helpers.push(...sceneHelpers);
        }
      }
    } else {
      // Handle legacy format (object with scene keys)
      for (const [sceneId, instructions] of Object.entries(scenes)) {
        if (!Array.isArray(instructions)) continue;
        
        const sceneHelpers = this.extractFromScene(sceneId, instructions);
        helpers.push(...sceneHelpers);
      }
    }
    
    this.logger.info(`🧩 Found ${helpers.length} component helpers`);
    return helpers;
  }

  /**
   * Extract component helpers from a single scene
   */
  private extractFromScene(sceneId: string, instructions: any[]): ComponentHelperConfig[] {
    const helpers: ComponentHelperConfig[] = [];
    
    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];
      
      if (typeof instruction === 'string') {
        const componentHelpers = this.parseComponentFromString(instruction, sceneId, i);
        helpers.push(...componentHelpers);
      } else if (instruction && typeof instruction === 'object') {
        // Check various fields for component helpers
        const fields = ['say', 'text', 'content', 'message'];
        for (const field of fields) {
          if (instruction[field] && typeof instruction[field] === 'string') {
            const componentHelpers = this.parseComponentFromString(instruction[field], sceneId, i);
            helpers.push(...componentHelpers);
          }
        }
      }
    }
    
    return helpers;
  }

  /**
   * Parse component helpers from a string - Action-Based API only
   */
  private parseComponentFromString(text: string, sceneId: string, instructionIndex: number): ComponentHelperConfig[] {
    const helpers: ComponentHelperConfig[] = [];
    
    const createRegex = /\{\{component\s+["']create["']\s+["']([^"']+)["']\s+["']([^"']+)["']\s+["']([^"']+)["']\s+["']([^"']+)["']\s+["']([^"']*?)["']\s*\}\}/g;
    
    
    let match;
    while ((match = createRegex.exec(text)) !== null) {
      const [, componentName, scriptPath, cssPath, instanceId, configStr] = match;
      
      // Parse configuration
      const config = this.parseComponentParams(configStr || '');
      
      // Detect CSS path if not provided
      let finalCssPath: string | undefined = cssPath;
      if (!cssPath || cssPath === 'null' || cssPath === '') {
        finalCssPath = this.detectCSSPath(scriptPath);
      }
      
      const helper: ComponentHelperConfig = {
        id: this.generateComponentId(componentName, sceneId),
        componentName: componentName.trim(),
        scriptPath: scriptPath.trim(),
        cssPath: finalCssPath,
        instanceId: instanceId.trim(),
        config,
        sceneId,
        instructionIndex
      };
      
      helpers.push(helper);
      this.components.set(helper.id, helper);
      
      // Update metadata
      this.updateComponentMetadata(helper);
    }
    
    return helpers;
  }

  /**
   * Detect CSS path for a component script path
   */
  private detectCSSPath(scriptPath: string): string | undefined {
    if (!scriptPath || !scriptPath.includes('.')) {
      return undefined;
    }
    
    const basePath = scriptPath.replace(/\.[^.]*$/, ''); // Remove extension
    const possiblePaths = [
      `${basePath}-styles.css`,
      `${basePath}.css`,
      `${basePath}-style.css`
    ];
    
    // Check if any of these files exist
    for (const path of possiblePaths) {
      try {
        const stat = Deno.statSync(path);
        if (stat.isFile) {
          this.logger.debug(`✅ Auto-detected CSS for component: ${path}`);
          return path;
        }
      } catch {
        // File doesn't exist, continue to next option
      }
    }
    
    this.logger.debug(`⚠️ No CSS file auto-detected for: ${scriptPath}`);
    return undefined;
  }

  /**
   * Resolve handlebars templates using the provided context
   */
  private resolveTemplatesWithContext(templateStr: string, context: Record<string, unknown>): string {
    if (!templateStr || !context) {
      return templateStr;
    }

    try {
      // Replace {{variableName}} with actual values from context
      return templateStr.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const trimmedVarName = varName.trim();
        const value = context[trimmedVarName];
        
        if (value === undefined || value === null) {
          return match;
        }
        
        // Handle arrays and objects by serializing them
        if (Array.isArray(value)) {
          return value.join(',');
        } else if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        
        return String(value);
      });
    } catch (error) {
      this.logger.warn(`Template resolution failed for: ${templateStr}`, error);
      return templateStr;
    }
  }

  /**
   * Parse component configuration parameters (key=value format)
   */
  private parseComponentParams(paramStr: string): Record<string, any> {
    if (!paramStr || paramStr.trim() === '') {
      return {};
    }
    
    try {
      const config: Record<string, any> = {};
      const pairs = paramStr.split(',');
      
      for (const pair of pairs) {
        const [key, value] = pair.split('=').map(s => s.trim());
        if (key && value !== undefined) {
          // Handle different value types
          if (value === 'true') {
            config[key] = true;
          } else if (value === 'false') {
            config[key] = false;
          } else if (/^\d+$/.test(value)) {
            config[key] = parseInt(value, 10);
          } else if (/^\d*\.\d+$/.test(value)) {
            config[key] = parseFloat(value);
          } else {
            // Keep as string, preserving template variables like {{playerName}}
            config[key] = value;
          }
        }
      }
      
      return config;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to parse component params: ${paramStr}`, error);
      return {};
    }
  }

  /**
   * Generate unique component ID
   */
  private generateComponentId(componentName: string, sceneId: string): string {
    return `component-${componentName.toLowerCase()}-${sceneId}-${++this.componentCounter}`;
  }



  /**
   * Update component metadata
   */
  private updateComponentMetadata(helper: ComponentHelperConfig): void {
    const key = helper.componentName;
    const metadata = this.componentMetadata.get(key) || {
      name: helper.componentName,
      instances: [],
      scenes: [],
      scriptPath: helper.scriptPath,
      loaded: false,
      mountCount: 0
    };
    
    if (!metadata.instances.includes(helper.instanceId)) {
      metadata.instances.push(helper.instanceId);
    }
    
    if (!metadata.scenes.includes(helper.sceneId)) {
      metadata.scenes.push(helper.sceneId);
    }
    
    this.componentMetadata.set(key, metadata);
  }

  /**
   * Register component helpers with VN Engine handlebars
   */
  registerComponentHelpers(): void {
    this.logger.debug("📋 Registering component helpers with VN Engine...");
    
    // Main component helper
    this.vnEngine.registerHelper('component', this.createComponentHelper.bind(this));
    
    this.logger.info("✅ Component helpers registered with VN Engine");
  }

  /**
   * Create component helper function
   */
  private createComponentHelper(
    componentName: string,
    scriptPath: string,
    _cssPath: string,
    instanceId: string,
    configStr: string = '',
    context: any
  ): string {
    // Resolve handlebars templates in config string using context
    const resolvedConfigStr = this.resolveTemplatesWithContext(configStr || '', context);
    const config = this.parseComponentParams(resolvedConfigStr);
    
    const helper: ComponentHelperConfig = {
      id: this.generateComponentId(componentName, 'runtime'),
      componentName,
      scriptPath,
      instanceId,
      config,
      sceneId: 'runtime',
      instructionIndex: 0
    };
    
    this.components.set(helper.id, helper);
    
    // Generate placeholder HTML that will be replaced with actual component
    const containerId = `component-container-${helper.id}`;
    
    // Schedule component mounting
    setTimeout(() => this.mountComponent(helper.id, containerId), 100);
    
    return `<div id="${containerId}" class="vn-component" data-component="${componentName}" data-instance="${instanceId}">
      <div class="vn-component-loading">Loading ${componentName}...</div>
    </div>`;
  }

  /**
   * Mount a component in the DOM
   */
  async mountComponent(componentId: string, containerId: string): Promise<void> {
    const helper = this.components.get(componentId);
    if (!helper) {
      this.logger.error(`❌ Component not found: ${componentId}`);
      return;
    }
    
    try {
      // Load component script if not already loaded
      const ComponentClass = await this.loadComponentScript(helper.scriptPath);
      
      // Create component instance
      const component = new ComponentClass(this.vnEngine, helper.config);
      
      // Find container element
      const container = document.getElementById(containerId);
      if (!container) {
        this.logger.error(`❌ Component container not found: ${containerId}`);
        return;
      }
      
      // Mount component
      await component.mount(container);
      
      // Store mounted component
      this.mountedComponents.set(componentId, component);
      
      // Update metadata
      const metadata = this.componentMetadata.get(helper.componentName);
      if (metadata) {
        metadata.mountCount++;
        this.componentMetadata.set(helper.componentName, metadata);
      }
      
      this.logger.debug(`✅ Component mounted: ${helper.componentName} (${helper.instanceId})`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to mount component: ${helper.componentName}`, error);
      
      // Update container with error message
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `<div class="vn-component-error">Error loading ${helper.componentName}</div>`;
      }
    }
  }

  /**
   * Load component script dynamically
   */
  private async loadComponentScript(scriptPath: string): Promise<any> {
    if (this.loadedScripts.has(scriptPath)) {
      return this.loadedScripts.get(scriptPath);
    }
    
    // Try multiple resolution strategies
    const possiblePaths = await this.resolveComponentPath(scriptPath);
    
    let lastError: Error | null = null;
    for (const resolvedPath of possiblePaths) {
      try {
        const module = await import(resolvedPath);
        const ComponentClass = module.default || module;
        
        this.loadedScripts.set(scriptPath, ComponentClass);
        this.logger.debug(`✅ Loaded component from: ${resolvedPath}`);
        return ComponentClass;
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }
    
    throw new Error(`Failed to load component script: ${scriptPath}. Last error: ${lastError?.message}`);
  }

  private async resolveComponentPath(scriptPath: string): Promise<string[]> {
    const paths: string[] = [];
    
    // 1. If already absolute, use as-is
    if (scriptPath.startsWith('http://') || scriptPath.startsWith('https://') || scriptPath.startsWith('file://')) {
      paths.push(scriptPath);
      return paths;
    }
    
    if (this.scriptFolder) {
      const yamlRelative = new URL(scriptPath, `file://${this.scriptFolder}/`).href;
      paths.push(yamlRelative);
    }
    
    // 3. Resolve relative to executable location (your suggested approach)
    try {
      const execDir = dirname(Deno.execPath());
      const execRelative = new URL(scriptPath, `file://${execDir}/`).href;
      paths.push(execRelative);
    } catch {
      // Deno.execPath() might not be available in all contexts
    }
    
    // 4. Resolve relative to current module (compiler location)
    const moduleRelative = new URL(scriptPath, import.meta.url).href;
    paths.push(moduleRelative);
    
    // 5. Fallback to CWD (current behavior)
    const cwdRelative = new URL(scriptPath, `file://${Deno.cwd()}/`).href;
    paths.push(cwdRelative);
    
    return paths;
  }

  /**
   * Unmount component
   */
  async unmountComponent(componentId: string): Promise<void> {
    const component = this.mountedComponents.get(componentId);
    if (component && component.unmount) {
      try {
        await component.unmount();
        this.mountedComponents.delete(componentId);
        
        const helper = this.components.get(componentId);
        if (helper) {
          const metadata = this.componentMetadata.get(helper.componentName);
          if (metadata) {
            metadata.mountCount = Math.max(0, metadata.mountCount - 1);
            this.componentMetadata.set(helper.componentName, metadata);
          }
        }
        
        this.logger.debug(`✅ Component unmounted: ${componentId}`);
      } catch (error) {
        this.logger.error(`❌ Failed to unmount component: ${componentId}`, error);
      }
    }
  }

  /**
   * Update component configuration
   */
  async updateComponent(componentId: string, newConfig: Record<string, any>): Promise<void> {
    const component = this.mountedComponents.get(componentId);
    if (component && component.update) {
      try {
        await component.update(newConfig);
        this.logger.debug(`✅ Component updated: ${componentId}`);
      } catch (error) {
        this.logger.error(`❌ Failed to update component: ${componentId}`, error);
      }
    }
  }

  /**
   * Handle scene change - unmount/mount components as needed
   */
  async handleSceneChange(newSceneId: string): Promise<void> {
    // Notify all mounted components of scene change
    for (const [componentId, component] of this.mountedComponents) {
      if (component.onSceneChange) {
        try {
          component.onSceneChange(newSceneId);
        } catch (error) {
          this.logger.error(`❌ Component scene change error: ${componentId}`, error);
        }
      }
    }
  }

  /**
   * Handle game state change
   */
  handleGameStateChange(newState: any): void {
    // Notify all mounted components of state change
    for (const [componentId, component] of this.mountedComponents) {
      if (component.onGameStateChange) {
        try {
          component.onGameStateChange(newState);
        } catch (error) {
          this.logger.error(`❌ Component state change error: ${componentId}`, error);
        }
      }
    }
  }

  /**
   * Get all component helpers
   */
  getAllComponents(): ComponentHelperConfig[] {
    return Array.from(this.components.values());
  }

  /**
   * Get component metadata
   */
  getComponentMetadata(): ComponentMetadata[] {
    return Array.from(this.componentMetadata.values());
  }

  /**
   * Get mounted components
   */
  getMountedComponents(): Map<string, VNComponent> {
    return new Map(this.mountedComponents);
  }
}
