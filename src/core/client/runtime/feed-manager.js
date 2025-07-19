/**
 * Content Manager
 */
class ContentManager {
  constructor(vnEngine) {
    this.vnEngine = vnEngine;
    this.sceneTitleElement = null;
    this.sceneContentElement = null;
    this.actionBar = null;
    this.choicesContainer = null;
    this.choicePreview = null;
    this.currentContent = [];
    this.pendingChoices = null;
    this.currentScene = null;
    
    this.initializeElements();
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    this.sceneTitleElement = document.getElementById('vn-scene-title');
    this.sceneContentElement = document.getElementById('vn-scene-content');
    this.actionBar = document.getElementById('vn-action-bar');
    this.choicesContainer = document.getElementById('vn-choices');
    this.choicePreview = document.getElementById('vn-choice-preview');
    
    if (!this.sceneContentElement) {
      console.error('❌ Scene content element not found');
      return;
    }
  }

  /**
   * Set the current scene title
   */
  setSceneTitle(title) {
    if (this.sceneTitleElement) {
      this.sceneTitleElement.textContent = title;
    }
    this.currentScene = title;
  }

  /**
   * Clear all content
   */
  clearContent() {
    if (this.sceneContentElement) {
      this.sceneContentElement.innerHTML = '';
    }
    this.currentContent = [];
    this.hideChoices();
    this.hideChoicePreview();
  }

  /**
   * Add dialogue content to the scene
   */
  addDialogueContent(speaker, content, options = {}) {
    if (!this.sceneContentElement) {
      console.error('❌ Scene content element not available');
      return null;
    }

    // Clear previous content (VN style - show current dialogue only)
    this.clearContent();

    // Handle HTML entities in content (important for VN Engine output)
    let processedContent;
    if (typeof content === 'string' && content.includes('&')) {
      const unescapedContent = this.decodeHtmlEntities(content);
      processedContent = this.processContent(unescapedContent);
    } else {
      processedContent = this.processContent(content);
    }
    
    // Build HTML (escape speaker names for safety, allow HTML in content)
    let html = '';
    if (speaker && speaker.trim()) {
      html += `<div class="vn-speaker">${this.escapeHTML(speaker)}</div>`;
    }
    html += processedContent;
    
    // Update display
    this.sceneContentElement.innerHTML = html;
    
    // Store content entry
    const contentEntry = {
      type: 'dialogue',
      speaker: speaker || '',
      content: content,
      timestamp: Date.now()
    };
    
    this.currentContent.push(contentEntry);
    
    return contentEntry;
  }

  /**
   * Process content for display
   */
  processContent(content) {
    if (!content) return '';
    
    // Check if content contains HTML tags
    const hasHtmlTags = /<[^>]*>/g.test(content);
    
    // If content has HTML, return it directly (preserve structure)
    if (hasHtmlTags) {
      return content;
    }
    
    // Otherwise, process as plain text with markdown-like formatting
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    if (paragraphs.length === 0) return '';
    
    return paragraphs.map(paragraph => {
      const trimmed = paragraph.trim();
      
      // Handle simple markdown-like formatting
      if (trimmed.startsWith('# ')) {
        return `<h3 class="vn-content-subtitle">${trimmed.substring(2)}</h3>`;
      } else if (trimmed.startsWith('## ')) {
        return `<h4 class="vn-content-header">${trimmed.substring(3)}</h4>`;
      } else if (trimmed.startsWith('> ')) {
        return `<blockquote class="vn-quote">${trimmed.substring(2)}</blockquote>`;
      } else {
        return `<p class="vn-story-content">${trimmed}</p>`;
      }
    }).join('');
  }

