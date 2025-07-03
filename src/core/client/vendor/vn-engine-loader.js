console.log('📦 VN Engine import configured for browser context');

let createVNEngine;

(async () => {
  try {
    console.log('🔄 Loading VN Engine...');
    const vnEngineModule = await import('vn-engine');
    createVNEngine = vnEngineModule.createVNEngine;
    window.createVNEngine = createVNEngine;
    
    console.log('✅ VN Engine loaded successfully');
    
    if (window.VN_RUNTIME_DATA?.config?.dev || window.location.hostname === 'localhost') {
      window.VN_DEBUG = true;
      console.log('🐛 Debug mode enabled');
    }
    
    window.dispatchEvent(new CustomEvent('vn-engine-ready', {
      detail: { 
        createVNEngine,
        timestamp: Date.now(),
        version: vnEngineModule.version || 'unknown'
      }
    }));
    
  } catch (error) {
    console.error('❌ Failed to load VN Engine:', error);
    
    const errorContainer = document.getElementById('vn-error');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="error-message">
          <h2>VN Engine Loading Error</h2>
          <p>Failed to load the VN Engine. This might be due to:</p>
          <ul>
            <li>Network connectivity issues</li>
            <li>CDN availability problems</li>
            <li>Browser compatibility</li>
          </ul>
          <details>
            <summary>Technical Details</summary>
            <pre>${error.message}</pre>
          </details>
        </div>
      `;
      errorContainer.style.display = 'block';
    }
    
    throw error;
  }
})();
