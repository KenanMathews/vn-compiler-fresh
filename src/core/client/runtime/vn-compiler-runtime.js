/**
 * VN Compiler Runtime (Client-side) - Full-screen Scene Version
 * Full JavaScript file with proper syntax highlighting and IntelliSense
 */
class VNCompilerRuntime {
  constructor() {
    this.vnEngine = null;
    this.gameData = null;
    this.assetManager = null;
    this.inputManager = null;
    this.sceneManager = null;
    this.uiManager = null;
    this.contentManager = null;
    this.menuManager = null;
    this.saveManager = null;
    this.initialized = false;
    this.helpersRegistered = false;
    this.isStreaming = false;
    this.currentScene = null;
  }

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
            
            engine.on('stateChange', (result) => {
              if (window.vnRuntime) {
                window.vnRuntime.handleVNEngineResponse(result);
              }
            });
            
            if (window.VN_RUNTIME_DATA?.gameData?.script) {
              // Initialize VN Engine with assets in the variable context
              if (window.VN_RUNTIME_DATA?.gameData?.assets) {
                // Convert asset manifest to array format that helpers expect
                const assetArray = Object.values(window.VN_RUNTIME_DATA.gameData.assets);
                engine.setVariable('gameAssets', assetArray);
              }
              
              // Initialize variables from YAML
              if (window.VN_RUNTIME_DATA?.gameData?.variables) {
                Object.entries(window.VN_RUNTIME_DATA.gameData.variables).forEach(([key, value]) => {
                  engine.setVariable(key, value);
                });
              }
              
              engine.loadScript(window.VN_RUNTIME_DATA.gameData.script);
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
  
  waitForVNEngineScript() {
    return new Promise((resolve, reject) => {
      if (typeof createVNEngine !== 'undefined') {
        resolve();
        return;
      }
      
      const vnEngineScript = document.querySelector('script[src*="vn-engine"]');
      if (vnEngineScript) {
        vnEngineScript.addEventListener('load', () => {
          if (typeof createVNEngine !== 'undefined') {
            resolve();
          } else {
            reject(new Error('VN Engine script loaded but createVNEngine not found'));
          }
        });
        
        vnEngineScript.addEventListener('error', () => {
          reject(new Error('Failed to load VN Engine script'));
        });
      } else {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this.waitForVNEngineScript().then(resolve).catch(reject);
          });
        } else {
          reject(new Error('VN Engine script not found in DOM'));
        }
      }
    });
  }

  async initialize() {
    console.log(' VN Compiler Runtime initializing...');
    
    try {
      this.vnEngine = await this.loadVNEngine();
      
      // Initialize AssetManager with compiled assets
      if (window.VN_RUNTIME_DATA?.gameData?.assets) {
        this.assetManager = new AssetManager(window.VN_RUNTIME_DATA.gameData.assets);
      } else {
        this.assetManager = new AssetManager({});
      }
      
      this.contentManager = new ContentManager(this.vnEngine);
      
      this.inputManager = new InputManager(this.vnEngine);
      
      this.inputManager.registerVNEngineHelpers();
      
      this.menuManager = new MenuManager(this.vnEngine);
      
      this.saveManager = new SaveManager(this.vnEngine);
      
      this.setupEventHandlers();
      
      this.startGame();
            
    } catch (error) {
      console.error(' Failed to initialize VN Compiler Runtime:', error);
      this.showError('Failed to initialize game engine: ' + error.message);
    }
  }

  startGame() {    
    this.contentManager.clearContent();
    
    this.isStreaming = false;
    this.currentScene = null;
    
    const scenes = this.vnEngine.getAllScenes();
    
    if (!scenes || scenes.length === 0) {
      console.error(' No scenes found in VN Engine');
      this.showError('No scenes found in the game script');
      return;
    }
    
    const firstScene = scenes[0];
    const firstSceneName = firstScene.name || Object.keys(scenes)[0] || 'intro';
    
    const formattedTitle = this.formatSceneTitle(firstSceneName);
    this.contentManager.setSceneTitle(formattedTitle);
        
    try {
      const result = this.vnEngine.startScene(firstSceneName);
      this.currentScene = firstSceneName;
      
      if (result) {
        this.handleVNEngineResponse(result);
      } else {
        console.warn(' VN Engine startScene returned no result');
      }
      
      const loadingEl = document.getElementById('vn-loading');
      const gameEl = document.getElementById('vn-game');
      
      if (loadingEl) loadingEl.style.display = 'none';
      if (gameEl) gameEl.style.display = 'flex';
      
    } catch (error) {
      console.error(' Failed to start scene:', error);
      this.showError('Failed to start game scene: ' + error.message);
    }
  }

  handleVNEngineResponse(result) {
    if (!result) {
      console.warn(' VN Engine returned empty result');
      this.isStreaming = false;
      return;
    }
    
    if (this.vnEngine && typeof this.vnEngine.getCurrentScene === 'function') {
      const newScene = this.vnEngine.getCurrentScene();
      if (newScene && newScene !== this.currentScene) {
        this.handleSceneComplete({ message: null, previousScene: this.currentScene });
        this.currentScene = newScene;
        const formattedTitle = this.formatSceneTitle(newScene);
        this.contentManager.setSceneTitle(formattedTitle);
      }
    }
    
    this.hideChoicePreview();

    switch (result.type) {
      case 'display_dialogue':
        this.streamDialogue(result);
        break;

      case 'show_choices':
        this.streamChoices(result);
        break;

      case 'scene_complete':
        this.handleSceneComplete(result);
        break;

      case 'scene_transition':
        this.handleSceneTransition(result);
        break;

      case 'error':
        this.streamError(result);
        break;

      default:
        console.warn('Unknown VN Engine response type:', result.type);
        this.streamDialogue({
          speaker: 'System',
          content: 'Unknown response from game engine',
          canContinue: true
        });
    }

    this.isStreaming = false;
  }

  streamDialogue(dialogue) {
    
    const sceneTitle = this.detectSceneTitle(dialogue.content);
    if (sceneTitle && sceneTitle !== this.currentScene) {
      this.currentScene = sceneTitle;
      this.contentManager.setSceneTitle(sceneTitle);
    }
    
    this.contentManager.addDialogueContent(
      dialogue.speaker,
      dialogue.content,
      {
        canContinue: dialogue.canContinue,
        isNarration: !dialogue.speaker
      }
    );
    
    if (dialogue.canContinue) {
      this.showContinueButton();
    } else {
      this.hideContinueButton();
    }
    
  }

  streamChoices(choiceData) {
    this.hideContinueButton();
    
    this.showChoices(choiceData.content, choiceData.choices, {
      allowMultiple: choiceData.allowMultiple || false,
      timeout: choiceData.timeout || null
    });
  }

  showChoices(prompt, choices, options = {}) {    
    const choicesContainer = document.getElementById('vn-choices');
    if (!choicesContainer) {
      console.error(' Choices container (#vn-choices) not found');
      return;
    }

    const actionBar = document.getElementById('vn-action-bar');
    if (actionBar) {
      actionBar.style.display = 'none';
    }
    
    choicesContainer.innerHTML = '';
    
    if (prompt && prompt.trim()) {
      const promptElement = document.createElement('div');
      promptElement.className = 'vn-choice-prompt';
      promptElement.textContent = prompt;
      choicesContainer.appendChild(promptElement);
    }
    
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.className = 'vn-choice-button';
      button.textContent = choice.text || choice;
      button.setAttribute('data-choice-index', index);
      
      button.addEventListener('click', () => {
        this.handleChoiceSelection(index, choice);
      });
      
      choicesContainer.appendChild(button);
    });
    
    choicesContainer.style.display = 'flex';
  }

  handleChoiceSelection(choiceIndex, choice) {
    
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

  streamError(error) {
    console.error(' VN Engine error:', error);
    
    this.contentManager.addDialogueContent(
      'System Error',
      error.message || 'An unknown error occurred',
      { canContinue: false }
    );
    
    this.contentManager.hideActionBar();
  }

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

  handleSceneTransition(transitionData) {
    console.log(' Scene transition:', transitionData);
    
    this.currentScene = transitionData.newScene;
    
    if (transitionData.newScene) {
      this.contentManager.setSceneTitle(transitionData.newScene);
    }
    
    this.contentManager.clearContent();
    
    if (transitionData.message) {
      this.contentManager.addDialogueContent(
        transitionData.speaker || 'System',
        transitionData.message,
        { canContinue: true }
      );
    }
    
    this.contentManager.showActionBar();
  }

  detectSceneTitle(content) {
    if (!content || typeof content !== 'string') return null;
    
    const chapterMatch = content.match(/^(Chapter\s+\d+.*|Scene\s+\d+.*|Act\s+\d+.*)/i);
    if (chapterMatch) {
      return chapterMatch[1];
    }
    
    const headerMatch = content.match(/^#\s+(.+)/m);
    if (headerMatch) {
      return headerMatch[1];
    }
    
    return null;
  }

  showContinueButton() {
    this.contentManager.showActionBar();
  }

  hideContinueButton() {
    this.contentManager.hideActionBar();
  }

  showChoicePreview() {
    this.contentManager.showChoicePreview();
  }

  hideChoicePreview() {
    this.contentManager.hideChoicePreview();
  }

  setupEventHandlers() {
    const continueBtn = document.getElementById('vn-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.handleContinueClick();
      });
    }

    const saveBtn = document.getElementById('vn-save-quick');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveGame());
    }

    const menuBtn = document.getElementById('vn-settings');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => this.showMenu());
    }
    
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }
  
  handleKeyboardShortcuts(e) {
    if ((e.code === 'Space' || e.code === 'Enter') && !e.ctrlKey && !e.altKey) {
      const continueBtn = document.getElementById('vn-continue');
      if (continueBtn && continueBtn.style.display !== 'none' && !continueBtn.disabled) {
        e.preventDefault();
        this.handleContinueClick();
      }
    }
    
    if (e.code === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      this.contentManager?.scrollToBottom(true);
    }
  }
  
  handleContinueClick() {
    const result = this.vnEngine.continue();
    this.handleVNEngineResponse(result);
  }
  
  showScrollIndicator() {
    const indicator = document.getElementById('vn-scroll-indicator');
    if (indicator) {
      indicator.style.display = 'block';
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 2000);
    }
  }

  saveGame() {
    if (this.saveManager) {
      this.saveManager.showSaveModal();
    } else {
      try {
        const gameState = this.vnEngine.getGameState();
        const saveData = {
          version: '1.0.0',
          timestamp: Date.now(),
          gameState: gameState,
          currentScene: this.currentScene
        };
        
        localStorage.setItem('vn-quicksave', JSON.stringify(saveData));
        console.log(' Game saved (quick save)');
        this.showMessage('Game saved successfully!', 'success');
      } catch (error) {
        console.error(' Save failed:', error);
        this.showMessage('Failed to save game', 'error');
      }
    }
  }

  loadGame() {
    if (this.saveManager) {
      this.saveManager.showLoadModal();
    } else {
      try {
        const saveData = localStorage.getItem('vn-quicksave');
        if (saveData) {
          const parsed = JSON.parse(saveData);
          
          this.vnEngine.setGameState(parsed.gameState);
          
          if (parsed.currentScene) {
            this.currentScene = parsed.currentScene;
          }
          
          console.log(' Game loaded (quick save)');
          this.showMessage('Game loaded successfully!', 'success');
          
          this.startGame();
        } else {
          this.showMessage('No save data found', 'warning');
        }
      } catch (error) {
        console.error(' Load failed:', error);
        this.showMessage('Failed to load game', 'error');
      }
    }
  }

  showMenu() {
    if (this.menuManager) {
      this.menuManager.openMenu();
    }
  }

  showError(message) {
    console.error(' VN Error:', message);
    
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

  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showMessage(message, type = 'info') {
    let messageEl = document.getElementById('vn-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'vn-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 9000;
        font-weight: 500;
        opacity: 0;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(10px);
      `;
      document.body.appendChild(messageEl);
    }

    messageEl.textContent = message;
    messageEl.className = `vn-message vn-message-${type}`;
    
    const colors = {
      success: { bg: 'rgba(0, 255, 128, 0.2)', border: 'rgba(0, 255, 128, 0.4)', text: '#00ff80' },
      error: { bg: 'rgba(255, 0, 0, 0.2)', border: 'rgba(255, 0, 0, 0.4)', text: '#ff6b6b' },
      warning: { bg: 'rgba(255, 193, 7, 0.2)', border: 'rgba(255, 193, 7, 0.4)', text: '#ffc107' },
      info: { bg: 'rgba(0, 212, 255, 0.2)', border: 'rgba(0, 212, 255, 0.4)', text: '#00d4ff' }
    };
    
    const color = colors[type] || colors.info;
    messageEl.style.backgroundColor = color.bg;
    messageEl.style.borderColor = color.border;
    messageEl.style.color = color.text;
    messageEl.style.border = `1px solid ${color.border}`;

    messageEl.style.opacity = '1';

    setTimeout(() => {
      messageEl.style.opacity = '0';
    }, 3000);
  }

  getGameInterface() {
    return {
      continue: () => {
        this.handleContinueClick();
      },
      makeChoice: (index) => {
        console.log(`Choice ${index} handled by content manager`);
      },
      save: () => this.saveGame(),
      load: () => this.loadGame(),
      
      getVariable: (key) => this.vnEngine.getVariable(key),
      setVariable: (key, value) => this.vnEngine.setVariable(key, value),
      
      setStoryFlag: (flagName) => this.vnEngine.gameState?.setStoryFlag(flagName),
      hasStoryFlag: (flagName) => this.vnEngine.gameState?.hasStoryFlag(flagName),
      
      getChoiceHistory: () => this.vnEngine.gameState?.getChoiceHistory() || [],
      playerChose: (choiceText, scene = null) => {
        const history = this.vnEngine.gameState?.getChoiceHistory() || [];
        return history.some(choice => 
          choice.choiceText === choiceText && 
          (scene === null || choice.scene === scene)
        );
      },
      
      setPlayerData: (data) => {
        this.vnEngine.setVariable('player', data);
      },
      getPlayerData: () => {
        return this.vnEngine.getVariable('player') || {};
      },
      updatePlayerStats: (stats) => {
        const player = this.vnEngine.getVariable('player') || {};
        player.stats = { ...player.stats, ...stats };
        this.vnEngine.setVariable('player', player);
      },
      
      getGameState: () => this.vnEngine.getGameState(),
      setGameState: (state) => this.vnEngine.setGameState(state),
      
      getCurrentScene: () => this.currentScene || this.vnEngine.getCurrentScene(),
      goToScene: (sceneName) => {
        const result = this.vnEngine.goToScene(sceneName);
        this.handleVNEngineResponse(result);
        return result;
      },
      restart: () => {
        this.contentManager?.clearContent();
        const result = this.vnEngine.restart();
        this.handleVNEngineResponse(result);
        return result;
      },
      
      clearContent: () => this.contentManager?.clearContent(),
      scrollToBottom: () => this.contentManager?.scrollToBottom(true),
      setAutoScroll: (enabled) => this.contentManager?.setAutoScroll(enabled),
      
      getHelperStatus: () => {
        const handlebarsPath = this.vnEngine?.templateManager?.handlebars ? 
          'templateManager.handlebars' : 
          (window.vnHandlebars ? 'window.vnHandlebars' : 'not found');
          
        return {
          registered: this.helpersRegistered,
          handlebarsPath: handlebarsPath,
          handlebarsAvailable: !!(this.vnEngine?.templateManager?.handlebars || window.vnHandlebars),
          helperCount: this.vnEngine?.templateManager?.handlebars?.helpers ? 
            Object.keys(this.vnEngine.templateManager.handlebars.helpers).length : 0,
          templateEngine: this.vnEngine.getTemplateEngineInfo ? this.vnEngine.getTemplateEngineInfo() : 'unknown',
          gameState: this.vnEngine.getGameState(),
          variables: this.vnEngine.getGameState()?.variables || {},
          storyFlags: this.vnEngine.gameState?.getAllStoryFlags?.() || [],
          choiceHistory: this.vnEngine.gameState?.getChoiceHistory() || []
        };
      },
      
      getAsset: (name) => this.assetManager?.getAsset(name),
      getAssetUrl: (name) => this.assetManager?.getAssetUrl(name),
      isAssetLoaded: (name) => this.assetManager?.isLoaded(name),
      preloadAsset: (name) => this.assetManager?.preload(name),
      getAssetInfo: (name) => this.assetManager?.getAssetInfo(name),
      getAllAssets: () => this.assetManager?.getAllAssets() || {}
    };
  }
  
  getVNEngine() {
    return this.vnEngine;
  }
  
  getContentManager() {
    return this.contentManager;
  }

  getFeedManager() {
    return this.contentManager;
  }

  setInputManager(inputManager) {
    this.inputManager = inputManager;
  }

  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  setMenuManager(menuManager) {
    this.menuManager = menuManager;
  }

  setSaveManager(saveManager) {
    this.saveManager = saveManager;
  }

  formatSceneTitle(sceneName) {
    if (!sceneName) return 'Untitled Scene';
    
    // Convert snake_case or kebab-case to Title Case
    return sceneName
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

window.VNCompilerRuntime = VNCompilerRuntime;