  /**
   * Handle choice selection
   */
  handleChoiceSelection(choiceIndex) {
    if (!this.pendingChoices) {
      return;
    }
    
    // Update choice UI
    const buttons = this.choicesContainer.querySelectorAll('.vn-choice-button');
    buttons.forEach((btn, index) => {
      if (index === choiceIndex) {
        btn.classList.add('vn-choice-selected');
        btn.disabled = true;
      } else {
        btn.style.opacity = '0.4';
        btn.disabled = true;
      }
    });
    
    this.pendingChoices = null;
    this.hideChoicePreview();
        
    // Process choice through VN Engine
    requestAnimationFrame(() => {
      this.hideChoices();
      this.showActionBar();
      
      const result = this.vnEngine.makeChoice(choiceIndex);
      if (window.vnRuntime) {
        window.vnRuntime.handleVNEngineResponse(result);
      }
    });
  }

  /**
   * Show action bar (continue button)
   */
  showActionBar() {
    if (this.actionBar) {
      this.actionBar.style.display = 'block';
    }
  }

  /**
   * Hide action bar
   */
  hideActionBar() {
    if (this.actionBar) {
      this.actionBar.style.display = 'none';
    }
  }

  /**
   * Show choices container
   */
  showChoices() {
    if (this.choicesContainer) {
      this.choicesContainer.style.display = 'flex';
    }
  }

  /**
   * Hide choices container
   */
  hideChoices() {
    if (this.choicesContainer) {
      this.choicesContainer.style.display = 'none';
    }
  }

  /**
   * Show choice preview
   */
  showChoicePreview() {
    if (this.choicePreview) {
      this.choicePreview.style.display = 'block';
    }
  }

  /**
   * Hide choice preview
   */
  hideChoicePreview() {
    if (this.choicePreview) {
      this.choicePreview.style.display = 'none';
    }
  }

  /**
   * Serialize content state for saving
   */
  serializeContent() {
    return {
      currentScene: this.currentScene,
      content: this.currentContent,
      pendingChoices: this.pendingChoices
    };
  }

  /**
   * Deserialize content state from save
   */
  deserializeContent(contentData) {
    if (!contentData) return;
    
    this.currentScene = contentData.currentScene || null;
    this.currentContent = contentData.content || [];
    this.pendingChoices = contentData.pendingChoices || null;
    
    // Restore scene title
    if (this.currentScene) {
      this.setSceneTitle(this.currentScene);
    }
    
    // Restore last content
    if (this.currentContent.length > 0) {
      const lastContent = this.currentContent[this.currentContent.length - 1];
      if (lastContent.type === 'dialogue') {
        this.addDialogueContent(lastContent.speaker, lastContent.content);
      }
    }
  }

  /**
   * Get current content count
   */
  getEntryCount() {
    return this.currentContent.length;
  }

  /**
   * Clear feed (compatibility method)
   */
  clearFeed() {
    this.clearContent();
  }

  /**
   * Check if choices are pending
   */
  hasPendingChoices() {
    return !!this.pendingChoices;
  }

  /**
   * Escape HTML for safe display (used for speaker names)
   */
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Decode HTML entities (important for VN Engine output)
   */
  decodeHtmlEntities(str) {
    if (typeof str !== 'string') return str;
        
    let decoded = str
      .replace(/&#x3d;/gi, '=')
      .replace(/&#x22;/gi, '"')     // &#x22; = "
      .replace(/&#x27;/gi, "'")
      .replace(/&#x3c;/gi, '<')
      .replace(/&#x3e;/gi, '>')
      .replace(/&#x26;/gi, '&')
      .replace(/&#x20;/gi, ' ')
      .replace(/&#x2f;/gi, '/')
      .replace(/&#x3a;/gi, ':')
      .replace(/&#x3b;/gi, ';')
      .replace(/&#x3f;/gi, '?')
      .replace(/&#x21;/gi, '!')
      .replace(/&#x28;/gi, '(')
      .replace(/&#x29;/gi, ')')
      .replace(/&#x5b;/gi, '[')
      .replace(/&#x5d;/gi, ']')
      .replace(/&#x7b;/gi, '{')
      .replace(/&#x7d;/gi, '}');
    
    decoded = decoded
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    
    const textArea = document.createElement('textarea');
    textArea.innerHTML = decoded;
    return textArea.value;
  }
}

// Export both names for compatibility
window.ContentManager = ContentManager;
window.FeedManager = ContentManager;