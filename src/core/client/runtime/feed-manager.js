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

  setSceneTitle(title) {
    if (this.sceneTitleElement) {
      this.sceneTitleElement.textContent = title;
    }
    this.currentScene = title;
  }

  clearContent() {
    if (this.sceneContentElement) {
      this.sceneContentElement.innerHTML = '';
    }
    this.currentContent = [];
    this.hideChoices();
    this.hideChoicePreview();
  }

  addDialogueContent(speaker, content, options = {}) {
    if (!this.sceneContentElement) {
      console.error('❌ Scene content element not available');
      return null;
    }

    this.clearContent();

    let processedContent;
    if (typeof content === 'string' && content.includes('&')) {
      const unescapedContent = this.decodeHtmlEntities(content);
      processedContent = this.processContent(unescapedContent);
    } else {
      processedContent = this.processContent(content);
    }
    
    let html = '';
    
    if (speaker && speaker.trim()) {
      html += `<div class="vn-speaker">${this.escapeHTML(speaker)}</div>`;
    }
    
    html += processedContent;
    
    this.sceneContentElement.innerHTML = html;
    
    this.processInputHelpers(this.sceneContentElement);
    
    const contentEntry = {
      type: 'dialogue',
      speaker: speaker || '',
      content: content,
      timestamp: Date.now()
    };
    
    this.currentContent.push(contentEntry);
    
    return contentEntry;
  }

  processContent(content) {
    if (!content) return '';
    
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    if (paragraphs.length === 0) return '';
    
    return paragraphs.map(paragraph => {
      const trimmed = paragraph.trim();
      
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

  showChoices(prompt, choices, options = {}) {
    if (!this.choicesContainer) {
      console.error('❌ Choices container not available');
      return;
    }

    this.hideActionBar();
    
    this.choicesContainer.innerHTML = '';
    
    if (prompt && prompt.trim()) {
      const promptElement = document.createElement('div');
      promptElement.className = 'vn-choice-prompt';
      promptElement.textContent = prompt;
      this.choicesContainer.appendChild(promptElement);
    }
    
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.className = 'vn-choice-button';
      button.textContent = choice.text || choice;
      button.setAttribute('data-choice-index', index);
      
      button.addEventListener('click', () => {
        this.handleChoiceSelection(index, choice);
      });
      
      this.choicesContainer.appendChild(button);
    });
    
    this.choicesContainer.style.display = 'flex';
    this.pendingChoices = { choices, timestamp: Date.now() };
    
    this.showChoicePreview();
  }

  handleChoiceSelection(choiceIndex, choice) {
    if (!this.pendingChoices) {
      return;
    }
    
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
        
    requestAnimationFrame(() => {
      this.hideChoices();
      this.showActionBar();
      
      const result = this.vnEngine.makeChoice(choiceIndex);
      if (window.vnRuntime) {
        window.vnRuntime.handleVNEngineResponse(result);
      }
    });
  }

  showActionBar() {
    if (this.actionBar) {
      this.actionBar.style.display = 'block';
    }
  }

  hideActionBar() {
    if (this.actionBar) {
      this.actionBar.style.display = 'none';
    }
  }

  showChoices() {
    if (this.choicesContainer) {
      this.choicesContainer.style.display = 'flex';
    }
  }

  hideChoices() {
    if (this.choicesContainer) {
      this.choicesContainer.style.display = 'none';
    }
  }

  showChoicePreview() {
    if (this.choicePreview) {
      this.choicePreview.style.display = 'block';
    }
  }

  hideChoicePreview() {
    if (this.choicePreview) {
      this.choicePreview.style.display = 'none';
    }
  }

  addInputInterface(label, inputConfig) {
    if (!this.sceneContentElement) {
      console.error('❌ Scene content element not available');
      return null;
    }

    const inputId = `input-${Date.now()}`;
    
    let html = `
      <div class="vn-input-area">
        <div class="vn-input-group">
          <label for="${inputId}" class="vn-input-label">${this.escapeHTML(label)}</label>
    `;
    
    switch (inputConfig.type) {
      case 'text':
        html += `<input type="text" id="${inputId}" class="vn-input-field" placeholder="${inputConfig.placeholder || ''}" data-var="${inputConfig.varName}">`;
        break;
      case 'textarea':
        html += `<textarea id="${inputId}" class="vn-input-field" placeholder="${inputConfig.placeholder || ''}" data-var="${inputConfig.varName}" rows="3"></textarea>`;
        break;
      case 'select':
        html += `<select id="${inputId}" class="vn-input-field" data-var="${inputConfig.varName}">`;
        if (inputConfig.options) {
          inputConfig.options.forEach(option => {
            html += `<option value="${option.value || option}">${option.text || option}</option>`;
          });
        }
        html += `</select>`;
        break;
      case 'checkbox':
        html += `<label class="vn-checkbox-label"><input type="checkbox" id="${inputId}" class="vn-input-field" data-var="${inputConfig.varName}"> ${inputConfig.checkboxLabel || 'Yes'}</label>`;
        break;
      case 'range':
        html += `<input type="range" id="${inputId}" class="vn-input-field" data-var="${inputConfig.varName}" min="${inputConfig.min || 0}" max="${inputConfig.max || 100}" value="${inputConfig.value || 50}">`;
        break;
      default:
        html += `<input type="text" id="${inputId}" class="vn-input-field" placeholder="${inputConfig.placeholder || ''}" data-var="${inputConfig.varName}">`;
    }
    
    html += `
        </div>
      </div>
    `;
    
    this.sceneContentElement.insertAdjacentHTML('beforeend', html);
    
    const inputElement = document.getElementById(inputId);
    if (inputElement && window.vnRuntime?.inputManager) {
      window.vnRuntime.inputManager.bindInputElement(
        inputElement, 
        inputConfig.varName, 
        inputConfig.type
      );
    }
    
    return inputId;
  }

  processInputHelpers(element) {
    if (window.vnRuntime?.inputManager) {
      window.vnRuntime.inputManager.processNewContent(element);
    }
  }

  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

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

  getContentState() {
    return {
      currentScene: this.currentScene,
      contentCount: this.currentContent.length,
      hasPendingChoices: !!this.pendingChoices,
      lastUpdate: this.currentContent.length > 0 ? this.currentContent[this.currentContent.length - 1].timestamp : null
    };
  }

  serializeContent() {
    return {
      currentScene: this.currentScene,
      content: this.currentContent,
      pendingChoices: this.pendingChoices
    };
  }

  deserializeContent(contentData) {
    if (!contentData) return;
    
    this.currentScene = contentData.currentScene || null;
    this.currentContent = contentData.content || [];
    this.pendingChoices = contentData.pendingChoices || null;
    
    if (this.currentScene) {
      this.setSceneTitle(this.currentScene);
    }
    
    if (this.currentContent.length > 0) {
      const lastContent = this.currentContent[this.currentContent.length - 1];
      if (lastContent.type === 'dialogue') {
        this.addDialogueContent(lastContent.speaker, lastContent.content);
      }
    }
  }

  addDialogueEntry(speaker, content, options = {}) {
    return this.addDialogueContent(speaker, content, options);
  }

  addChoiceEntry(prompt, choices, options = {}) {
    this.showChoices(prompt, choices, options);
    return 'choices-' + Date.now();
  }

  addInputEntry(label, inputConfig) {
    return this.addInputInterface(label, inputConfig);
  }

  clearFeed() {
    this.clearContent();
  }

  getEntryCount() {
    return this.currentContent.length;
  }

  hasPendingChoices() {
    return !!this.pendingChoices;
  }
}

window.FeedManager = ContentManager;
window.ContentManager = ContentManager;
