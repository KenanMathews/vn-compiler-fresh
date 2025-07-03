class MenuManager {
  constructor(vnEngine) {
    this.vnEngine = vnEngine;
    this.isMenuOpen = false;
    this.menuOverlay = null;
    this.menuPanel = null;
    
    this.initializeMenuElements();
  }

  initializeMenuElements() {
    this.menuOverlay = document.getElementById('vn-menu-overlay');
    this.menuPanel = this.menuOverlay?.querySelector('.vn-menu-panel');
    
    if (!this.menuOverlay || !this.menuPanel) {
      console.warn('⚠️ Menu elements not found in DOM - menu functionality disabled');
      return;
    }
    
    this.setupMenuEventListeners();
  }

  setupMenuEventListeners() {
    if (this.menuOverlay) {
      this.menuOverlay.addEventListener('click', (e) => {
        if (e.target === this.menuOverlay) {
          this.closeMenu();
        }
      });
    }
    
    // Use the actual button IDs from template.html
    const menuButtons = {
      'vn-resume': () => this.closeMenu(),
      'vn-save': () => this.handleSaveGame(),
      'vn-load': () => this.handleLoadGame(),
      'vn-help': () => this.handleHelp(),
      'vn-settings-menu': () => this.handleSettings(),
      'vn-main-menu-btn': () => this.handleMainMenu()
    };
    
    Object.entries(menuButtons).forEach(([id, handler]) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', handler);
      }
    });
  }

  openMenu() {
    if (this.menuOverlay) {
      this.menuOverlay.style.display = 'flex';
      this.isMenuOpen = true;
      
      requestAnimationFrame(() => {
        this.menuOverlay.classList.add('show');
      });
    }
  }

  closeMenu() {
    if (this.menuOverlay) {
      this.menuOverlay.classList.remove('show');
      
      // Listen for CSS transition end instead of arbitrary timeout
      this.menuOverlay.addEventListener('transitionend', () => {
        this.menuOverlay.style.display = 'none';
        this.isMenuOpen = false;
      }, { once: true });
    }
  }

  toggleMenu() {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  handleSaveGame() {
    console.log('💾 Save Game clicked');
    this.closeMenu();
    
    try {
      if (!this.vnEngine) {
        console.error('❌ VN Engine not available for saving');
        alert('Error: Game engine not available');
        return;
      }

      // Get game state from VN Engine
      const gameState = this.vnEngine.getGameState();
      
      // Create save data with metadata
      const saveData = {
        gameState: gameState,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        metadata: {
          playerName: gameState.variables?.playerName || 'Unknown',
          playtime: Date.now(),
          checkpoint: gameState.currentScene || 'intro',
          custom: {
            saveSlot: 'quicksave'
          }
        }
      };

      // Save to localStorage
      localStorage.setItem('vn-game-save', JSON.stringify(saveData));
      
      console.log('✅ Game saved successfully');
      this.showNotification('Game saved successfully!', 'success');
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      alert('Failed to save game. Please try again.');
    }
  }

  handleLoadGame() {
    console.log('📂 Load Game clicked');
    this.closeMenu();
    
    try {
      if (!this.vnEngine) {
        console.error('❌ VN Engine not available for loading');
        alert('Error: Game engine not available');
        return;
      }

      // Load from localStorage
      const savedData = localStorage.getItem('vn-game-save');
      
      if (!savedData) {
        alert('No saved game found.');
        return;
      }

      const saveData = JSON.parse(savedData);
      
      if (!saveData.gameState) {
        console.error('❌ Invalid save data format');
        alert('Invalid save file format.');
        return;
      }

      // Restore game state to VN Engine
      this.vnEngine.setGameState(saveData.gameState);
      
      console.log('✅ Game loaded successfully');
      this.showNotification('Game loaded successfully!', 'success');
      
      // Refresh the game display
      if (window.vnRuntime && typeof window.vnRuntime.refreshGameDisplay === 'function') {
        window.vnRuntime.refreshGameDisplay();
      }
      
    } catch (error) {
      console.error('❌ Load failed:', error);
      alert('Failed to load game. Save file may be corrupted.');
    }
  }

  handleSettings() {
    console.log('⚙️ Settings clicked');
    this.closeMenu();
    
    // Basic settings implementation
    const settings = {
      textSpeed: localStorage.getItem('vn-text-speed') || 'normal',
      autoAdvance: localStorage.getItem('vn-auto-advance') === 'true',
      volume: localStorage.getItem('vn-volume') || '0.8'
    };
    
    const newTextSpeed = prompt(`Text Speed (slow/normal/fast):`, settings.textSpeed);
    if (newTextSpeed && ['slow', 'normal', 'fast'].includes(newTextSpeed)) {
      localStorage.setItem('vn-text-speed', newTextSpeed);
      this.showNotification(`Text speed set to ${newTextSpeed}`, 'info');
    }
  }

  handleMainMenu() {
    console.log('🏠 Main Menu clicked');
    this.closeMenu();
    
    const confirmed = confirm('Return to main menu? Any unsaved progress will be lost.');
    if (confirmed) {
      // Reset to main menu state
      if (window.vnRuntime && typeof window.vnRuntime.showMainMenu === 'function') {
        window.vnRuntime.showMainMenu();
      } else {
        location.reload();
      }
    }
  }

  handleHelp() {
    console.log('❓ Help clicked');
    this.closeMenu();
    
    const helpText = `
Visual Novel Game Controls:

• Click "Continue" or press SPACE to advance dialogue
• Make choices when presented to shape your story
• Use the menu (⚙️ button) to save/load your progress
• Input fields let you customize your experience

Keyboard Shortcuts:
• SPACE - Continue dialogue
• ESC - Open/close menu
• S - Quick save
• L - Quick load

Enjoy your interactive story!
    `;
    
    alert(helpText);
  }

  showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `vn-notification vn-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-family: 'Be Vietnam Pro', sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  isOpen() {
    return this.isMenuOpen;
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.MenuManager = MenuManager;
}
