/**
 * DOM Observer Manager 
 * Provides centralized MutationObserver for component mounting
 */
class DOMObserverManager {
  constructor() {
    this.globalObserver = null;
    this.pendingMounts = new Map(); // elementId -> callback array
    this.isInitialized = false;
  }
  
  /**
   * Initialize the global MutationObserver
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }
    
    this.globalObserver = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });
    
    // Observe the document body for changes
    this.globalObserver.observe(document.body, {
      childList: true,        // Watch for added/removed nodes
      subtree: true           // Watch all descendants
    });
    
    this.isInitialized = true;
  }
  
  /**
   * Handle DOM mutations
   */
  handleMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Handle added nodes
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.ELEMENT_NODE) {
            this.handleElementAdded(addedNode);
          }
        }
      }
    }
  }
  
  /**
   * Handle newly added DOM elements
   */
  handleElementAdded(element) {
    // Check if this element matches pending mounts
    this.checkPendingMounts(element);
    
    // Check all child elements recursively
    const childElements = element.querySelectorAll('*');
    for (const childElement of childElements) {
      this.checkPendingMounts(childElement);
    }
  }
  
  /**
   * Check if any pending mounts can be resolved
   */
  checkPendingMounts(element) {
    // Check by ID
    if (element.id && this.pendingMounts.has(element.id)) {
      const callbacks = this.pendingMounts.get(element.id);
      for (const callback of callbacks) {
        try {
          callback(element);
        } catch (error) {
          console.error('🔭 Error in pending mount callback:', error);
        }
      }
      this.pendingMounts.delete(element.id);
    }
    
    // Check by class names
    for (const className of element.classList) {
      const classKey = `class:${className}`;
      if (this.pendingMounts.has(classKey)) {
        const callbacks = this.pendingMounts.get(classKey);
        for (const callback of callbacks) {
          try {
            callback(element);
          } catch (error) {
            console.error('🔭 Error in pending mount callback:', error);
          }
        }
        this.pendingMounts.delete(classKey);
      }
    }
    
    // Check by component data attributes
    if (element.dataset.component) {
      const componentKey = `component:${element.dataset.component}`;
      if (this.pendingMounts.has(componentKey)) {
        const callbacks = this.pendingMounts.get(componentKey);
        for (const callback of callbacks) {
          try {
            callback(element);
          } catch (error) {
            console.error('🔭 Error in pending mount callback:', error);
          }
        }
        this.pendingMounts.delete(componentKey);
      }
    }
  }
  
  /**
   * Wait for an element by ID to appear
   */
  waitForElementById(elementId, callback, timeout = 10000) {
    // Check if element already exists
    const existingElement = document.getElementById(elementId);
    if (existingElement) {
      callback(existingElement);
      return;
    }
    
    // Add to pending mounts
    if (!this.pendingMounts.has(elementId)) {
      this.pendingMounts.set(elementId, []);
    }
    this.pendingMounts.get(elementId).push(callback);
    
    // Set timeout fallback
    setTimeout(() => {
      if (this.pendingMounts.has(elementId)) {
        const callbacks = this.pendingMounts.get(elementId);
        const callbackIndex = callbacks.indexOf(callback);
        if (callbackIndex > -1) {
          callbacks.splice(callbackIndex, 1);
          if (callbacks.length === 0) {
            this.pendingMounts.delete(elementId);
          }
          console.warn(`🔭 Element not found within timeout: ${elementId}`);
        }
      }
    }, timeout);
  }
  
  /**
   * Wait for an element by selector to appear
   */
  waitForElement(selector, callback, timeout = 10000) {
    // Check if element already exists
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      callback(existingElement);
      return;
    }
    
    // For simple selectors, use ID-based waiting
    if (selector.startsWith('#')) {
      const elementId = selector.substring(1);
      this.waitForElementById(elementId, callback, timeout);
      return;
    }
    
    // For class selectors
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      const classKey = `class:${className}`;
      
      if (!this.pendingMounts.has(classKey)) {
        this.pendingMounts.set(classKey, []);
      }
      this.pendingMounts.get(classKey).push(callback);
      
      setTimeout(() => {
        if (this.pendingMounts.has(classKey)) {
          const callbacks = this.pendingMounts.get(classKey);
          const callbackIndex = callbacks.indexOf(callback);
          if (callbackIndex > -1) {
            callbacks.splice(callbackIndex, 1);
            if (callbacks.length === 0) {
              this.pendingMounts.delete(classKey);
            }
            console.warn(`🔭 Element not found within timeout: ${selector}`);
          }
        }
      }, timeout);
      return;
    }
    
    // For complex selectors, fall back to periodic checking
    const checkInterval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(checkInterval);
        callback(element);
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      console.warn(`🔭 Element not found within timeout: ${selector}`);
    }, timeout);
  }
  
  /**
   * Get basic statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      pendingMounts: this.pendingMounts.size,
      hasGlobalObserver: !!this.globalObserver
    };
  }
  
  /**
   * Reset observer state
   */
  reset() {
    this.pendingMounts.clear();
    return this.getStats();
  }
  
  /**
   * Clean up the observer
   */
  destroy() {
    if (this.globalObserver) {
      this.globalObserver.disconnect();
      this.globalObserver = null;
    }
    
    this.pendingMounts.clear();
    this.isInitialized = false;
  }
}

// Create global instance
window.DOMObserverManager = DOMObserverManager;

// Auto-initialize if not in a module environment
if (typeof module === 'undefined') {
  window.domObserver = new DOMObserverManager();
}