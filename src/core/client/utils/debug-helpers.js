if (typeof window !== 'undefined' && (window.VN_DEBUG || window.location.hostname === 'localhost')) {
  
    window.vnDebug = {
      checkHelpers: () => {
        if (window.vnRuntime) {
          return window.vnRuntime.getGameInterface().getHelperStatus();
        }
        return { error: 'VN Runtime not initialized' };
      },
      
      testHelper: (helperName) => {
        console.log(`🧪 Testing helper: ${helperName}`);
        
        if (window.vnEngine && window.vnEngine.registerHelper) {
          try {
            const testResult = window.vnEngine.registerHelper('__test__', () => 'test');
            console.log(`✅ Helper system is working: ${testResult}`);
          } catch (e) {
            console.log(`❌ Helper system error: ${e.message}`);
          }
        } else {
          console.log('❌ VN Engine helper system not available');
        }
      },
      
      listHelpers: () => {
        console.group('📋 Available Helper Functions');
        
        if (window.vnEngine && window.vnEngine.getTemplateCapabilities) {
          const capabilities = window.vnEngine.getTemplateCapabilities();
          console.log('Template capabilities:', capabilities);
        } else {
          console.log('❌ VN Engine template system not available');
        }
        
        console.groupEnd();
      },
      
      getGameState: () => {
        if (window.vnEngine) {
          return {
            currentScene: window.vnEngine.getCurrentScene(),
            gameState: window.vnEngine.getGameState(),
            choiceHistory: window.vnEngine.getChoiceHistory(),
            sceneHistory: window.vnRuntime?.sceneManager?.getSceneHistory() || []
          };
        }
        return { error: 'VN Engine not available' };
      },
      
      inspectElement: (selector) => {
        const element = document.querySelector(selector);
        if (!element) return { error: 'Element not found' };
        
        return {
          id: element.id,
          classes: Array.from(element.classList),
          dataAttributes: Object.fromEntries(
            Array.from(element.attributes)
              .filter(attr => attr.name.startsWith('data-'))
              .map(attr => [attr.name, attr.value])
          ),
          vnData: {
            hasVarBinding: !!element.getAttribute('data-var'),
            varName: element.getAttribute('data-var'),
            helperType: element.getAttribute('data-helper-type'),
            sceneId: element.getAttribute('data-scene-id')
          }
        };
      },
      
      forceSave: () => {
        if (window.vnGame && window.vnGame.save) {
          window.vnGame.save();
          return 'Game saved';
        }
        return { error: 'Save function not available' };
      },
      
      simulateChoice: (choiceIndex) => {
        if (window.vnGame && window.vnGame.makeChoice) {
          return window.vnGame.makeChoice(choiceIndex);
        }
        return { error: 'Choice function not available' };
      },
      
      goToScene: (sceneName) => {
        if (window.vnGame && window.vnGame.goToScene) {
          return window.vnGame.goToScene(sceneName);
        }
        return { error: 'GoToScene function not available' };
      },
      
      getPerformanceInfo: () => {
        return {
          loadTime: performance.now(),
          memory: performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
          } : 'Not available',
          timing: performance.getEntriesByType('navigation')[0]
        };
      },
      
      logSystemInfo: () => {
        console.group('🔍 VN System Information');
        console.log('VN Engine:', !!window.vnEngine);
        console.log('VN Runtime:', !!window.vnRuntime);
        console.log('VN Game Interface:', !!window.vnGame);
        console.log('Template Manager:', !!window.vnEngine?.templateManager);
        console.log('Handlebars:', !!window.vnEngine?.templateManager?.handlebars);
        console.log('Assets:', window.VN_RUNTIME_DATA?.assets ? 'Loaded' : 'Not loaded');
        console.log('Debug Mode:', !!window.VN_DEBUG);
        console.log('Performance:', window.vnDebug.getPerformanceInfo());
        console.groupEnd();
      }
    };
    
    console.log('🐛 VN Debug helpers loaded');
    console.log('💡 Available commands: vnDebug.checkHelpers(), vnDebug.listHelpers(), vnDebug.getGameState(), vnDebug.logSystemInfo()');
    
    window.addEventListener('load', () => {
      if (window.VN_DEBUG) {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'vn-debug-panel';
        debugPanel.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          width: 200px;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 10px;
          border-radius: 5px;
          font-size: 11px;
          font-family: monospace;
          z-index: 10000;
          opacity: 0.8;
          transition: opacity 0.3s;
        `;
        
        debugPanel.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 5px;">🔧 VN Debug</div>
          <div>Helpers: <span id="debug-helper-count">Loading...</span></div>
          <div>Scene: <span id="debug-current-scene">Loading...</span></div>
          <div>Variables: <span id="debug-var-count">0</span></div>
          <button onclick="window.vnDebug.logSystemInfo()" style="margin-top: 5px; padding: 2px 5px; font-size: 10px;">Log Info</button>
        `;
        
        document.body.appendChild(debugPanel);
        
        setInterval(() => {
          try {
            const helperStatus = window.vnDebug.checkHelpers();
            const gameState = window.vnDebug.getGameState();
            
            document.getElementById('debug-helper-count').textContent = 
              helperStatus.helperCount || '0';
            document.getElementById('debug-current-scene').textContent = 
              gameState.currentScene || 'None';
            document.getElementById('debug-var-count').textContent = 
              Object.keys(gameState.gameState?.variables || {}).length;
          } catch (e) {
          }
        }, 1000);
        
        debugPanel.addEventListener('mouseenter', () => {
          debugPanel.style.opacity = '1';
        });
        debugPanel.addEventListener('mouseleave', () => {
          debugPanel.style.opacity = '0.8';
        });
      }
    });
  }
