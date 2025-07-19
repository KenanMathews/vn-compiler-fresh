/**
 * VN Compiler Runtime
 */
class VNCompilerRuntime {
  constructor() {
    this.vnEngine = null;
    this.gameData = null;
    this.initialized = false;
    this.isStreaming = false;
    this.currentScene = null;
    
    // Core managers
    this.assetManager = null;
    this.contentManager = null;
    this.saveManager = null;
    this.menuManager = null;
    this.uiManager = null;
    this.inputManager = null;
    this.componentManager = null;
  }

  /**
   * Main initialization method
   */
  async initialize() {
    try {
      console.log('🚀 Initializing VN Compiler Runtime...');
      
      // Step 1: Load VN Engine
      await this.initializeVNEngine();
      
      // Step 2: Create all managers
      await this.initializeManagers();
      
      // Step 3: Connect managers together
      this.connectManagers();
      
      // Step 4: Setup event handling
      this.setupEventHandlers();
      
      // Step 5: Expose global API
      this.exposeGlobalAPI();
      
      // Step 6: Start the game
      this.startGame();
      
      this.initialized = true;
      console.log('✅ VN Compiler Runtime initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize VN Compiler Runtime:', error);
      this.showError('Failed to initialize game engine: ' + error.message);
    }
  }

  /**
   * Initialize VN Engine
   */
  async initializeVNEngine() {
    console.log('🔧 Loading VN Engine...');
    
    this.vnEngine = await this.loadVNEngine();
    
    // Initialize variables from runtime data
    if (window.VN_RUNTIME_DATA?.gameData?.variables) {
      Object.entries(window.VN_RUNTIME_DATA.gameData.variables).forEach(([key, value]) => {
        this.vnEngine.setVariable(key, value);
      });
    }
    
    // Load game script
    if (window.VN_RUNTIME_DATA?.gameData?.script) {
      this.vnEngine.loadScript(window.VN_RUNTIME_DATA.gameData.script);
    }
    
    // Setup VN Engine event listeners
    this.vnEngine.on('stateChange', (result) => {
      this.handleVNEngineResponse(result);
    });
    
    console.log('✅ VN Engine loaded');
  }

  /**
   * Initialize all managers in correct order
   */
  async initializeManagers() {
    console.log('🔧 Creating managers...');
    
    // Asset Manager
    const assetManifest = window.VN_RUNTIME_DATA?.gameData?.assets || {};
    this.assetManager = new AssetManager(assetManifest);
    
    // Content Manager
    this.contentManager = new ContentManager(this.vnEngine);
    
    // Save Manager
    this.saveManager = new SaveManager(this.vnEngine);
    
    // Menu Manager
    this.menuManager = new MenuManager(this.vnEngine);
    
    // UI Manager
    this.uiManager = new UIManager(this.vnEngine);
    
    // Input Manager
    this.inputManager = new InputManager(this.vnEngine);
    this.inputManager.registerVNEngineHelpers();
    
    // Component Manager
    this.componentManager = new ComponentManager(this.vnEngine);
    this.componentManager.registerComponentHelpers();
    
    console.log('✅ All managers created');
  }

  /**
   * Connect managers together
   */
  connectManagers() {
    console.log('🔗 Connecting managers...');
    
    // Connect SaveManager to UI components
    this.uiManager.setSaveManager(this.saveManager);
    this.menuManager.setSaveManager(this.saveManager);
    
    // Connect InputManager to ContentManager
    this.inputManager.setFeedManager(this.contentManager);
    
    // Setup VN Engine save/load integration
    this.setupVNEngineSaveIntegration();
    
    console.log('✅ Managers connected');
  }

  /**
   * Setup VN Engine save/load integration
   */
  setupVNEngineSaveIntegration() {
    // Override VN Engine's save/load methods to use SaveManager
    this.vnEngine.createSave = () => {
      return this.saveManager.createSave();
    };

    this.vnEngine.loadSave = (saveData) => {
      return this.saveManager.loadSave(saveData);
    };

    // Register save/load helpers
    if (this.vnEngine.registerHelper) {
      this.vnEngine.registerHelper('saveGame', (slotNumber) => {
        return this.saveManager.saveGame(slotNumber);
      });

      this.vnEngine.registerHelper('loadGame', (slotNumber) => {
        return this.saveManager.loadGame(slotNumber);
      });

      this.vnEngine.registerHelper('quickSave', () => {
        return this.saveManager.saveGame(1);
      });

      this.vnEngine.registerHelper('quickLoad', () => {
        return this.saveManager.loadGame(1);
      });

      this.vnEngine.registerHelper('hasSave', (slotNumber) => {
        return this.saveManager.hasSave(slotNumber);
      });
    }
  }

