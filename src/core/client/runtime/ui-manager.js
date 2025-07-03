class UIManager {
    constructor(vnEngine) {
      this.vnEngine = vnEngine;
      this.isMenuOpen = false;
      this.currentModal = null;
      this.saveSlots = new Map();
      this.backgrounds = new Map();
      this.currentBackground = null;
      this.headerVisible = true;
      this.actionBarVisible = true;
      this.lastScrollTime = 0;
      
      this.initializeUI();
      this.setupEventListeners();
      this.loadBackgrounds();
      this.setupAutoHideUI();
    }
  
    initializeUI() {
      this.generateSaveSlots();
      
      this.setBackground('default', 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)');
      
      this.updateUIVisibility();
    }
  
    setupEventListeners() {
      document.getElementById('vn-menu-btn')?.addEventListener('click', () => {
        this.toggleMenu();
      });
  
      document.getElementById('vn-save-quick')?.addEventListener('click', () => {
        this.quickSave();
      });
  
      document.getElementById('vn-menu-resume')?.addEventListener('click', () => {
        this.closeMenu();
      });
  
      document.getElementById('vn-menu-save')?.addEventListener('click', () => {
        this.openSaveModal();
      });
  
      document.getElementById('vn-menu-load')?.addEventListener('click', () => {
        this.openLoadModal();
      });
  
      document.getElementById('vn-menu-restart')?.addEventListener('click', () => {
        this.restartGame();
      });
  
      document.getElementById('vn-modal-close')?.addEventListener('click', () => {
        this.closeModal();
      });
  
      document.getElementById('vn-menu-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'vn-menu-overlay') {
          this.closeMenu();
        }
      });
  
      document.getElementById('vn-save-load-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'vn-save-load-modal') {
          this.closeModal();
        }
      });
  
      document.addEventListener('keydown', (e) => {
        this.handleKeyboardShortcuts(e);
      });
      
      const feedContainer = document.getElementById('vn-feed-container');
      if (feedContainer) {
        feedContainer.addEventListener('scroll', this.handleFeedScroll.bind(this));
      }
    }
  
    handleKeyboardShortcuts(e) {
      if (e.key === 'Escape') {
        if (this.currentModal) {
          this.closeModal();
        } else if (this.isMenuOpen) {
          this.closeMenu();
        } else {
          this.toggleMenu();
        }
      } else if (e.key === 'F5' || (e.ctrlKey && e.key === 's')) {
        e.preventDefault();
        this.quickSave();
      } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        this.openLoadModal();
      } else if (e.key === 'h' && !e.ctrlKey && !e.altKey) {
        this.toggleUIVisibility();
      }
    }
    
    handleFeedScroll() {
      const now = Date.now();
      this.lastScrollTime = now;
      
      if (this.headerVisible || this.actionBarVisible) {
        this.hideUI();
        
        setTimeout(() => {
          if (now === this.lastScrollTime) {
            this.showUI();
          }
        }, 2000);
      }
    }
    
    setupAutoHideUI() {
      document.addEventListener('mousemove', () => {
        if (!this.headerVisible || !this.actionBarVisible) {
          this.showUI();
        }
      });
      
      let inactivityTimer;
      const resetInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          if (!this.isMenuOpen && !this.currentModal) {
            this.hideUI();
          }
        }, 5000);
      };
      
      document.addEventListener('mousemove', resetInactivityTimer);
      document.addEventListener('keydown', resetInactivityTimer);
      document.addEventListener('click', resetInactivityTimer);
      document.addEventListener('scroll', resetInactivityTimer);
      
      resetInactivityTimer();
    }
  
    toggleMenu() {
      if (this.isMenuOpen) {
        this.closeMenu();
      } else {
        this.openMenu();
      }
    }
  
    openMenu() {
      const menuOverlay = document.getElementById('vn-menu-overlay');
      if (menuOverlay) {
        menuOverlay.style.display = 'flex';
        menuOverlay.classList.add('show');
        this.isMenuOpen = true;
        
        this.showUI();
      }
    }
  
    closeMenu() {
      const menuOverlay = document.getElementById('vn-menu-overlay');
      if (menuOverlay) {
        menuOverlay.classList.remove('show');
        setTimeout(() => {
          menuOverlay.style.display = 'none';
          this.isMenuOpen = false;
        }, 300);
      }
    }
  
    openSaveModal() {
      this.openModal('Save Game', 'save');
    }
  
    openLoadModal() {
      this.openModal('Load Game', 'load');
    }
  
    openModal(title, mode) {
      this.closeMenu();
      
      const modal = document.getElementById('vn-save-load-modal');
      const modalTitle = document.getElementById('vn-modal-title');
      
      if (modal && modalTitle) {
        modalTitle.textContent = title;
        modal.style.display = 'flex';
        modal.classList.add('show');
        this.currentModal = mode;
        
        this.updateSaveSlots(mode);
        
        this.showUI();
      }
    }
  
    closeModal() {
      const modal = document.getElementById('vn-save-load-modal');
      if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
          modal.style.display = 'none';
          this.currentModal = null;
        }, 300);
      }
    }
  
    generateSaveSlots() {
      const slotsContainer = document.getElementById('vn-save-slots');
      if (!slotsContainer) return;
  
      slotsContainer.innerHTML = '';
  
      for (let i = 1; i <= 6; i++) {
        const slot = document.createElement('div');
        slot.className = 'vn-save-slot empty';
        slot.dataset.slot = i;
        
        const saveData = this.loadSaveData(i);
        if (saveData) {
          slot.className = 'vn-save-slot';
          slot.innerHTML = `
            <div class="save-slot-header">
              <strong>Slot ${i}</strong>
              <span class="save-date">${new Date(saveData.timestamp).toLocaleDateString()}</span>
            </div>
            <div class="save-scene">Scene: ${saveData.currentScene || saveData.sceneName || 'Unknown'}</div>
            <div class="save-progress">${this.generateProgressText(saveData)}</div>
            ${saveData.feedState ? `<div class="save-entries">Entries: ${saveData.feedState.entryCounter || 0}</div>` : ''}
          `;
        } else {
          slot.innerHTML = `
            <div class="save-slot-header">
              <strong>Slot ${i}</strong>
              <span class="save-status">Empty</span>
            </div>
            <div class="save-placeholder">Click to save</div>
          `;
        }
  
        slot.addEventListener('click', () => {
          this.handleSlotClick(i);
        });
  
        slotsContainer.appendChild(slot);
      }
    }
  
    updateSaveSlots(mode) {
      const slots = document.querySelectorAll('.vn-save-slot');
      slots.forEach(slot => {
        const slotNumber = parseInt(slot.dataset.slot);
        const saveData = this.loadSaveData(slotNumber);
        
        if (mode === 'load' && !saveData) {
          slot.style.opacity = '0.5';
          slot.style.pointerEvents = 'none';
        } else {
          slot.style.opacity = '1';
          slot.style.pointerEvents = 'auto';
        }
      });
    }
  
    handleSlotClick(slotNumber) {
      if (this.currentModal === 'save') {
        this.saveGame(slotNumber);
      } else if (this.currentModal === 'load') {
        this.loadGame(slotNumber);
      }
    }
  
    saveGame(slotNumber) {
      try {
        const gameState = this.vnEngine.getGameState();
        const saveData = {
          timestamp: Date.now(),
          gameState: gameState,
          sceneName: this.vnEngine.getCurrentScene()?.name || 'Unknown',
          currentScene: window.vnRuntime?.currentScene || 'Unknown',
          sceneId: this.vnEngine.getCurrentScene()?.id,
          variables: this.vnEngine.getGameState()?.variables || {},
          progress: this.generateProgressText(),
          version: '1.0'
        };
  
        if (window.vnRuntime?.feedManager) {
          saveData.feedState = window.vnRuntime.feedManager.serializeFeed();
        }
  
        localStorage.setItem(`vn-save-slot-${slotNumber}`, JSON.stringify(saveData));
        
        this.showNotification(`Game saved to slot ${slotNumber}!`, 'success');
        this.generateSaveSlots();
        this.closeModal();
        
      } catch (error) {
        console.error('Save error:', error);
        this.showNotification('Failed to save game', 'error');
      }
    }
  
    loadGame(slotNumber) {
      try {
        const saveData = this.loadSaveData(slotNumber);
        if (!saveData) {
          this.showNotification('No save data found', 'error');
          return;
        }
  
        if (saveData.gameState) {
          this.vnEngine.loadGameState(saveData.gameState);
        }
  
        if (saveData.variables) {
          Object.entries(saveData.variables).forEach(([key, value]) => {
            this.vnEngine.setVariable(key, value);
          });
        }
  
        if (saveData.feedState && window.vnRuntime?.feedManager) {
          window.vnRuntime.feedManager.deserializeFeed(saveData.feedState);
        }
  
        if (saveData.sceneId) {
          this.vnEngine.goToScene(saveData.sceneId);
        } else if (saveData.currentScene) {
          this.vnEngine.goToScene(saveData.currentScene);
        }
  
        this.showNotification(`Game loaded from slot ${slotNumber}!`, 'success');
        this.closeModal();
        
      } catch (error) {
        console.error('Load error:', error);
        this.showNotification('Failed to load game', 'error');
      }
    }
  
    quickSave() {
      this.saveGame(1);
    }
  
    loadSaveData(slotNumber) {
      try {
        const data = localStorage.getItem(`vn-save-slot-${slotNumber}`);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Error loading save data:', error);
        return null;
      }
    }
  
    generateProgressText(saveData = null) {
      const variables = saveData?.variables || this.vnEngine.getGameState()?.variables || {};
      const scene = saveData?.currentScene || saveData?.sceneName || this.vnEngine.getCurrentScene()?.name;
      
      const progress = [];
      if (variables.playerName) {
        progress.push(`Playing as ${variables.playerName}`);
      }
      if (scene) {
        progress.push(`In ${scene}`);
      }
      
      return progress.length > 0 ? progress.join(', ') : 'Game in progress';
    }
  
    restartGame() {
      if (confirm('Are you sure you want to restart the game? All progress will be lost.')) {
        if (window.vnRuntime?.feedManager) {
          window.vnRuntime.feedManager.clearFeed();
        }
        
        this.vnEngine.clearAllVariables();
        
        this.vnEngine.restart();
        
        this.closeMenu();
        this.showNotification('Game restarted', 'info');
      }
    }
  
    showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.className = `vn-notification vn-notification-${type}`;
      notification.textContent = message;
      
      const colors = {
        success: 'rgba(0, 255, 128, 0.9)',
        error: 'rgba(255, 99, 99, 0.9)', 
        warning: 'rgba(255, 193, 7, 0.9)',
        info: 'rgba(0, 212, 255, 0.9)'
      };
      
      notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 9000;
        backdrop-filter: blur(10px);
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
      `;
  
      document.body.appendChild(notification);
      
      requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
      });
  
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 3000);
    }
  
    showUI() {
      const header = document.getElementById('vn-header');
      const actionBar = document.getElementById('vn-action-bar');
      
      if (header) {
        header.classList.remove('hidden');
        this.headerVisible = true;
      }
      
      if (actionBar) {
        actionBar.classList.remove('hidden');
        this.actionBarVisible = true;
      }
    }
    
    hideUI() {
      if (this.isMenuOpen || this.currentModal) {
        return;
      }
      
      const header = document.getElementById('vn-header');
      const actionBar = document.getElementById('vn-action-bar');
      
      if (header) {
        header.classList.add('hidden');
        this.headerVisible = false;
      }
      
      if (actionBar) {
        actionBar.classList.add('hidden');
        this.actionBarVisible = false;
      }
    }
    
    toggleUIVisibility() {
      if (this.headerVisible && this.actionBarVisible) {
        this.hideUI();
      } else {
        this.showUI();
      }
    }
    
    updateUIVisibility() {
      this.showUI();
    }
  
    loadBackgrounds() {
      this.backgrounds.set('default', 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)');
      this.backgrounds.set('forest', 'linear-gradient(135deg, #134e5e, #71b280)');
      this.backgrounds.set('city', 'linear-gradient(135deg, #667db6, #0082c8, #0082c8, #667db6)');
      this.backgrounds.set('night', 'linear-gradient(135deg, #2c3e50, #34495e, #2c3e50)');
      this.backgrounds.set('sunset', 'linear-gradient(135deg, #fa709a, #fee140)');
      this.backgrounds.set('ocean', 'linear-gradient(135deg, #667db6, #0082c8)');
      this.backgrounds.set('space', 'linear-gradient(135deg, #0c0c0c, #1a1a2e, #16213e)');
      this.backgrounds.set('dawn', 'linear-gradient(135deg, #ff9a9e, #fecfef, #fecfef)');
    }
  
    setBackground(name, imageOrGradient) {
      const backgroundElement = document.getElementById('vn-background-image');
      if (!backgroundElement) return;
  
      this.backgrounds.set(name, imageOrGradient);
      this.currentBackground = name;
  
      if (imageOrGradient.startsWith('linear-gradient') || imageOrGradient.startsWith('radial-gradient')) {
        backgroundElement.style.background = imageOrGradient;
        backgroundElement.style.backgroundSize = 'cover';
        backgroundElement.style.backgroundPosition = 'center';
      } else if (imageOrGradient.startsWith('http') || imageOrGradient.startsWith('data:') || imageOrGradient.startsWith('/')) {
        backgroundElement.style.backgroundImage = `url(${imageOrGradient})`;
        backgroundElement.style.backgroundColor = '';
      } else {
        backgroundElement.style.backgroundColor = imageOrGradient;
        backgroundElement.style.backgroundImage = 'none';
      }
  
      console.log(`🎨 Background changed to: ${name}`);
    }
  
    changeBackgroundForScene(sceneName) {
      if (!sceneName) return;
      
      const sceneBackgrounds = {
        'forest': 'forest',
        'woods': 'forest',
        'city': 'city', 
        'urban': 'city',
        'night': 'night',
        'evening': 'night',
        'sunset': 'sunset',
        'dusk': 'sunset',
        'ocean': 'ocean',
        'sea': 'ocean',
        'beach': 'ocean',
        'space': 'space',
        'stars': 'space',
        'dawn': 'dawn',
        'morning': 'dawn',
        'intro': 'default',
        'start': 'default'
      };
  
      const lowerSceneName = sceneName.toLowerCase();
      for (const [keyword, background] of Object.entries(sceneBackgrounds)) {
        if (lowerSceneName.includes(keyword)) {
          const backgroundData = this.backgrounds.get(background);
          if (backgroundData) {
            this.setBackground(background, backgroundData);
            return;
          }
        }
      }
    }
  
    setBackgroundImage(url) {
      this.setBackground('custom', url);
    }
  
    setBackgroundColor(color) {
      this.setBackground('custom', color);
    }
  
    setBackgroundGradient(gradient) {
      this.setBackground('custom', gradient);
    }
  
    fadeBackground(newBackground, duration = 1000) {
      const backgroundElement = document.getElementById('vn-background-image');
      if (!backgroundElement) return;
  
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${newBackground};
        background-size: cover;
        background-position: center;
        opacity: 0;
        transition: opacity ${duration}ms ease-in-out;
        pointer-events: none;
        z-index: 1;
      `;
  
      backgroundElement.parentNode.appendChild(overlay);
  
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });
  
      setTimeout(() => {
        this.setBackground('custom', newBackground);
        overlay.remove();
      }, duration);
    }
    
    getUIState() {
      return {
        menuOpen: this.isMenuOpen,
        modalOpen: !!this.currentModal,
        currentModal: this.currentModal,
        headerVisible: this.headerVisible,
        actionBarVisible: this.actionBarVisible,
        currentBackground: this.currentBackground,
        availableBackgrounds: Array.from(this.backgrounds.keys())
      };
    }
  }
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
  }
