/**
 * Menu Manager
 */
class MenuManager {
  constructor(vnEngine) {
    this.vnEngine = vnEngine;
    this.saveManager = null; // Will be set by runtime
    this.isMenuOpen = false;
    this.menuOverlay = null;
    this.menuPanel = null;
    
    this.initializeMenuElements();
  }

  /**
   * Set the SaveManager instance (called by VNCompilerRuntime)
   */
  setSaveManager(saveManager) {
    this.saveManager = saveManager;
  }

  /**
   * Initialize menu DOM elements
   */
  initializeMenuElements() {
    this.menuOverlay = document.getElementById('vn-menu-overlay');
    this.menuPanel = this.menuOverlay?.querySelector('.vn-menu-panel');
    
    if (!this.menuOverlay || !this.menuPanel) {
      console.warn('⚠️ Menu elements not found in DOM - menu functionality disabled');
      return;
    }
    
    this.setupMenuEventListeners();
  }

  /**
   * Setup event listeners for menu interactions
   */
  setupMenuEventListeners() {
    if (this.menuOverlay) {
      this.menuOverlay.addEventListener('click', (e) => {
        if (e.target === this.menuOverlay) {
          this.closeMenu();
        }
      });
    }
    
    // Menu button event handlers
    const menuButtons = {
      'vn-settings': () => this.openMenu(),
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

  /**
   * Menu visibility controls
   */
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

  /**
   * Save game handler - delegates to SaveManager
   */
  handleSaveGame() {
    this.closeMenu();
    
    if (this.saveManager) {
      this.saveManager.showSaveModal();
    } else {
      this.showNotification('Save system not available', 'error');
    }
  }

  /**
   * Load game handler - delegates to SaveManager
   */
  handleLoadGame() {
    this.closeMenu();
    
    if (this.saveManager) {
      this.saveManager.showLoadModal();
    } else {
      this.showNotification('Load system not available', 'error');
    }
  }

  /**
   * Settings handler
   */
  handleSettings() {
    this.closeMenu();
    
    // Simple settings dialog
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

  /**
   * Main menu handler
   */
  handleMainMenu() {
    this.closeMenu();
    
    const confirmed = confirm('Return to main menu? Any unsaved progress will be lost.');
    if (confirmed) {
      location.reload();
    }
  }

  /**
   * Help handler
   */
  handleHelp() {
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
• Ctrl+S - Quick save
• Ctrl+L - Quick load

Enjoy your interactive story!
    `;
    
    alert(helpText);
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'info') {
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

  /**
   * Check if menu is open
   */
  isOpen() {
    return this.isMenuOpen;
  }
}

// Global export
window.MenuManager = MenuManager;