  /**
   * Setup centralized event handling
   */
  setupEventHandlers() {
    console.log('🔧 Setting up event handlers...');
    
    // Continue button
    const continueBtn = document.getElementById('vn-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.handleContinueClick();
      });
    }

    // Centralized keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
    
    // Scene change events for components
    window.addEventListener('vn-scene-changed', (event) => {
      if (this.componentManager) {
        this.componentManager.handleSceneChange(event.detail);
      }
    });
    
    console.log('✅ Event handlers setup');
  }

  /**
   * Handle centralized keyboard shortcuts
   */
  handleKeyboardShortcuts(e) {
    // Continue dialogue
    if ((e.code === 'Space' || e.code === 'Enter') && !e.ctrlKey && !e.altKey) {
      const continueBtn = document.getElementById('vn-continue');
      if (continueBtn && continueBtn.style.display !== 'none' && !continueBtn.disabled) {
        e.preventDefault();
        this.handleContinueClick();
      }
    }
    
    // Quick save/load
    if (e.code === 'KeyS' && e.ctrlKey) {
      e.preventDefault();
      this.saveManager.saveGame(1);
    }

    if (e.code === 'KeyL' && e.ctrlKey) {
      e.preventDefault();
      this.saveManager.loadGame(1);
    }

    // Menu toggle
    if (e.code === 'Escape') {
      this.menuManager.toggleMenu();
    }
    
    // Quick scroll to bottom
    if (e.code === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      this.contentManager?.scrollToBottom?.(true);
    }
  }

  /**
   * Expose clean global API
   */
  exposeGlobalAPI() {
    console.log('🌐 Exposing global API...');
    
    // Main runtime access
    window.vnRuntime = this;
    window.vnEngine = this.vnEngine;
    
    // Clean user-facing API
    window.vn = {
      // Core engine access
      engine: this.vnEngine,
      state: this.vnEngine.gameState,
      
      // User actions
      continue: () => this.handleContinueClick(),
      save: (slot) => this.saveManager.saveGame(slot),
      load: (slot) => this.saveManager.loadGame(slot),
      quickSave: () => this.saveManager.saveGame(1),
      quickLoad: () => this.saveManager.loadGame(1),
      restart: () => this.vnEngine.restart(),
      
      // Variable access
      get: (key) => this.vnEngine.getVariable(key),
      set: (key, value) => this.vnEngine.setVariable(key, value),
      
      // Asset access
      getAsset: (name) => this.assetManager.getAsset(name),
      getAssetUrl: (name) => this.assetManager.getAssetUrl(name),
      
      // Debug helpers
      debug: {
        state: () => console.table(this.vnEngine.getGameState()),
        saves: () => console.table(this.saveManager.getStats()),
        managers: () => console.log(this.getDebugInfo())
      }
    };
    
    // Legacy compatibility
    window.vnGame = this.getGameInterface();
    
    console.log('✅ Global API exposed');
  }

  /**
   * Load VN Engine with proper error handling
   */
  loadVNEngine() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('VN Engine not available after 10 seconds'));
      }, 10000);
      
      const initializeEngine = async () => {
        if (typeof createVNEngine !== 'undefined') {
          clearTimeout(timeout);
          
          try {
            const engine = await createVNEngine();
            
            // Set up asset variables if available
            if (window.VN_RUNTIME_DATA?.gameData?.assets) {
              const assetArray = Object.values(window.VN_RUNTIME_DATA.gameData.assets);
              engine.setVariable('assets', assetArray);
            }
            
            resolve(engine);
          } catch (error) {
            reject(error);
          }
        } else {
          requestAnimationFrame(() => initializeEngine());
        }
      };
      
      initializeEngine();
    });
  }

  /**
   * Start the game
   */
  startGame() {
    console.log('🎮 Starting game...');
    
    this.contentManager.clearContent();
    this.isStreaming = false;
    this.currentScene = null;
    
    const scenes = this.vnEngine.getAllScenes();
    
    if (!scenes || scenes.length === 0) {
      console.error('❌ No scenes found in VN Engine');
      this.showError('No scenes found in the game script');
      return;
    }
    
    // Get first scene
    const firstScene = scenes[0];
    const firstSceneName = firstScene.name || Object.keys(scenes)[0] || 'intro';
    
    // Set scene title
    const formattedTitle = this.formatSceneTitle(firstSceneName);
    this.contentManager.setSceneTitle(formattedTitle);
    
    try {
      // Start the first scene
      const result = this.vnEngine.startScene(firstSceneName);
      this.currentScene = firstSceneName;
      
      if (result) {
        this.handleVNEngineResponse(result);
      }
      
      // Hide loading, show game
      const loadingEl = document.getElementById('vn-loading');
      const gameEl = document.getElementById('vn-game');
      
      if (loadingEl) loadingEl.style.display = 'none';
      if (gameEl) gameEl.style.display = 'flex';
      
      console.log('✅ Game started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start scene:', error);
      this.showError('Failed to start game scene: ' + error.message);
    }
  }

  /**
   * Handle VN Engine responses
   */
  handleVNEngineResponse(result) {
    if (!result) {
      console.warn('⚠️ VN Engine returned empty result');
      this.isStreaming = false;
      return;
    }
    
    // Check for scene changes
    if (this.vnEngine && typeof this.vnEngine.getCurrentScene === 'function') {
      const newScene = this.vnEngine.getCurrentScene();
      if (newScene && newScene !== this.currentScene) {
        this.handleSceneTransition(newScene);
      }
    }
    
    // Hide choice preview
    this.contentManager.hideChoicePreview();

    // Handle different response types
    switch (result.type) {
      case 'display_dialogue':
        this.handleDialogue(result);
        break;

      case 'show_choices':
        this.handleChoices(result);
        break;

      case 'scene_complete':
        this.handleSceneComplete(result);
        break;

      case 'scene_transition':
        this.handleSceneTransition(result.newScene);
        break;

      case 'error':
        this.handleError(result);
        break;

      default:
        console.warn('Unknown VN Engine response type:', result.type);
        this.handleDialogue({
          speaker: 'System',
          content: 'Unknown response from game engine',
          canContinue: true
        });
    }

    this.isStreaming = false;
  }

  /**
   * Handle dialogue display
   */
  handleDialogue(dialogue) {
    this.contentManager.addDialogueContent(
      dialogue.speaker,
      dialogue.content,
      {
        canContinue: dialogue.canContinue,
        isNarration: !dialogue.speaker
      }
    );
    
    if (dialogue.canContinue) {
      this.contentManager.showActionBar();
    } else {
      this.contentManager.hideActionBar();
    }
  }

  /**
   * Handle choice display
   */
  handleChoices(choiceData) {
    this.contentManager.hideActionBar();
    
    const choicesContainer = document.getElementById('vn-choices');
    if (!choicesContainer) {
      console.error('❌ Choices container not found');
      return;
    }

    const actionBar = document.getElementById('vn-action-bar');
    if (actionBar) {
      actionBar.style.display = 'none';
    }
    
    choicesContainer.innerHTML = '';
    
    // Add prompt if provided
    if (choiceData.content && choiceData.content.trim()) {
      const promptElement = document.createElement('div');
      promptElement.className = 'vn-choice-prompt';
      promptElement.textContent = choiceData.content;
      choicesContainer.appendChild(promptElement);
    }
    
    // Add choice buttons
    choiceData.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.className = 'vn-choice-button';
      button.textContent = choice.text || choice;
      button.setAttribute('data-choice-index', index);
      
      button.addEventListener('click', () => {
        this.handleChoiceSelection(index);
      });
      
      choicesContainer.appendChild(button);
    });
    
    choicesContainer.style.display = 'flex';
  }

  /**
   * Handle choice selection
   */
  handleChoiceSelection(choiceIndex) {
    const choicesContainer = document.getElementById('vn-choices');
    if (choicesContainer) {
      const buttons = choicesContainer.querySelectorAll('.vn-choice-button');
      buttons.forEach((btn, index) => {
        if (index === choiceIndex) {
          btn.classList.add('vn-choice-selected');
          btn.disabled = true;
        } else {
          btn.style.opacity = '0.4';
          btn.disabled = true;
        }
      });
      
      setTimeout(() => {
        choicesContainer.style.display = 'none';
        
        const actionBar = document.getElementById('vn-action-bar');
        if (actionBar) {
          actionBar.style.display = 'block';
        }
        
        const result = this.vnEngine.makeChoice(choiceIndex);
        this.handleVNEngineResponse(result);
      }, 500);
    }
  }

  /**
   * Handle scene transitions
   */
  handleSceneTransition(newScene) {
    const oldScene = this.currentScene;
    this.currentScene = newScene;
    
    // Update scene title
    const formattedTitle = this.formatSceneTitle(newScene);
    this.contentManager.setSceneTitle(formattedTitle);
    
    // Update background if UI manager is available
    if (this.uiManager) {
      this.uiManager.changeBackgroundForScene(newScene);
    }
    
    // Dispatch scene change event
    window.dispatchEvent(new CustomEvent('vn-scene-changed', {
      detail: { 
        sceneId: newScene,
        previousScene: oldScene,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Handle scene completion
   */
  handleSceneComplete(sceneData) {
    this.currentScene = null;
    
    if (sceneData.message) {
      this.contentManager.addDialogueContent(
        'System',
        sceneData.message,
        { canContinue: true }
      );
    }
    
    this.contentManager.showActionBar();
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('❌ VN Engine error:', error);
    
    this.contentManager.addDialogueContent(
      'System Error',
      error.message || 'An unknown error occurred',
      { canContinue: false }
    );
    
    this.contentManager.hideActionBar();
  }

  /**
   * Handle continue button click
   */
  handleContinueClick() {
    if (this.isStreaming) return;
    
    this.isStreaming = true;
    const result = this.vnEngine.continue();
    this.handleVNEngineResponse(result);
  }

  /**
   * Format scene title for display
   */
  formatSceneTitle(sceneName) {
    if (!sceneName) return 'Untitled Scene';
    
    return sceneName
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error('❌ VN Error:', message);
    
    const contentElement = document.getElementById('vn-content');
    if (contentElement) {
      contentElement.innerHTML = `
        <div class="vn-error-message">
          <h3>Game Error</h3>
          <p>${this.escapeHTML(message)}</p>
          <button onclick="location.reload()" class="vn-error-retry">Try Again</button>
        </div>
      `;
      return;
    }
    
    const errorElement = document.getElementById('vn-error');
    if (errorElement) {
      errorElement.innerHTML = `
        <div class="error-message">
          <h2>VN Runtime Error</h2>
          <p>${this.escapeHTML(message)}</p>
          <button onclick="location.reload()" class="error-retry">Reload Game</button>
        </div>
      `;
      errorElement.style.display = 'block';
    } else {
      alert('Game Error: ' + message);
    }
  }

  /**
   * Show user message
   */
  showMessage(message, type = 'info') {
    if (this.uiManager) {
      this.uiManager.showNotification(message, type);
    } else {
      console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Escape HTML for safety
   */
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get game interface for legacy compatibility
   */
  getGameInterface() {
    return {
      // Core actions
      continue: () => this.handleContinueClick(),
      save: (slot) => this.saveManager.saveGame(slot),
      load: (slot) => this.saveManager.loadGame(slot),
      quickSave: () => this.saveManager.saveGame(1),
      quickLoad: () => this.saveManager.loadGame(1),
      restart: () => this.vnEngine.restart(),
      
      // Variable access
      getVariable: (key) => this.vnEngine.getVariable(key),
      setVariable: (key, value) => this.vnEngine.setVariable(key, value),
      
      // Game state
      getGameState: () => this.vnEngine.getGameState(),
      setGameState: (state) => this.vnEngine.setGameState(state),
      
      // Scene management
      getCurrentScene: () => this.currentScene || this.vnEngine.getCurrentScene(),
      startScene: (sceneName) => {
        const result = this.vnEngine.startScene(sceneName);
        this.handleVNEngineResponse(result);
        return result;
      },
      
      // Asset access
      getAsset: (name) => this.assetManager.getAsset(name),
      getAssetUrl: (name) => this.assetManager.getAssetUrl(name),
      
      // Save info
      hasSave: (slot) => this.saveManager.hasSave(slot),
      getSaveInfo: (slot) => this.saveManager.getSaveInfo(slot),
      
      // Debug info
      getHelperStatus: () => this.getDebugInfo()
    };
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      initialized: this.initialized,
      currentScene: this.currentScene,
      vnEngine: !!this.vnEngine,
      managers: {
        assetManager: !!this.assetManager,
        contentManager: !!this.contentManager,
        saveManager: !!this.saveManager,
        menuManager: !!this.menuManager,
        uiManager: !!this.uiManager,
        inputManager: !!this.inputManager,
        componentManager: !!this.componentManager
      },
      gameState: this.vnEngine?.getGameState?.(),
      saveStats: this.saveManager?.getStats?.()
    };
  }

  /**
   * Get VN Engine
   */
  getVNEngine() {
    return this.vnEngine;
  }

  /**
   * Get Content Manager
   */
  getContentManager() {
    return this.contentManager;
  }

  /**
   * Get Feed Manager (alias for content manager)
   */
  getFeedManager() {
    return this.contentManager;
  }
}

window.VNCompilerRuntime = VNCompilerRuntime;