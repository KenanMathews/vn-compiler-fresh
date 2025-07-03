class SaveManager {
  constructor(vnEngine) {
    this.vnEngine = vnEngine;
    this.maxSaveSlots = 10;
    this.savePrefix = 'vn-save-';
    this.quickSaveKey = 'vn-quicksave';
    this.autoSaveKey = 'vn-autosave';
    
    this.initializeSaveManager();
  }

  initializeSaveManager() {
    this.setupSaveModalHandlers();
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
    const saveData = {
      version: '1.0.0',
      timestamp: Date.now(),
      gameState: this.vnEngine.getGameState(),
      currentScene: window.vnRuntime?.currentScene || null,
      metadata: {
        playTime: Date.now() - (this.gameStartTime || Date.now()),
        saveLocation: window.location.href,
        gameVersion: this.vnEngine.getVersion?.() || '1.0.0'
      }
    };
    
    if (window.vnRuntime?.contentManager) {
      saveData.contentState = window.vnRuntime.contentManager.serializeContent();
    }
    
    return saveData;
  }

  restoreGameState(saveData) {
    if (!saveData || !saveData.gameState) {
      throw new Error('Invalid save data');
    }
    
    this.vnEngine.setGameState(saveData.gameState);
    
    if (saveData.currentScene && window.vnRuntime) {
      window.vnRuntime.currentScene = saveData.currentScene;
    }
    
    if (saveData.contentState && window.vnRuntime?.contentManager) {
      window.vnRuntime.contentManager.deserializeContent(saveData.contentState);
    }
    
    console.log('✅ Game state restored from save data');
  }

  saveToSlot(key, saveData) {
    const serialized = JSON.stringify(saveData);
    localStorage.setItem(key, serialized);
  }

  loadFromSlot(key) {
    const serialized = localStorage.getItem(key);
    if (!serialized) return null;
    
    try {
      return JSON.parse(serialized);
    } catch (error) {
      console.error('❌ Failed to parse save data:', error);
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
        timestamp: saveData?.timestamp || null,
        scene: saveData?.currentScene || 'Unknown'
      });
    }
    
    return saves;
  }

  deleteSave(slotId) {
    localStorage.removeItem(`${this.savePrefix}${slotId}`);
  }

  autoSave() {
    try {
      const saveData = this.createSaveData();
      this.saveToSlot(this.autoSaveKey, saveData);
      console.log('🔄 Auto-saved');
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
      row.innerHTML = `
        <td>Slot ${save.slotId}</td>
        <td>${save.exists ? new Date(save.timestamp).toLocaleString() : 'Empty'}</td>
        <td>${save.scene}</td>
        <td>
          <button class="vn-button vn-button-small vn-button-primary" onclick="vnRuntime.saveManager.saveGame(${save.slotId})">
            Save
          </button>
          ${save.exists ? `<button class="vn-button vn-button-small vn-button-secondary" onclick="vnRuntime.saveManager.deleteSave(${save.slotId})">Delete</button>` : ''}
        </td>
      `;
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
      row.innerHTML = `
        <td>Slot ${save.slotId}</td>
        <td>${save.exists ? new Date(save.timestamp).toLocaleString() : 'Empty'}</td>
        <td>${save.scene}</td>
        <td>
          ${save.exists ? `<button class="vn-button vn-button-small vn-button-primary" onclick="vnRuntime.saveManager.loadGame(${save.slotId})">Load</button>` : 'No save data'}
        </td>
      `;
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
      playTime: saveData.metadata.playTime,
      version: saveData.version
    };
  }
}

window.SaveManager = SaveManager;
