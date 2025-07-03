document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.log('🎮 Initializing VN Game (Vertical Feed)...');
    
    if (window.VN_DEBUG) {
      window.vnDebug = {
        checkHelpers: () => {
          if (window.vnRuntime) {
            return window.vnRuntime.getGameInterface().getHelperStatus();
          }
          return { error: 'VN Runtime not initialized' };
        },
        testHelper: (helperName, ...args) => {
          if (window.vnEngine && window.vnEngine.registerHelper) {
            console.log(`🔧 Testing helper: ${helperName}`, args);
            try {
              return window.vnEngine.callHelper(helperName, ...args);
            } catch (error) {
              console.error(`❌ Helper ${helperName} failed:`, error);
              return { error: error.message };
            }
          } else {
            return { error: 'VN Engine not available' };
          }
        },
        listHelpers: () => {
          if (window.vnEngine && window.vnEngine.registerHelper) {
            return window.vnEngine.getRegisteredHelpers();
          }
          return [];
        },
        getFeedState: () => {
          if (window.vnRuntime?.feedManager) {
            return {
              entryCount: window.vnRuntime.feedManager.getEntryCount(),
              autoScroll: window.vnRuntime.feedManager.autoScroll,
              hasPendingChoices: window.vnRuntime.feedManager.hasPendingChoices(),
              feedHTML: window.vnRuntime.feedManager.getFeedHTML().length
            };
          }
          return { error: 'Feed Manager not available' };
        },
        clearFeed: () => {
          if (window.vnRuntime?.feedManager) {
            window.vnRuntime.feedManager.clearFeed();
            return 'Feed cleared';
          }
          return { error: 'Feed Manager not available' };
        },
        scrollToBottom: () => {
          if (window.vnRuntime?.feedManager) {
            window.vnRuntime.feedManager.scrollToBottom(true);
            return 'Scrolled to bottom';
          }
          return { error: 'Feed Manager not available' };
        },
        addTestEntry: (type = 'dialogue') => {
          if (window.vnRuntime?.feedManager) {
            switch (type) {
              case 'dialogue':
                return window.vnRuntime.feedManager.addDialogueEntry(
                  'Test Speaker', 
                  'This is a test dialogue entry for debugging purposes.'
                );
              case 'choice':
                return window.vnRuntime.feedManager.addChoiceEntry(
                  'Test Choice', 
                  [{ text: 'Option 1' }, { text: 'Option 2' }]
                );
              case 'input':
                return window.vnRuntime.feedManager.addInputEntry(
                  'Test Input', 
                  { type: 'text', varName: 'testVar', placeholder: 'Enter text...' }
                );
              case 'separator':
                return window.vnRuntime.feedManager.addSceneSeparator('Test Scene');
              default:
                return { error: 'Unknown entry type' };
            }
          }
          return { error: 'Feed Manager not available' };
        }
      };
      
      console.log('🐛 Debug helpers available: window.vnDebug.checkHelpers()');
    }
    
    const runtime = new VNCompilerRuntime();
    await runtime.initialize(window.VN_RUNTIME_DATA);
    
    window.vnGame = runtime.getGameInterface();
    window.vnRuntime = runtime;
    
    const uiManager = new UIManager(runtime.getVNEngine());
    window.vnUI = uiManager;
    runtime.setUIManager(uiManager);
    
    window.vnFeed = runtime.getFeedManager();
    
    if (window.VN_DEBUG) {
      const helperStatus = window.vnGame.getHelperStatus();
      console.log('🔧 Helper Registration Status:', helperStatus);
      
      if (helperStatus.registered) {
        console.log('✅ All VN Engine helpers are available');
        console.log('💡 Try: vnDebug.listHelpers() to see all available helpers');
      } else {
        console.warn('⚠️ VN Engine helpers not registered - limited template functionality');
      }
    }
    
    await runtime.startGame();
        
    window.dispatchEvent(new CustomEvent('vn-game-ready', { 
      detail: { 
        runtime, 
        gameData: window.VN_RUNTIME_DATA,
        helpersRegistered: runtime.helpersRegistered,
        feedManager: runtime.getFeedManager(),
        uiManager: uiManager,
        timestamp: Date.now()
      } 
    }));
    
  } catch (error) {
    console.error('❌ Failed to initialize VN Game:', error);
    
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
              <li>Feed Manager: ${typeof window.FeedManager !== 'undefined' ? 'Available' : 'Missing'}</li>
              <li>Debug Mode: ${window.VN_DEBUG ? 'Enabled' : 'Disabled'}</li>
            </ul>
            ` : ''}
          </details>
          <button onclick="location.reload()" style="margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #00d4ff, #007bff); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
            Retry
          </button>
        </div>
      `;
      errorContainer.style.display = 'flex';
    }
    
    const loadingEl = document.getElementById('vn-loading');
    if (loadingEl) loadingEl.style.display = 'none';
  }
});

