import type { Logger } from "../types/compiler.ts";

/**
 * Scene Container Metadata
 */
export interface SceneMetadata {
  id: string;
  name: string;
  index: number;
  type: 'intro' | 'dialogue' | 'choice' | 'action' | 'ending' | 'custom';
  hasChoices: boolean;
  hasInputHelpers: boolean;
  instructionCount: number;
  assets: string[];
  variables: string[];
  flags: string[];
  timestamp: number;
}

/**
 * VN Scene Manager
 * Handles scene containers with metadata and transitions
 */
export class VNSceneManager {
  private sceneMetadata: Map<string, SceneMetadata> = new Map();
  private sceneIndex = 0;

  constructor(private logger: Logger) {}

  /**
   * Analyze scenes and generate metadata
   */
  analyzeScenes(scenes: any[]): SceneMetadata[] {
    this.logger.debug("🔍 Analyzing scenes for metadata generation...");
    
    const metadata: SceneMetadata[] = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const meta = this.generateSceneMetadata(scene, i);
      metadata.push(meta);
      this.sceneMetadata.set(scene.name, meta);
    }
    
    this.logger.info(`📊 Generated metadata for ${metadata.length} scenes`);
    return metadata;
  }

  /**
   * Generate metadata for a single scene
   */
  private generateSceneMetadata(scene: any, index: number): SceneMetadata {
    const metadata: SceneMetadata = {
      id: this.generateSceneId(scene.name),
      name: scene.name,
      index,
      type: this.determineSceneType(scene),
      hasChoices: this.sceneHasChoices(scene),
      hasInputHelpers: this.sceneHasInputHelpers(scene),
      instructionCount: scene.instructions ? scene.instructions.length : 0,
      assets: this.extractSceneAssets(scene),
      variables: this.extractSceneVariables(scene),
      flags: this.extractSceneFlags(scene),
      timestamp: Date.now()
    };
    
    this.logger.debug(`📝 Scene metadata: ${scene.name} (${metadata.type}, ${metadata.instructionCount} instructions)`);
    
    return metadata;
  }

  /**
   * Generate HTML for scene container with metadata
   */
  generateSceneContainer(sceneId: string): string {
    const metadata = this.sceneMetadata.get(sceneId);
    if (!metadata) {
      this.logger.warn(`⚠️  No metadata found for scene: ${sceneId}`);
      return this.createBasicSceneContainer(sceneId);
    }
    
    return this.createSceneContainerWithMetadata(metadata);
  }

  /**
   * Get runtime JavaScript for scene transitions
   */
  getSceneTransitionRuntime(): string {
    return `
class SceneTransitionManager {
  constructor() {
    this.currentSceneId = '';
    this.sceneHistory = [];
    this.transitionInProgress = false;
  }

  async transitionToScene(sceneId, transitionType = 'fade') {
    if (this.transitionInProgress) return;
    
    this.transitionInProgress = true;
    
    try {
      if (this.currentSceneId) {
        this.sceneHistory.push(this.currentSceneId);
      }
      
      const currentContainer = document.querySelector('.vn-scene.active');
      const newContainer = this.createSceneContainer(sceneId);
      
      const sceneParent = document.getElementById('vn-scene-container');
      if (sceneParent) {
        sceneParent.appendChild(newContainer);
      }
      
      await this.performTransition(currentContainer, newContainer, transitionType);
      
      this.currentSceneId = sceneId;
      this.updateSceneMetadata(sceneId);
      
      if (currentContainer) {
        currentContainer.remove();
      }
      
    } finally {
      this.transitionInProgress = false;
    }
  }

  createSceneContainer(sceneId) {
    const container = document.createElement('div');
    container.className = 'vn-scene';
    container.setAttribute('data-scene-id', sceneId);
    container.setAttribute('data-scene-index', this.sceneHistory.length);
    
    const metadata = this.getSceneMetadata(sceneId);
    if (metadata) {
      container.setAttribute('data-scene-type', metadata.type);
      container.setAttribute('data-has-choices', metadata.hasChoices);
      container.setAttribute('data-has-inputs', metadata.hasInputHelpers);
      container.setAttribute('data-instruction-count', metadata.instructionCount);
    }
    
    return container;
  }

  async performTransition(oldContainer, newContainer, type) {
    switch (type) {
      case 'fade':
        return this.fadeTransition(oldContainer, newContainer);
      case 'slide':
        return this.slideTransition(oldContainer, newContainer);
      case 'none':
        return this.instantTransition(oldContainer, newContainer);
      default:
        return this.fadeTransition(oldContainer, newContainer);
    }
  }

  async fadeTransition(oldContainer, newContainer) {
    if (oldContainer) {
      oldContainer.style.opacity = '0';
      await this.wait(300);
    }
    
    newContainer.style.opacity = '0';
    newContainer.classList.add('active');
    
    await this.wait(50);
    newContainer.style.opacity = '1';
    await this.wait(300);
  }

  async slideTransition(oldContainer, newContainer) {
    if (oldContainer) {
      oldContainer.style.transform = 'translateX(-100%)';
      await this.wait(300);
    }
    
    newContainer.style.transform = 'translateX(100%)';
    newContainer.classList.add('active');
    
    await this.wait(50);
    newContainer.style.transform = 'translateX(0)';
    await this.wait(300);
  }

  instantTransition(oldContainer, newContainer) {
    if (oldContainer) {
      oldContainer.classList.remove('active');
    }
    newContainer.classList.add('active');
    return Promise.resolve();
  }

  updateSceneMetadata(sceneId) {
    const container = document.getElementById('vn-container');
    if (container) {
      container.setAttribute('data-current-scene', sceneId);
      container.setAttribute('data-total-scenes', this.sceneHistory.length + 1);
    }
    
    window.dispatchEvent(new CustomEvent('vn-scene-changed', {
      detail: { sceneId, history: this.sceneHistory }
    }));
  }

  getSceneMetadata(sceneId) {
    return window.VN_RUNTIME_DATA?.sceneMetadata?.[sceneId] || null;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCurrentSceneId() {
    return this.currentSceneId;
  }

  getSceneHistory() {
    return [...this.sceneHistory];
  }

  canGoBack() {
    return this.sceneHistory.length > 0;
  }

  goBack() {
    if (this.canGoBack()) {
      const previousScene = this.sceneHistory.pop();
      return this.transitionToScene(previousScene, 'slide');
    }
  }
}

window.sceneManager = new SceneTransitionManager();
    `.trim();
  }

  /**
   * Generate scene ID from scene name
   */
  private generateSceneId(sceneName: string): string {
    return `scene-${sceneName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  /**
   * Determine scene type based on content
   */
  private determineSceneType(scene: any): SceneMetadata['type'] {
    if (!scene.instructions || scene.instructions.length === 0) {
      return 'custom';
    }
    
    if (scene.name.toLowerCase().includes('intro') || 
        scene.name.toLowerCase().includes('start') ||
        scene.name.toLowerCase().includes('beginning')) {
      return 'intro';
    }
    
    if (scene.name.toLowerCase().includes('end') || 
        scene.name.toLowerCase().includes('finish') ||
        scene.name.toLowerCase().includes('conclusion')) {
      return 'ending';
    }
    
    if (this.sceneHasChoices(scene)) {
      return 'choice';
    }
    
    const hasOnlyActions = scene.instructions.every((inst: any) => inst.type === 'action');
    if (hasOnlyActions) {
      return 'action';
    }
    
    return 'dialogue';
  }

  /**
   * Check if scene has choices
   */
  private sceneHasChoices(scene: any): boolean {
    if (!scene.instructions) return false;
    
    return scene.instructions.some((inst: any) => {
      if (inst.choices && inst.choices.length > 0) return true;
      if (inst.type === 'conditional') {
        return (inst.then && inst.then.some((subInst: any) => subInst.choices)) ||
               (inst.else && inst.else.some((subInst: any) => subInst.choices));
      }
      return false;
    });
  }

  /**
   * Check if scene has input helpers
   */
  private sceneHasInputHelpers(scene: any): boolean {
    if (!scene.instructions) return false;
    
    const hasInputPattern = (text: string): boolean => {
      return /\{\{input:[^}]+\}\}/.test(text);
    };
    
    return scene.instructions.some((inst: any) => {
      if (inst.text && hasInputPattern(inst.text)) return true;
      if (inst.speaker && hasInputPattern(inst.speaker)) return true;
      if (inst.choices) {
        return inst.choices.some((choice: any) => choice.text && hasInputPattern(choice.text));
      }
      return false;
    });
  }

  /**
   * Extract asset references from scene
   */
  private extractSceneAssets(scene: any): string[] {
    const assets = new Set<string>();
    
    if (!scene.instructions) return [];
    
    const extractFromText = (text: string) => {
      const assetMatches = text.match(/\{\{(showImage|playAudio|playVideo)\s+['"']([^'"]+)['"']/g);
      if (assetMatches) {
        assetMatches.forEach(match => {
          const assetMatch = match.match(/['"']([^'"]+)['"']/);
          if (assetMatch) {
            assets.add(assetMatch[1]);
          }
        });
      }
    };
    
    scene.instructions.forEach((inst: any) => {
      if (inst.text) extractFromText(inst.text);
      if (inst.speaker) extractFromText(inst.speaker);
      if (inst.choices) {
        inst.choices.forEach((choice: any) => {
          if (choice.text) extractFromText(choice.text);
        });
      }
    });
    
    return Array.from(assets);
  }

  /**
   * Extract variable references from scene
   */
  private extractSceneVariables(scene: any): string[] {
    const variables = new Set<string>();
    
    if (!scene.instructions) return [];
    
    const extractFromText = (text: string) => {
      const varMatches = text.match(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g);
      if (varMatches) {
        varMatches.forEach(match => {
          const varName = match.slice(2, -2).trim();
          if (!varName.includes('(') && !varName.includes(' ') && !varName.startsWith('computed.')) {
            variables.add(varName);
          }
        });
      }
    };
    
    const extractFromActions = (actions: any[]) => {
      actions.forEach(action => {
        if (action.type === 'setVar' || action.type === 'addVar') {
          variables.add(action.key);
        }
      });
    };
    
    scene.instructions.forEach((inst: any) => {
      if (inst.text) extractFromText(inst.text);
      if (inst.speaker) extractFromText(inst.speaker);
      if (inst.actions) extractFromActions(inst.actions);
      if (inst.choices) {
        inst.choices.forEach((choice: any) => {
          if (choice.text) extractFromText(choice.text);
          if (choice.actions) extractFromActions(choice.actions);
        });
      }
    });
    
    return Array.from(variables);
  }

  /**
   * Extract flag references from scene
   */
  private extractSceneFlags(scene: any): string[] {
    const flags = new Set<string>();
    
    if (!scene.instructions) return [];
    
    const extractFromText = (text: string) => {
      const flagMatches = text.match(/hasFlag\s*\(\s*['"']([^'"]+)['"']\s*\)/g);
      if (flagMatches) {
        flagMatches.forEach(match => {
          const flagMatch = match.match(/['"']([^'"]+)['"']/);
          if (flagMatch) {
            flags.add(flagMatch[1]);
          }
        });
      }
    };
    
    const extractFromActions = (actions: any[]) => {
      actions.forEach(action => {
        if (action.type === 'setFlag' || action.type === 'clearFlag') {
          flags.add(action.flag);
        }
      });
    };
    
    scene.instructions.forEach((inst: any) => {
      if (inst.text) extractFromText(inst.text);
      if (inst.condition) extractFromText(inst.condition);
      if (inst.actions) extractFromActions(inst.actions);
      if (inst.choices) {
        inst.choices.forEach((choice: any) => {
          if (choice.text) extractFromText(choice.text);
          if (choice.condition) extractFromText(choice.condition);
          if (choice.actions) extractFromActions(choice.actions);
        });
      }
    });
    
    return Array.from(flags);
  }

  /**
   * Create basic scene container without metadata
   */
  private createBasicSceneContainer(sceneId: string): string {
    return `
<div class="vn-scene" 
     data-scene-id="${sceneId}" 
     data-scene-index="0" 
     data-scene-type="custom">
  <!-- Scene content will be inserted here -->
</div>
    `.trim();
  }

  /**
   * Create scene container with full metadata
   */
  private createSceneContainerWithMetadata(metadata: SceneMetadata): string {
    return `
<div class="vn-scene" 
     id="${metadata.id}"
     data-scene-id="${metadata.name}" 
     data-scene-index="${metadata.index}" 
     data-scene-type="${metadata.type}"
     data-has-choices="${metadata.hasChoices}"
     data-has-inputs="${metadata.hasInputHelpers}"
     data-instruction-count="${metadata.instructionCount}"
     data-asset-count="${metadata.assets.length}"
     data-variable-count="${metadata.variables.length}"
     data-flag-count="${metadata.flags.length}"
     data-created="${metadata.timestamp}">
  
  <!-- Scene Header (optional) -->
  <div class="vn-scene-header" style="display: none;">
    <div class="vn-scene-title">${this.escapeHTML(metadata.name)}</div>
    <div class="vn-scene-metadata">
      Type: ${metadata.type} | 
      Instructions: ${metadata.instructionCount} |
      ${metadata.hasChoices ? 'Has Choices' : 'No Choices'} |
      ${metadata.hasInputHelpers ? 'Has Inputs' : 'No Inputs'}
    </div>
  </div>
  
  <!-- Scene Content -->
  <div class="vn-scene-content">
    <!-- Content will be inserted here by VN Engine -->
  </div>
  
  <!-- Scene Assets (preload hints) -->
  ${metadata.assets.length > 0 ? `
  <div class="vn-scene-assets" style="display: none;">
    ${metadata.assets.map(asset => 
      `<link rel="preload" as="image" href="#asset-${asset}">`
    ).join('\n    ')}
  </div>
  ` : ''}
  
</div>
    `.trim();
  }

  /**
   * Get scene metadata for runtime
   */
  getSceneMetadataForRuntime(): Record<string, SceneMetadata> {
    const metadata: Record<string, SceneMetadata> = {};
    
    for (const [sceneName, meta] of this.sceneMetadata) {
      metadata[sceneName] = meta;
    }
    
    return metadata;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
