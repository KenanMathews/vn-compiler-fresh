class SaveManager {
  constructor(vnEngine) {
    this.vnEngine = vnEngine;
    this.maxSaveSlots = 10;
    this.gameStartTime = Date.now();
    
    // Get game metadata for title-specific saves
    this.gameMetadata = window.VN_RUNTIME_DATA?.gameData?.metadata || {};
    this.gameTitle = this.gameMetadata.title || 'untitled-game';
    this.gameVersion = this.gameMetadata.version || '1.0.0';
    
    // Create title-specific save keys
    const sanitizedTitle = this.sanitizeTitle(this.gameTitle);
    this.savePrefix = `vn-save-${sanitizedTitle}-`;
    this.quickSaveKey = `vn-quicksave-${sanitizedTitle}`;
    this.autoSaveKey = `vn-autosave-${sanitizedTitle}`;
    
    this.initializeSaveManager();
  }

  /**
   * Sanitize game title for localStorage keys
   */
  sanitizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }

  initializeSaveManager() {
    this.setupSaveModalHandlers();
    this.gameStartTime = Date.now();
  }

  setupSaveModalHandlers() {
    const saveModal = document.getElementById('save-modal');
    const loadModal = document.getElementById('load-modal');
    
    if (saveModal) {
      const closeBtns = saveModal.querySelectorAll('.vn-modal-close, #close-save-modal-btn');
      closeBtns.forEach(btn => {
        btn.addEventListener('click', () => this.closeSaveModal());
      });
    }
    
    if (loadModal) {
      const closeBtns = loadModal.querySelectorAll('.vn-modal-close, #close-load-modal-btn');
      closeBtns.forEach(btn => {
        btn.addEventListener('click', () => this.closeLoadModal());
      });
    }
  }

  /**
   * VN Engine compatibility method - creates save data
   */
  createSave() {
    return this.createSaveData();
  }

  /**
   * VN Engine compatibility method - loads save data
   */
  loadSave(saveData) {
    try {
      this.restoreGameState(saveData);
      return true;
    } catch (error) {
      console.error('❌ Load save failed:', error);
      return false;
    }
  }

  saveGame(slotId = null) {
    try {
      const saveData = this.createSaveData();
      
      if (slotId === null) {
        this.saveToSlot(this.quickSaveKey, saveData);
        this.showMessage('Game saved (Quick Save)', 'success');
      } else {
        this.saveToSlot(`${this.savePrefix}${slotId}`, saveData);
        this.showMessage(`Game saved to slot ${slotId}`, 'success');
      }
      
      setTimeout(() => this.autoSave(), 1000);
      
      return true;
    } catch (error) {
      console.error('❌ Save failed:', error);
      this.showMessage('Save failed: ' + error.message, 'error');
      return false;
    }
  }

  loadGame(slotId = null) {
    try {
      const saveKey = slotId === null ? this.quickSaveKey : `${this.savePrefix}${slotId}`;
      const saveData = this.loadFromSlot(saveKey);
      
      if (!saveData) {
        this.showMessage('No save data found', 'warning');
        return false;
      }

      // Check game compatibility
      if (!this.isCompatibleSave(saveData)) {
        const savedGame = saveData.gameInfo?.title || 'Unknown Game';
        this.showMessage(`Save is for "${savedGame}", not "${this.gameTitle}"`, 'error');
        return false;
      }

      // Show version warning if different
      if (saveData.gameInfo?.version && saveData.gameInfo.version !== this.gameVersion) {
        this.showMessage(`Loading from version ${saveData.gameInfo.version}`, 'warning');
      }
      
      this.restoreGameState(saveData);
      this.showMessage(slotId === null ? 'Game loaded (Quick Save)' : `Game loaded from slot ${slotId}`, 'success');
      return true;
    } catch (error) {
      console.error('❌ Load failed:', error);
      this.showMessage('Load failed: ' + error.message, 'error');
      return false;
    }
  }

  createSaveData() {
    const currentPlayTime = Date.now() - this.gameStartTime;
    
    const saveData = {
      version: '1.3.0',
      timestamp: Date.now(),
      gameState: this.vnEngine.getGameState(),
      currentScene: this.getCurrentSceneName(),
      gameInfo: {
        title: this.gameTitle,
        version: this.gameVersion,
        metadata: this.gameMetadata
      },
      metadata: {
        playTime: currentPlayTime,
        saveLocation: window.location.href,
        gameVersion: this.vnEngine.getVersion?.() || '1.0.0',
        sceneCount: this.getSceneCount(),
        choiceCount: this.getChoiceCount()
      }
    };
    
    if (window.vnRuntime?.contentManager) {
      try {
        saveData.contentState = window.vnRuntime.contentManager.serializeContent();
      } catch (error) {
        console.warn('⚠️ Failed to serialize content state:', error);
      }
    }
    
    if (window.vnRuntime?.componentManager) {
      try {
        saveData.componentState = window.vnRuntime.componentManager.serializeState();
      } catch (error) {
        console.warn('⚠️ Failed to serialize component state:', error);
        saveData.componentState = {
          fallback: true,
          status: window.vnRuntime.componentManager.getStatus()
        };
      }
    }
    
    if (window.vnRuntime?.sceneManager) {
      try {
        saveData.sceneManagerState = window.vnRuntime.sceneManager.serializeState();
      } catch (error) {
        console.warn('⚠️ Failed to serialize scene manager state:', error);
      }
    }
    
    return saveData;
  }

  async restoreGameState(saveData) {
    if (!saveData || !saveData.gameState) {
      throw new Error('Invalid save data');
    }
    
    this.vnEngine.setGameState(saveData.gameState);
    
    if (saveData.currentScene && window.vnRuntime) {
      window.vnRuntime.currentScene = saveData.currentScene;
      
      try {
        if (typeof this.vnEngine.startScene === 'function') {
          this.vnEngine.startScene(saveData.gameState.currentScene);
        }
      } catch (error) {
        console.warn('⚠️ Could not restore scene:', error);
      }
    }
    
    if (saveData.contentState && window.vnRuntime?.contentManager) {
      try {
        window.vnRuntime.contentManager.deserializeContent(saveData.contentState);
      } catch (error) {
        console.warn('⚠️ Could not restore content state:', error);
      }
    }
    
    if (saveData.componentState && window.vnRuntime?.componentManager) {
      try {
        if (saveData.componentState.fallback) {
          console.warn('⚠️ Component state was saved with fallback method, restoration may be incomplete');
        } else {
          await window.vnRuntime.componentManager.deserializeState(saveData.componentState);
        }
      } catch (error) {
        console.warn('⚠️ Could not restore component state:', error);
      }
    }
    
    if (saveData.sceneManagerState && window.vnRuntime?.sceneManager) {
      try {
        window.vnRuntime.sceneManager.deserializeState(saveData.sceneManagerState);
      } catch (error) {
        console.warn('⚠️ Could not restore scene manager state:', error);
      }
    }
    
    if (saveData.metadata?.playTime) {
      this.gameStartTime = Date.now() - saveData.metadata.playTime;
    }
    
    console.log('✅ Game state restored from save data');
  }

  isCompatibleSave(saveData) {
    if (!saveData.gameInfo) return true; // Legacy save
    return saveData.gameInfo.title === this.gameTitle;
  }

  saveToSlot(key, saveData) {
    const serialized = JSON.stringify(saveData);
    
    try {
      localStorage.setItem(key, serialized);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded();
        throw new Error('Storage quota exceeded - please free up space');
      }
      throw error;
    }
  }

  loadFromSlot(key) {
    const serialized = localStorage.getItem(key);
    if (!serialized) return null;
    
    try {
      const saveData = JSON.parse(serialized);
      return saveData;
    } catch (error) {
      console.error(`❌ Failed to parse save data from ${key}:`, error);
      return null;
    }
  }

  getAllSaves() {
    const saves = [];
    
    for (let i = 1; i <= this.maxSaveSlots; i++) {
      const saveData = this.loadFromSlot(`${this.savePrefix}${i}`);
      saves.push({
        slotId: i,
        data: saveData,
        exists: !!saveData,
        compatible: saveData ? this.isCompatibleSave(saveData) : true,
        timestamp: saveData?.timestamp || null,
        scene: saveData?.currentScene || 'Unknown',
        playTime: saveData?.metadata?.playTime || 0,
        version: saveData?.version || '1.0.0',
        gameTitle: saveData?.gameInfo?.title,
        gameVersion: saveData?.gameInfo?.version,
        hasComponents: !!(saveData?.componentState && !saveData.componentState.fallback)
      });
    }
    
    return saves;
  }

  deleteSave(slotId) {
    const key = `${this.savePrefix}${slotId}`;
    localStorage.removeItem(key);
    
    const saveModal = document.getElementById('save-modal');
    const loadModal = document.getElementById('load-modal');
    
    if (saveModal && saveModal.style.display !== 'none') {
      this.populateSaveSlots();
    }
    if (loadModal && loadModal.style.display !== 'none') {
      this.populateLoadSlots();
    }
  }

  autoSave() {
    try {
      const saveData = this.createSaveData();
      this.saveToSlot(this.autoSaveKey, saveData);
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }

  showSaveModal() {
    const modal = document.getElementById('save-modal');
    if (modal) {
      modal.style.display = 'block';
      this.populateSaveSlots();
    }
  }

  showLoadModal() {
    const modal = document.getElementById('load-modal');
    if (modal) {
      modal.style.display = 'block';
      this.populateLoadSlots();
    }
  }

  closeSaveModal() {
    const modal = document.getElementById('save-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  closeLoadModal() {
    const modal = document.getElementById('load-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  populateSaveSlots() {
    const table = document.getElementById('save-slots-table');
    if (!table) return;
    
    const saves = this.getAllSaves();
    table.innerHTML = '';
    
    saves.forEach(save => {
      const row = document.createElement('tr');
      const playTimeStr = save.playTime ? this.formatPlayTime(save.playTime) : 'N/A';
      const componentIndicator = save.hasComponents ? ' 🧩' : '';
      const incompatibleIndicator = save.exists && !save.compatible ? ' ❌' : '';
      const titleMismatch = save.exists && !save.compatible ? ` (${save.gameTitle})` : '';
      
      row.innerHTML = `
        <td>Slot ${save.slotId}</td>
        <td>${save.exists ? new Date(save.timestamp).toLocaleString() : 'Empty'}</td>
        <td>${save.scene}${componentIndicator}${titleMismatch}${incompatibleIndicator}</td>
        <td style="font-size: 0.8em;">${save.exists ? playTimeStr : ''}</td>
        <td>
          <button class="vn-button vn-button-small vn-button-primary" onclick="vnRuntime.saveManager.saveGame(${save.slotId}); vnRuntime.saveManager.closeSaveModal();">
            Save
          </button>
          ${save.exists ? `<button class="vn-button vn-button-small vn-button-secondary" onclick="vnRuntime.saveManager.deleteSave(${save.slotId})">Delete</button>` : ''}
        </td>
      `;
      
      if (save.exists && !save.compatible) {
        row.style.opacity = '0.6';
        row.title = `This save is for "${save.gameTitle}" and cannot be overwritten`;
      }
      
      table.appendChild(row);
    });
  }

  populateLoadSlots() {
    const table = document.getElementById('load-slots-table');
    if (!table) return;
    
    const saves = this.getAllSaves();
    table.innerHTML = '';
    
    saves.forEach(save => {
      const row = document.createElement('tr');
      const playTimeStr = save.playTime ? this.formatPlayTime(save.playTime) : 'N/A';
      const componentIndicator = save.hasComponents ? ' 🧩' : '';
      const titleMismatch = save.exists && !save.compatible ? ` (${save.gameTitle})` : '';
      const versionInfo = save.exists && save.compatible && save.gameVersion !== this.gameVersion ? 
        ` v${save.gameVersion}` : '';
      
      row.innerHTML = `
        <td>Slot ${save.slotId}</td>
        <td>${save.exists ? new Date(save.timestamp).toLocaleString() : 'Empty'}</td>
        <td>${save.scene}${componentIndicator}${titleMismatch}${versionInfo}</td>
        <td style="font-size: 0.8em;">${save.exists ? playTimeStr : ''}</td>
        <td>
          ${save.exists && save.compatible ? 
            `<button class="vn-button vn-button-small vn-button-primary" onclick="vnRuntime.saveManager.loadGame(${save.slotId}); vnRuntime.saveManager.closeLoadModal();">Load</button>` : 
            save.exists && !save.compatible ? 
            `<span style="color: #888; font-size: 0.8em;">Wrong Game</span>` :
            'No save data'}
        </td>
      `;
      
      if (save.exists && !save.compatible) {
        row.style.opacity = '0.6';
        row.title = `This save is for "${save.gameTitle}" and cannot be loaded`;
      }
      
      table.appendChild(row);
    });
  }

  showMessage(message, type = 'info') {
    if (window.vnRuntime?.showMessage) {
      window.vnRuntime.showMessage(message, type);
    } else {
      console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }
  }

  hasSave(slotId = null) {
    const key = slotId === null ? this.quickSaveKey : `${this.savePrefix}${slotId}`;
    return !!localStorage.getItem(key);
  }

  getSaveInfo(slotId = null) {
    const key = slotId === null ? this.quickSaveKey : `${this.savePrefix}${slotId}`;
    const saveData = this.loadFromSlot(key);
    
    if (!saveData) return null;
    
    return {
      timestamp: saveData.timestamp,
      scene: saveData.currentScene,
      playTime: saveData.metadata?.playTime || 0,
      version: saveData.version,
      gameVersion: saveData.metadata?.gameVersion,
      gameTitle: saveData.gameInfo?.title || 'Unknown',
      gameVersionSaved: saveData.gameInfo?.version || 'Unknown',
      compatible: this.isCompatibleSave(saveData),
      hasComponents: !!(saveData.componentState && !saveData.componentState.fallback),
      componentCount: saveData.componentState?.mountedComponentIds?.length || 0
    };
  }

  getCurrentSceneName() {
    if (window.vnRuntime?.currentScene) {
      return window.vnRuntime.currentScene;
    }
    
    if (this.vnEngine?.getCurrentScene) {
      const scene = this.vnEngine.getCurrentScene();
      return scene?.name || scene || 'Unknown';
    }
    
    return 'Unknown';
  }

  getSceneCount() {
    if (this.vnEngine?.getAllScenes) {
      const scenes = this.vnEngine.getAllScenes();
      return Array.isArray(scenes) ? scenes.length : Object.keys(scenes || {}).length;
    }
    return 0;
  }

  getChoiceCount() {
    if (this.vnEngine?.gameState?.getChoiceHistory) {
      const history = this.vnEngine.gameState.getChoiceHistory();
      return Array.isArray(history) ? history.length : 0;
    }
    return 0;
  }

  formatPlayTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  handleStorageQuotaExceeded() {
    console.warn('⚠️ Storage quota exceeded, attempting cleanup...');
    
    const autoSaveKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('vn-autosave-') || key.startsWith('old-save-'))) {
        autoSaveKeys.push(key);
      }
    }
    
    autoSaveKeys.sort().slice(0, Math.floor(autoSaveKeys.length / 2)).forEach(key => {
      localStorage.removeItem(key);
      console.log(`🧹 Cleaned up old save: ${key}`);
    });
  }

  exportSaveData(slotId) {
    const saveData = this.loadFromSlot(`${this.savePrefix}${slotId}`);
    if (!saveData) {
      this.showMessage('No save data to export', 'warning');
      return;
    }
    
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `vn-save-slot-${slotId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    this.showMessage(`Save slot ${slotId} exported`, 'success');
  }

  importSaveData(file, slotId) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const saveData = JSON.parse(e.target.result);
        
        if (!saveData.gameState || !saveData.timestamp) {
          throw new Error('Invalid save file format');
        }
        
        this.saveToSlot(`${this.savePrefix}${slotId}`, saveData);
        this.showMessage(`Save imported to slot ${slotId}`, 'success');
        
        if (document.getElementById('save-modal').style.display !== 'none') {
          this.populateSaveSlots();
        }
        if (document.getElementById('load-modal').style.display !== 'none') {
          this.populateLoadSlots();
        }
        
      } catch (error) {
        console.error('❌ Import failed:', error);
        this.showMessage('Failed to import save file: ' + error.message, 'error');
      }
    };
    
    reader.readAsText(file);
  }

  getStats() {
    const saves = this.getAllSaves();
    const compatibleSaves = saves.filter(s => s.exists && s.compatible);
    const incompatibleSaves = saves.filter(s => s.exists && !s.compatible);
    const totalPlayTime = compatibleSaves.reduce((total, save) => total + (save.playTime || 0), 0);
    const savesWithComponents = compatibleSaves.filter(s => s.hasComponents).length;
    
    return {
      gameTitle: this.gameTitle,
      gameVersion: this.gameVersion,
      totalSaves: compatibleSaves.length,
      incompatibleSaves: incompatibleSaves.length,
      emptySlots: this.maxSaveSlots - saves.filter(s => s.exists).length,
      totalPlayTime: this.formatPlayTime(totalPlayTime),
      hasQuickSave: this.hasSave(null),
      hasAutoSave: !!localStorage.getItem(this.autoSaveKey),
      savesWithComponents,
      componentTrackingEnabled: true,
      storageUsage: this.calculateStorageUsage()
    };
  }

  calculateStorageUsage() {
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(this.savePrefix) || key === this.quickSaveKey || key === this.autoSaveKey)) {
        const value = localStorage.getItem(key);
        totalSize += key.length + (value ? value.length : 0);
      }
    }
    
    return {
      bytes: totalSize,
      formatted: totalSize > 1024 ? `${Math.round(totalSize / 1024)}KB` : `${totalSize}B`
    };
  }
}

window.SaveManager = SaveManager;