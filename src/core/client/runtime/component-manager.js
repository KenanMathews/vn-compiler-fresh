class ComponentManager {
  constructor(vnEngine = null) {
    this.componentConfigs = new Map();
    this.mountedComponents = new Map();
    this.componentClasses = new Map();
    this.sceneComponents = new Map();
    this.componentStates = new Map();
    this.vnEngine = vnEngine;
    this.currentScene = null;
  }

  setVNEngine(engine) {
    this.vnEngine = engine;
  }

  registerComponentHelpers() {
    if (!this.vnEngine) return;
    
    this.vnEngine.registerHelper('component', (...args) => {
      const [action, ...params] = args;
      
      switch (action) {
        case 'create':
          return this.createComponentHelper(...params);
        case 'mount':
          return this.mountComponentAction(params);
        case 'unmount':
          return this.unmountComponentAction(params);
        case 'update':
          return this.updateComponentAction(params);
        case 'show':
          return this.showComponentAction(params);
        case 'hide':
          return this.hideComponentAction(params);
        default:
          console.warn('Unknown component action:', action);
          return '';
      }
    });
  }

  createComponentHelper(componentName, scriptPath, cssPath, instanceId, configStr) {
    // Resolve handlebars templates in config string using VN engine
    let resolvedConfigStr = configStr || '';
    if (configStr && this.vnEngine && this.vnEngine.parseTemplate) {
      try {
        resolvedConfigStr = this.vnEngine.parseTemplate(configStr);
      } catch (error) {
        console.warn(`Component [${componentName}] template resolution failed:`, error);
        resolvedConfigStr = configStr;
      }
    }
    
    const config = this.parseConfigString(resolvedConfigStr);
    const lifecycle = config.persistent ? 'persistent' : 'scene';
    const targetContainer = lifecycle === 'persistent' ? 'vn-persistent-components' : 'vn-scene-components';
    
    const componentId = `${componentName}-${instanceId}`;
    const enhancedConfig = {
      ...config,
      lifecycle,
      targetContainer
    };
    
    const componentConfig = {
      id: componentId,
      componentName,
      scriptPath,
      cssPath,
      instanceId,
      containerId: targetContainer,
      sceneId: lifecycle === 'persistent' ? null : this.currentScene,
      config: enhancedConfig
    };
    
    this.componentConfigs.set(componentId, componentConfig);
    
    if (lifecycle === 'scene' && this.currentScene) {
      if (!this.sceneComponents.has(this.currentScene)) {
        this.sceneComponents.set(this.currentScene, new Set());
      }
      this.sceneComponents.get(this.currentScene).add(componentId);
    }
    
    this.scheduleComponentMount(componentId);
    return '';
  }

  async mountComponent(componentId) {
    if (this.isMounted(componentId)) {
      return false;
    }
    
    const componentConfig = this.componentConfigs.get(componentId);
    if (!componentConfig) {
      return false;
    }
    
    try {
      await this.loadComponentAssets(componentId);
      
      const ComponentClass = this.componentClasses.get(componentConfig.componentName);
      if (!ComponentClass) {
        return false;
      }
      
      const component = new ComponentClass(this.vnEngine, componentConfig.config);
      
      const sharedContainer = document.getElementById(componentConfig.containerId);
      if (!sharedContainer) {
        return false;
      }
      
      const componentWrapper = document.createElement('div');
      componentWrapper.id = `component-${componentId}`;
      sharedContainer.appendChild(componentWrapper);
      
      await component.mount(componentWrapper);
      this.mountedComponents.set(componentId, component);
      
      // Store component state for serialization
      this.updateComponentState(componentId, component);
      
      return true;
    } catch (error) {
      console.error('Failed to mount component:', componentId, error);
      return false;
    }
  }

  async unmountComponent(componentId) {
    const component = this.mountedComponents.get(componentId);
    if (!component) {
      return;
    }
    
    try {
      if (component.unmount) {
        await component.unmount();
      }
      
      const componentWrapper = document.getElementById(`component-${componentId}`);
      if (componentWrapper) {
        componentWrapper.remove();
      }
      
      this.mountedComponents.delete(componentId);
      this.componentStates.delete(componentId);
    } catch (error) {
      console.error('Error unmounting component:', componentId, error);
    }
  }

  async updateComponent(componentId, newConfig) {
    const component = this.mountedComponents.get(componentId);
    if (!component) return;
    
    try {
      if (component.update) {
        await component.update(newConfig);
      }
      
      // Update stored state after component update
      this.updateComponentState(componentId, component);
    } catch (error) {
      console.error('Failed to update component:', componentId, error);
    }
  }

  /**
   * Update stored component state for serialization
   */
  updateComponentState(componentId, component) {
    if (!component) return;
    
    const state = {
      visible: this.isComponentVisible(componentId),
      data: null
    };
    
    // Try to get component's internal state if it provides a getState method
    if (typeof component.getState === 'function') {
      try {
        state.data = component.getState();
      } catch (error) {
        console.warn(`Component ${componentId} getState() failed:`, error);
      }
    }
    
    this.componentStates.set(componentId, state);
  }

  /**
   * Check if component is visible
   */
  isComponentVisible(componentId) {
    const componentWrapper = document.getElementById(`component-${componentId}`);
    return componentWrapper ? componentWrapper.style.display !== 'none' : false;
  }

  async handleSceneChange(sceneData, previousSceneId) {
    let newSceneId, prevSceneId;
    
    if (typeof sceneData === 'object' && sceneData !== null) {
      newSceneId = sceneData.newScene;
      prevSceneId = sceneData.previousScene;
    } else {
      newSceneId = sceneData;
      prevSceneId = previousSceneId;
    }
    
    if (newSceneId === this.currentScene) {
      return;
    }
    
    if (prevSceneId) {
      await this.destroySceneComponents(prevSceneId);
    }
    
    this.currentScene = newSceneId;
    await this.notifyPersistentComponents(newSceneId, prevSceneId);
  }

  async destroySceneComponents(sceneId) {
    const sceneComponents = this.sceneComponents.get(sceneId) || new Set();
    
    if (sceneComponents.size === 0) {
      return;
    }
    
    for (const componentId of sceneComponents) {
      const componentConfig = this.componentConfigs.get(componentId);
      
      if (componentConfig && componentConfig.config && componentConfig.config.lifecycle === 'scene') {
        await this.unmountComponent(componentId);
        this.componentConfigs.delete(componentId);
      }
    }
    
    this.sceneComponents.delete(sceneId);
  }

  async notifyPersistentComponents(newSceneId, previousSceneId) {
    for (const [componentId, component] of this.mountedComponents) {
      const config = this.componentConfigs.get(componentId);
      
      if (config && config.config && config.config.lifecycle === 'persistent' && component.onSceneChange) {
        try {
          await component.onSceneChange(newSceneId, previousSceneId);
          // Update component state after scene change
          this.updateComponentState(componentId, component);
        } catch (error) {
          console.error('Persistent component scene change error:', componentId, error);
        }
      }
    }
  }

  scheduleComponentMount(componentId) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.mountComponent(componentId);
      });
    } else {
      setTimeout(() => this.mountComponent(componentId), 0);
    }
  }

  loadComponentAssets(componentId) {
    const config = this.componentConfigs.get(componentId);
    if (!config) return;
    
    if (!this.componentClasses.has(config.componentName)) {
      // Component classes are embedded in the bundle, check if available globally
      const ComponentClass = window[config.componentName];
      if (ComponentClass) {
        this.componentClasses.set(config.componentName, ComponentClass);
      } else {
        throw new Error(`Component class '${config.componentName}' not found in global scope`);
      }
    }
    
    if (config.cssPath && !document.querySelector(`link[href="${config.cssPath}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = config.cssPath;
      document.head.appendChild(link);
    }
  }

  parseConfigString(configStr) {
    if (!configStr) return {};
    
    const config = {};
    const pairs = configStr.split(',');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value !== undefined) {
        config[key] = value === 'true' ? true : value === 'false' ? false : value;
      }
    }
    
    return config;
  }

  /**
   * Serialize component manager state for saving
   */
  serializeState() {
    const serializedState = {
      version: '1.0.0',
      currentScene: this.currentScene,
      componentConfigs: {},
      componentStates: {},
      sceneComponents: {},
      mountedComponentIds: []
    };
    
    // Serialize component configurations
    for (const [componentId, config] of this.componentConfigs) {
      serializedState.componentConfigs[componentId] = {
        ...config,
        // Don't serialize the actual DOM references, just the data
        config: { ...config.config }
      };
    }
    
    // Serialize component states
    for (const [componentId, state] of this.componentStates) {
      serializedState.componentStates[componentId] = { ...state };
    }
    
    // Serialize scene-component mappings
    for (const [sceneId, componentSet] of this.sceneComponents) {
      serializedState.sceneComponents[sceneId] = Array.from(componentSet);
    }
    
    // Store which components are currently mounted
    serializedState.mountedComponentIds = Array.from(this.mountedComponents.keys());
    
    return serializedState;
  }

  /**
   * Deserialize component manager state from save data
   */
  async deserializeState(serializedState) {
    if (!serializedState || serializedState.version !== '1.0.0') {
      console.warn('⚠️ ComponentManager: Invalid or incompatible serialized state');
      return;
    }
        
    // Clear current state
    await this.clearAll();
    
    // Restore basic properties
    this.currentScene = serializedState.currentScene;
    
    // Restore component configurations
    for (const [componentId, config] of Object.entries(serializedState.componentConfigs)) {
      this.componentConfigs.set(componentId, config);
    }
    
    // Restore scene-component mappings
    for (const [sceneId, componentIds] of Object.entries(serializedState.sceneComponents)) {
      this.sceneComponents.set(sceneId, new Set(componentIds));
    }
    
    // Restore component states
    for (const [componentId, state] of Object.entries(serializedState.componentStates)) {
      this.componentStates.set(componentId, state);
    }
    
    // Remount components that were mounted when saved
    for (const componentId of serializedState.mountedComponentIds) {
      try {
        const success = await this.mountComponent(componentId);
        if (success) {
          // Restore component state if available
          const savedState = this.componentStates.get(componentId);
          if (savedState) {
            await this.restoreComponentState(componentId, savedState);
          }
        }
      } catch (error) {
        console.error(`Failed to restore component ${componentId}:`, error);
      }
    }
    
    console.log('✅ ComponentManager: State restoration complete');
  }

  /**
   * Restore individual component state
   */
  async restoreComponentState(componentId, savedState) {
    const component = this.mountedComponents.get(componentId);
    if (!component) return;
    
    try {
      // Restore visibility
      if (savedState.visible !== undefined) {
        if (savedState.visible) {
          this.showComponent(componentId);
        } else {
          this.hideComponent(componentId);
        }
      }
      
      // Restore component data if component supports setState
      if (savedState.data && typeof component.setState === 'function') {
        await component.setState(savedState.data);
      }
      
    } catch (error) {
      console.error(`Failed to restore state for component ${componentId}:`, error);
    }
  }

  isMounted(componentId) {
    return this.mountedComponents.has(componentId);
  }

  getComponent(componentId) {
    return this.mountedComponents.get(componentId);
  }

  getSceneComponents(sceneId) {
    const componentIds = this.sceneComponents.get(sceneId) || new Set();
    return Array.from(componentIds).map(id => this.mountedComponents.get(id)).filter(Boolean);
  }

  getAllComponents() {
    return Array.from(this.mountedComponents.values());
  }

  async clearAll() {
    for (const componentId of this.mountedComponents.keys()) {
      await this.unmountComponent(componentId);
    }
    
    this.componentConfigs.clear();
    this.sceneComponents.clear();
    this.componentStates.clear();
  }

  getStatus() {
    return {
      totalComponents: this.componentConfigs.size,
      mountedComponents: this.mountedComponents.size,
      sceneCount: this.sceneComponents.size,
      currentScene: this.currentScene
    };
  }

  mountComponentAction(params) {
    const [componentId] = params;
    if (componentId) {
      this.mountComponent(componentId);
    }
    return '';
  }

  unmountComponentAction(params) {
    const [componentId] = params;
    if (componentId) {
      this.unmountComponent(componentId);
    }
    return '';
  }

  updateComponentAction(params) {
    const [componentId, configStr] = params;
    if (componentId && configStr) {
      // Resolve handlebars templates in config string using VN engine
      let resolvedConfigStr = configStr;
      if (this.vnEngine && this.vnEngine.parseTemplate) {
        try {
          resolvedConfigStr = this.vnEngine.parseTemplate(configStr);
        } catch (error) {
          console.warn(`Component [${componentId}] update template resolution failed:`, error);
          resolvedConfigStr = configStr;
        }
      }
      
      const config = this.parseConfigString(resolvedConfigStr);
      this.updateComponent(componentId, config);
    }
    return '';
  }

  showComponentAction(params) {
    const [componentId] = params;
    if (componentId) {
      this.showComponent(componentId);
    }
    return '';
  }

  hideComponentAction(params) {
    const [componentId] = params;
    if (componentId) {
      this.hideComponent(componentId);
    }
    return '';
  }

  showComponent(componentId) {
    const componentWrapper = document.getElementById(`component-${componentId}`);
    if (componentWrapper) {
      componentWrapper.style.display = '';
      
      // Update stored state
      const state = this.componentStates.get(componentId) || {};
      state.visible = true;
      this.componentStates.set(componentId, state);
    }
  }

  hideComponent(componentId) {
    const componentWrapper = document.getElementById(`component-${componentId}`);
    if (componentWrapper) {
      componentWrapper.style.display = 'none';
      
      // Update stored state
      const state = this.componentStates.get(componentId) || {};
      state.visible = false;
      this.componentStates.set(componentId, state);
    }
  }
}

if (typeof window !== 'undefined') {
  window.ComponentManager = ComponentManager;
}