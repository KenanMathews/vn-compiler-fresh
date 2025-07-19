/**
 * Game Initialization
 */
document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.log('🎮 Starting VN Game initialization...');
    
    // Initialize DOM observer if available
    if (window.domObserver) {
      window.domObserver.initialize();
    }
    
    // Create and initialize runtime
    const runtime = new VNCompilerRuntime();
    await runtime.initialize(); // All initialization is now handled internally
    
    // Setup debug helpers if in debug mode
    if (window.VN_DEBUG) {
      setupDebugHelpers(runtime);
    }
    
    // Dispatch game ready event
    window.dispatchEvent(new CustomEvent('vn-game-ready', { 
      detail: { 
        runtime,
        gameData: window.VN_RUNTIME_DATA,
        timestamp: Date.now()
      } 
    }));
    
    console.log('🎉 VN Game initialization complete!');
    
  } catch (error) {
    console.error('❌ Failed to initialize VN Game:', error);
    showInitializationError(error);
  }
});

/**
 * Setup debug helpers for development
 */
function setupDebugHelpers(runtime) {
  window.vnDebug = {
    // Runtime info
    runtime: () => runtime,
    info: () => runtime.getDebugInfo(),
    
    // Game state
    state: () => console.table(runtime.vnEngine.getGameState()),
    vars: () => console.table(runtime.vnEngine.getGameState().variables),
    scene: () => runtime.currentScene,
    
    // Save system
    saves: () => console.table(runtime.saveManager.getStats()),
    testSave: () => runtime.saveManager.saveGame(99),
    testLoad: () => runtime.saveManager.loadGame(99),
    
    // Managers
    managers: () => {
      const managers = {};
      ['assetManager', 'contentManager', 'saveManager', 'menuManager', 'uiManager', 'inputManager', 'componentManager'].forEach(name => {
        managers[name] = !!runtime[name];
      });
      console.table(managers);
    },
    
    // Content
    content: () => runtime.contentManager.getEntryCount(),
    clearContent: () => runtime.contentManager.clearContent(),
    
    // Components
    components: () => {
      if (runtime.componentManager) {
        console.table(runtime.componentManager.getStatus());
      } else {
        console.log('Component manager not available');
      }
    },
    
    // Helpers
    helpers: () => {
      if (runtime.vnEngine.getRegisteredHelpers) {
        console.table(runtime.vnEngine.getRegisteredHelpers());
      } else {
        console.log('VN Engine helpers not available');
      }
    }
  };
  
  console.log('🐛 Debug helpers loaded: window.vnDebug');
  console.log('🔧 Try: vnDebug.info(), vnDebug.state(), vnDebug.saves()');
}

/**
 * Show initialization error
 */
function showInitializationError(error) {
  const errorContainer = document.getElementById('vn-error');
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="error-message">
        <h2>Game Loading Error</h2>
        <p>Sorry, there was a problem loading the game.</p>
        <details>
          <summary>Technical Details</summary>
          <pre>${error.message}</pre>
          <p>Check browser console for more details.</p>
          ${window.VN_DEBUG ? `
          <p><strong>Debug Info:</strong></p>
          <ul>
            <li>VN Engine: ${typeof window.createVNEngine !== 'undefined' ? 'Loaded' : 'Not loaded'}</li>
            <li>Runtime Data: ${typeof window.VN_RUNTIME_DATA !== 'undefined' ? 'Available' : 'Missing'}</li>
            <li>Managers: ${typeof window.ContentManager !== 'undefined' ? 'Available' : 'Missing'}</li>
            <li>Debug Mode: ${window.VN_DEBUG ? 'Enabled' : 'Disabled'}</li>
          </ul>
          ` : ''}
        </details>
        <button onclick="location.reload()" class="error-retry">
          Retry
        </button>
      </div>
    `;
    errorContainer.style.display = 'flex';
  }
  
  const loadingEl = document.getElementById('vn-loading');
  if (loadingEl) loadingEl.style.display = 'none';
}

/**
 * Game ready event handler
 */
window.addEventListener('vn-game-ready', function(event) {
  const { runtime } = event.detail;
  
  // Test runtime functionality if in debug mode
  if (window.VN_DEBUG) {
    console.group('🧪 Runtime Verification');
    
    try {
      console.log('✅ Runtime initialized:', runtime.initialized);
      console.log('✅ VN Engine available:', !!runtime.vnEngine);
      console.log('✅ Managers connected:', Object.keys(runtime.getDebugInfo().managers).length);
      console.log('✅ Global API exposed:', !!window.vn);
      console.log('✅ Save system ready:', !!runtime.saveManager);
      
      if (runtime.vnEngine?.templateManager?.handlebars) {
        const helperCount = Object.keys(runtime.vnEngine.templateManager.handlebars.helpers).length;
        console.log(`✅ Template helpers available: ${helperCount}`);
      }
      
    } catch (error) {
      console.error('❌ Runtime verification failed:', error);
    }
    
    console.groupEnd();
  }
  
  console.log('🎮 Game is ready for interaction!');
});

/**
 * Accessibility helpers
 */
window.addEventListener('load', function() {
  // Create live region for screen readers
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'false');
  liveRegion.id = 'vn-live-region';
  liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
  document.body.appendChild(liveRegion);
});

/**
 * Additional keyboard shortcuts for accessibility
 */
document.addEventListener('keydown', function(e) {
  // Focus on content area
  if (e.altKey && e.key === 'f') {
    const contentContainer = document.getElementById('vn-scene-content');
    if (contentContainer) {
      contentContainer.focus();
      contentContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  // Focus on last dialogue entry
  if (e.altKey && e.key === 'l') {
    const lastEntry = document.querySelector('.vn-story-content:last-child');
    if (lastEntry) {
      lastEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
      lastEntry.focus();
    }
  }
});

/**
 * Performance monitoring (debug mode only)
 */
if (window.VN_DEBUG) {
  window.addEventListener('vn-game-ready', function() {
    // Monitor performance
    const startTime = performance.now();
    
    setTimeout(() => {
      const initTime = performance.now() - startTime;
      console.log(`📊 Game initialization took ${initTime.toFixed(2)}ms`);
      
      if (window.vnRuntime) {
        console.log('📊 Debug info:', window.vnRuntime.getDebugInfo());
      }
    }, 100);
  });
}