if (window.VN_DEBUG) {
  window.addEventListener('vn-game-ready', function(event) {
    console.log('🎉 Game ready event fired');
    
    setTimeout(() => {
      console.group('🧪 Testing VN Engine Helpers & Feed System');
      
      try {
        const arrayResult = window.vnDebug.testHelper('first', [1, 2, 3]);
        console.log('✅ Array helper (first):', arrayResult);
        
        const mathResult = window.vnDebug.testHelper('add', 5, 3);
        console.log('✅ Math helper (add):', mathResult);
        
        const stringResult = window.vnDebug.testHelper('uppercase', 'hello');
        console.log('✅ String helper (uppercase):', stringResult);
        
        const compResult = window.vnDebug.testHelper('eq', 5, 5);
        console.log('✅ Comparison helper (eq):', compResult);
        
        const inputResult = window.vnDebug.testHelper('input', 'testVar', 'Test Input', 'text');
        console.log('✅ Input helper (input):', inputResult ? 'HTML Generated' : 'Failed');
        
        console.log('📜 Testing Feed System:');
        const feedState = window.vnDebug.getFeedState();
        console.log('  - Feed State:', feedState);
        
        if (window.location.hostname === 'localhost' || window.location.search.includes('test=true')) {
          console.log('  - Adding test entries...');
          
          const dialogueId = window.vnDebug.addTestEntry('dialogue');
          console.log('  - Test dialogue added:', dialogueId);
          
          setTimeout(() => {
            const choiceId = window.vnDebug.addTestEntry('choice');
            console.log('  - Test choices added:', choiceId);
          }, 1000);
          
          setTimeout(() => {
            const inputId = window.vnDebug.addTestEntry('input');
            console.log('  - Test input added:', inputId);
          }, 2000);
          
          setTimeout(() => {
            const separatorId = window.vnDebug.addTestEntry('separator');
            console.log('  - Test separator added:', separatorId);
          }, 3000);
        }
        
        const helperCount = window.vnDebug.listHelpers().length;
        console.log(`📊 Total helpers available: ${helperCount}`);
        
        if (helperCount > 0) {
          console.log('✅ All helper tests completed successfully');
          console.log('💡 Feed system operational');
          console.log('🎮 Game ready for interaction');
        } else {
          console.warn('⚠️ No helpers found - check registration');
        }
        
      } catch (error) {
        console.error('❌ Helper/Feed tests failed:', error);
        
        console.group('🔍 Diagnostic Information');
        console.log('VN Engine:', !!window.vnEngine);
        console.log('Template Manager:', !!window.vnEngine?.templateManager);
        console.log('VN Runtime:', !!window.vnRuntime);
        console.log('Feed Manager:', !!window.vnFeed);
        console.log('UI Manager:', !!window.vnUI);
        console.log('Helpers Registered:', window.vnRuntime?.helpersRegistered);
        console.log('Feed Entries:', window.vnFeed?.getEntryCount() || 0);
        console.groupEnd();
      }
      
      console.groupEnd();
    }, 1000);
  });
}

