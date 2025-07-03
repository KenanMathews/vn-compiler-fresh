class SceneManager {
  constructor() {
    this.currentSceneId = '';
    this.sceneHistory = [];
    this.transitionInProgress = false;
    this.feedManager = null;
    this.uiManager = null;
    this.sceneStartTimes = new Map();
    this.sceneChoicesCounts = new Map();
    this.bookmarks = new Map();
  }
  
  setFeedManager(feedManager) {
    this.feedManager = feedManager;
  }
  
  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  async transitionToScene(sceneId, transitionType = 'fade', options = {}) {
    if (this.transitionInProgress) {
      console.warn('⚠️ Scene transition already in progress');
      return;
    }
    
    this.transitionInProgress = true;
    
    try {
      console.log(`🎬 Transitioning to scene: ${sceneId} (${transitionType})`);
      
      if (this.currentSceneId) {
        this.recordSceneEndTime(this.currentSceneId);
      }
      
      if (this.currentSceneId && this.currentSceneId !== sceneId) {
        this.sceneHistory.push({
          id: this.currentSceneId,
          timestamp: Date.now(),
          choicesCount: this.sceneChoicesCounts.get(this.currentSceneId) || 0
        });
      }
      
      await this.handleSceneSeparation(sceneId, transitionType, options);
      
      this.updateSceneMetadata(sceneId);
      this.currentSceneId = sceneId;
      
      this.recordSceneStartTime(sceneId);
      
      if (this.uiManager) {
        this.uiManager.changeBackgroundForScene(sceneId);
      }
      
      window.dispatchEvent(new CustomEvent('vn-scene-changed', {
        detail: { 
          sceneId, 
          previousScene: this.sceneHistory.length > 0 ? this.sceneHistory[this.sceneHistory.length - 1].id : null,
          history: [...this.sceneHistory],
          transitionType,
          timestamp: Date.now()
        }
      }));
      
      console.log(`✅ Scene transition completed: ${sceneId}`);
      
    } catch (error) {
      console.error(`❌ Scene transition failed: ${error.message}`);
      throw error;
    } finally {
      this.transitionInProgress = false;
    }
  }
  
  async handleSceneSeparation(sceneId, transitionType, options) {
    if (!this.feedManager) return;
    
    if (!this.currentSceneId) return;
    
    let separatorText = this.generateSeparatorText(sceneId, transitionType, options);
    
    if (transitionType === 'chapter') {
      setTimeout(() => {
        this.feedManager.addSceneSeparator(separatorText);
      }, 500);
    } else {
      this.feedManager.addSceneSeparator(separatorText);
    }
    
    setTimeout(() => {
      this.feedManager.scrollToBottom(true);
    }, 300);
  }
  
  generateSeparatorText(sceneId, transitionType, options = {}) {
    const sceneTitle = options.title || this.formatSceneTitle(sceneId);
    
    switch (transitionType) {
      case 'chapter':
        return `📖 Chapter: ${sceneTitle}`;
      case 'location':
        return `📍 Location: ${sceneTitle}`;
      case 'time':
        return `🕒 ${sceneTitle}`;
      case 'flashback':
        return `💭 Flashback: ${sceneTitle}`;
      case 'dream':
        return `😴 Dream: ${sceneTitle}`;
      case 'memory':
        return `💾 Memory: ${sceneTitle}`;
      case 'epilogue':
        return `🎭 Epilogue: ${sceneTitle}`;
      case 'prologue':
        return `📜 Prologue: ${sceneTitle}`;
      default:
        return `▶️ ${sceneTitle}`;
    }
  }
  
  formatSceneTitle(sceneId) {
    return sceneId
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }
  
  recordSceneStartTime(sceneId) {
    this.sceneStartTimes.set(sceneId, Date.now());
    this.sceneChoicesCounts.set(sceneId, 0);
  }
  
  recordSceneEndTime(sceneId) {
    const startTime = this.sceneStartTimes.get(sceneId);
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`📊 Scene ${sceneId} duration: ${Math.round(duration / 1000)}s`);
    }
  }
  
  recordChoice(sceneId = null) {
    const scene = sceneId || this.currentSceneId;
    if (scene) {
      const current = this.sceneChoicesCounts.get(scene) || 0;
      this.sceneChoicesCounts.set(scene, current + 1);
    }
  }

  updateSceneMetadata(sceneId) {
    const container = document.getElementById('vn-container');
    if (container) {
      container.setAttribute('data-current-scene', sceneId);
      container.setAttribute('data-scene-history-length', this.sceneHistory.length);
      container.setAttribute('data-scene-transition-time', Date.now());
    }
    
    document.body.className = document.body.className.replace(/scene-\w+/g, '');
    document.body.classList.add(`scene-${sceneId.replace(/[^a-zA-Z0-9]/g, '-')}`);
    
    const originalTitle = document.title.split(' - ')[0];
    document.title = `${originalTitle} - ${this.formatSceneTitle(sceneId)}`;
  }

  getCurrentSceneId() {
    return this.currentSceneId;
  }

  getSceneHistory() {
    return [...this.sceneHistory];
  }
  
  getSceneStats() {
    const currentDuration = this.sceneStartTimes.get(this.currentSceneId) 
      ? Date.now() - this.sceneStartTimes.get(this.currentSceneId)
      : 0;
      
    return {
      currentScene: this.currentSceneId,
      totalScenes: this.sceneHistory.length + (this.currentSceneId ? 1 : 0),
      currentSceneDuration: Math.round(currentDuration / 1000),
      currentSceneChoices: this.sceneChoicesCounts.get(this.currentSceneId) || 0,
      historyLength: this.sceneHistory.length,
      bookmarksCount: this.bookmarks.size
    };
  }

  canGoBack() {
    return this.sceneHistory.length > 0;
  }

  async goBack() {
    if (!this.canGoBack()) {
      console.warn('⚠️ No previous scene to go back to');
      return null;
    }
    
    const previousScene = this.sceneHistory.pop();
    if (previousScene) {
      console.log(`⬅️ Going back to scene: ${previousScene.id}`);
      return this.transitionToScene(previousScene.id, 'slide-back', {
        title: `Back to ${this.formatSceneTitle(previousScene.id)}`
      });
    }
    
    return null;
  }
  
  createBookmark(name, description = '') {
    const bookmark = {
      id: `bookmark-${Date.now()}`,
      name: name,
      description: description,
      sceneId: this.currentSceneId,
      timestamp: Date.now(),
      feedState: this.feedManager ? this.feedManager.serializeFeed() : null,
      sceneHistory: [...this.sceneHistory]
    };
    
    this.bookmarks.set(bookmark.id, bookmark);
    console.log(`🔖 Bookmark created: ${name}`);
    
    return bookmark.id;
  }
  
  loadBookmark(bookmarkId) {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) {
      console.warn(`⚠️ Bookmark not found: ${bookmarkId}`);
      return false;
    }
    
    console.log(`🔖 Loading bookmark: ${bookmark.name}`);
    
    this.sceneHistory = [...bookmark.sceneHistory];
    
    if (bookmark.feedState && this.feedManager) {
      this.feedManager.deserializeFeed(bookmark.feedState);
    }
    
    this.transitionToScene(bookmark.sceneId, 'bookmark', {
      title: `Bookmark: ${bookmark.name}`
    });
    
    return true;
  }
  
  getBookmarks() {
    return Array.from(this.bookmarks.values()).map(bookmark => ({
      id: bookmark.id,
      name: bookmark.name,
      description: bookmark.description,
      sceneId: bookmark.sceneId,
      timestamp: bookmark.timestamp,
      sceneTitle: this.formatSceneTitle(bookmark.sceneId)
    }));
  }
  
  deleteBookmark(bookmarkId) {
    const deleted = this.bookmarks.delete(bookmarkId);
    if (deleted) {
      console.log(`🗑️ Bookmark deleted: ${bookmarkId}`);
    }
    return deleted;
  }
  
  getProgressionStats() {
    const totalTime = this.sceneHistory.reduce((total, scene) => {
      const startTime = this.sceneStartTimes.get(scene.id);
      return total + (startTime ? scene.timestamp - startTime : 0);
    }, 0);
    
    const totalChoices = this.sceneHistory.reduce((total, scene) => {
      return total + (scene.choicesCount || 0);
    }, 0);
    
    return {
      totalPlayTime: Math.round(totalTime / 1000),
      totalChoices: totalChoices,
      averageSceneTime: this.sceneHistory.length > 0 
        ? Math.round(totalTime / this.sceneHistory.length / 1000) 
        : 0,
      scenesVisited: this.sceneHistory.length,
      currentSessionTime: this.sceneStartTimes.get(this.currentSceneId) 
        ? Math.round((Date.now() - this.sceneStartTimes.get(this.currentSceneId)) / 1000)
        : 0
    };
  }
  
  async jumpToScene(sceneId, transitionType = 'jump') {
    console.log(`🦘 Jumping to scene: ${sceneId}`);
    return this.transitionToScene(sceneId, transitionType, {
      title: `Jump to ${this.formatSceneTitle(sceneId)}`
    });
  }
  
  async nextChapter(chapterName) {
    return this.transitionToScene(chapterName, 'chapter', {
      title: chapterName
    });
  }
  
  async flashback(sceneId, title = '') {
    return this.transitionToScene(sceneId, 'flashback', {
      title: title || `Flashback to ${this.formatSceneTitle(sceneId)}`
    });
  }
  
  async dream(sceneId, title = '') {
    return this.transitionToScene(sceneId, 'dream', {
      title: title || `Dream: ${this.formatSceneTitle(sceneId)}`
    });
  }
  
  serializeState() {
    return {
      currentSceneId: this.currentSceneId,
      sceneHistory: [...this.sceneHistory],
      sceneStartTimes: Object.fromEntries(this.sceneStartTimes),
      sceneChoicesCounts: Object.fromEntries(this.sceneChoicesCounts),
      bookmarks: Object.fromEntries(this.bookmarks)
    };
  }
  
  deserializeState(state) {
    if (!state) return;
    
    this.currentSceneId = state.currentSceneId || '';
    this.sceneHistory = state.sceneHistory || [];
    this.sceneStartTimes = new Map(Object.entries(state.sceneStartTimes || {}));
    this.sceneChoicesCounts = new Map(Object.entries(state.sceneChoicesCounts || {}));
    this.bookmarks = new Map(Object.entries(state.bookmarks || {}));
    
    if (this.currentSceneId) {
      this.updateSceneMetadata(this.currentSceneId);
    }
  }
  
  getDebugInfo() {
    return {
      ...this.getSceneStats(),
      ...this.getProgressionStats(),
      transitionInProgress: this.transitionInProgress,
      bookmarks: this.getBookmarks(),
      feedManagerConnected: !!this.feedManager,
      uiManagerConnected: !!this.uiManager
    };
  }
  
  reset() {
    this.currentSceneId = '';
    this.sceneHistory = [];
    this.sceneStartTimes.clear();
    this.sceneChoicesCounts.clear();
    this.bookmarks.clear();
    this.transitionInProgress = false;
    
    const originalTitle = document.title.split(' - ')[0];
    document.title = originalTitle;
    
    document.body.className = document.body.className.replace(/scene-\w+/g, '');
    
    console.log('🔄 Scene Manager reset');
  }
}
