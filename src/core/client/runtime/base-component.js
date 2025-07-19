/**
 * Base VN Component Class
 */
class BaseVNComponent {
  constructor(vnEngine, config = {}) {
    this.vnEngine = vnEngine;
    this.config = config;
    this.mounted = false;
    this.container = null;
    this.eventListeners = new Map();
    
    // Bind core methods to preserve 'this' context
    this.mount = this.mount.bind(this);
    this.unmount = this.unmount.bind(this);
    this.update = this.update.bind(this);
  }
  
  /**
   * Mount the component to a DOM container
   */
  async mount(container) {
    if (this.mounted) {
      console.warn('⚠️ Component already mounted');
      return;
    }
    
    this.container = container;
    
    try {
      // Clear any existing content
      container.innerHTML = '';
      
      // Create component HTML
      const html = await this.render();
      container.innerHTML = html;
      
      // Attach event listeners
      this.attachEventListeners();
      
      // Run post-mount setup
      await this.onMount();
      
      this.mounted = true;
      
    } catch (error) {
      console.error(`❌ Failed to mount component: ${this.constructor.name}`, error);
      container.innerHTML = `<div class="vn-component-error">Error: ${error.message}</div>`;
      throw error;
    }
  }
  
  /**
   * Unmount the component
   */
  async unmount() {
    if (!this.mounted) {
      return;
    }
    
    try {
      // Run pre-unmount cleanup
      await this.onUnmount();
      
      // Remove event listeners
      this.removeEventListeners();
      
      // Clear container
      if (this.container) {
        this.container.innerHTML = '';
        this.container = null;
      }
      
      this.mounted = false;
      
    } catch (error) {
      console.error(`❌ Failed to unmount component: ${this.constructor.name}`, error);
      throw error;
    }
  }
  
  /**
   * Update component configuration
   */
  async update(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.mounted) {
      try {
        // Re-render with new config
        const html = await this.render();
        if (this.container) {
          this.container.innerHTML = html;
          this.attachEventListeners();
        }
        
        // Run post-update setup
        await this.onUpdate();
        
      } catch (error) {
        console.error(`❌ Failed to update component: ${this.constructor.name}`, error);
        throw error;
      }
    }
  }
  
  /**
   * Render component HTML - Override in subclasses
   */
  async render() {
    return `<div class="vn-component-base">Override render() method in ${this.constructor.name}</div>`;
  }
  
  /**
   * Post-mount lifecycle hook - Override in subclasses
   */
  async onMount() {
    // Override in subclasses
  }
  
  /**
   * Pre-unmount lifecycle hook - Override in subclasses
   */
  async onUnmount() {
    // Override in subclasses
  }
  
  /**
   * Post-update lifecycle hook - Override in subclasses
   */
  async onUpdate() {
    // Override in subclasses
  }
  
  /**
   * Scene change handler - Override in subclasses
   */
  async onSceneChange(newSceneId, previousSceneId) {
    // Override in subclasses if needed
  }
  
  /**
   * Get game variable via VN Engine
   */
  getVariable(name) {
    return this.vnEngine?.getVariable?.(name);
  }
  
  /**
   * Set game variable via VN Engine
   */
  setVariable(name, value) {
    if (this.vnEngine?.setVariable) {
      this.vnEngine.setVariable(name, value);
    }
  }
  
  /**
   * Add event listener with automatic cleanup
   */
  addEventListener(element, event, handler) {
    if (typeof element === 'string') {
      element = this.container?.querySelector(element);
    }
    
    if (element) {
      element.addEventListener(event, handler);
      
      // Store for cleanup
      const listenerKey = `${element.tagName}-${event}-${Date.now()}`;
      this.eventListeners.set(listenerKey, { element, event, handler });
    }
  }
  
  /**
   * Attach event listeners - Override in subclasses
   */
  attachEventListeners() {
    // Override in subclasses
  }
  
  /**
   * Remove all event listeners
   */
  removeEventListeners() {
    for (const [key, { element, event, handler }] of this.eventListeners) {
      try {
        element.removeEventListener(event, handler);
      } catch (error) {
        console.warn(`⚠️ Failed to remove event listener: ${key}`, error);
      }
    }
    this.eventListeners.clear();
  }
  
  /**
   * Helper for HTML escaping
   */
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in components
window.BaseVNComponent = BaseVNComponent;