if (window.VN_DEBUG) {
  let feedPerformanceStats = {
    entriesAdded: 0,
    scrollEvents: 0,
    choiceSelections: 0,
    startTime: Date.now()
  };
  
  window.addEventListener('vn-game-ready', function() {
    const originalAddEntry = window.vnFeed?.addDialogueEntry;
    if (originalAddEntry && window.vnFeed) {
      window.vnFeed.addDialogueEntry = function(...args) {
        feedPerformanceStats.entriesAdded++;
        return originalAddEntry.apply(this, args);
      };
    }
    
    const feedContainer = document.getElementById('vn-feed-container');
    if (feedContainer) {
      feedContainer.addEventListener('scroll', () => {
        feedPerformanceStats.scrollEvents++;
      });
    }
    
    window.vnDebug.getPerformanceStats = () => {
      const uptime = Date.now() - feedPerformanceStats.startTime;
      return {
        ...feedPerformanceStats,
        uptime: `${Math.round(uptime / 1000)}s`,
        entriesPerMinute: Math.round((feedPerformanceStats.entriesAdded / uptime) * 60000),
        scrollEventsPerMinute: Math.round((feedPerformanceStats.scrollEvents / uptime) * 60000)
      };
    };
    
    console.log('📈 Performance monitoring enabled. Use vnDebug.getPerformanceStats()');
  });
}

if (!window.VN_DEBUG) {
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('selectstart', e => {
    if (e.target.closest('.vn-feed')) {
      return true;
    }
    e.preventDefault();
  });
}

document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key === 'f') {
    const feedContainer = document.getElementById('vn-feed-container');
    if (feedContainer) {
      feedContainer.focus();
      feedContainer.scrollTo({ top: feedContainer.scrollHeight, behavior: 'smooth' });
    }
  }
  
  if (e.altKey && e.key === 'l') {
    const lastEntry = document.querySelector('.vn-feed-entry:last-child');
    if (lastEntry) {
      lastEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
      lastEntry.focus();
    }
  }
});

window.addEventListener('load', function() {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'false');
  liveRegion.id = 'vn-live-region';
  liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
  document.body.appendChild(liveRegion);
});

console.log('🎮 VN Game initialization script loaded');

console.log('🎭 Setting up template helpers...');
try {
  if (window.vnEngine && window.vnEngine.registerHelper) {
    const customHelpers = {
      currentScene: () => window.vnEngine.getCurrentScene(),
      getVariable: (name) => window.vnEngine.getVariable(name),
      hasFlag: (flag) => window.vnEngine.hasFlag(flag)
    };
    
    Object.entries(customHelpers).forEach(([name, fn]) => {
      window.vnEngine.registerHelper(name, fn);
    });
    
    console.log('✅ Template helpers registered successfully');
  } else {
    console.log('⚠️ VN Engine helper system not available');
  }
} catch (error) {
  console.warn('Failed to register template helpers:', error);
}

console.log('🎭 Registering input helpers...');
try {
  if (window.vnEngine && window.vnEngine.registerHelper) {
    const inputHelpers = {
      input: function(name, prompt, defaultValue) {
        return `<input type="text" id="input-${name}" placeholder="${prompt}" value="${defaultValue || ''}" />`;
      },
      choice: function(text, target) {
        return `<button class="choice-btn" data-target="${target}">${text}</button>`;
      }
    };
    
    Object.entries(inputHelpers).forEach(([name, fn]) => {
      window.vnEngine.registerHelper(name, fn);
    });
    
    console.log('✅ Input helpers registered successfully');
  } else {
    console.log('⚠️ VN Engine helper system not available');
  }
} catch (error) {
  console.warn('Failed to register input helpers:', error);
}
