class InputManager {
  constructor(vnEngine) {
    this.vnEngine = vnEngine;
    this.inputElements = new Map();
    this.validationRules = new Map();
    this.helperCounter = 0;
    this.feedManager = null;
    this.liveRegion = null;
    
    this.initializeLiveRegion();
  }
  
  initializeLiveRegion() {
    this.liveRegion = document.getElementById('vn-live-region');
    if (!this.liveRegion) {
      document.addEventListener('DOMContentLoaded', () => {
        this.liveRegion = document.getElementById('vn-live-region');
      });
    }
  }
  
  setFeedManager(feedManager) {
    this.feedManager = feedManager;
  }

  setupInputHelpers(inputHelpers) {
    inputHelpers.forEach(helper => {
      this.registerInputHelper(helper);
    });
  }

  processNewContent(containerElement) {
    const inputPattern = /\{\{input:([^:}]+):([^:}]*):([^:}]*):?([^}]*)\}\}/g;
    
    if (containerElement.innerHTML) {
      let match;
      let updatedHTML = containerElement.innerHTML;
      
      while ((match = inputPattern.exec(containerElement.innerHTML)) !== null) {
        const [fullMatch, varName, placeholder, inputType, options] = match;
        const inputHTML = this.createInputHelper(varName.trim(), placeholder.trim(), inputType.trim(), options);
        updatedHTML = updatedHTML.replace(fullMatch, inputHTML);
      }
      
      if (updatedHTML !== containerElement.innerHTML) {
        containerElement.innerHTML = updatedHTML;
        
        setTimeout(() => {
          this.bindDynamicInputHelpers(containerElement);
        }, 50);
      }
    }
  }
  
  createInputHelper(varName, placeholder, inputType = 'text', options = '') {
    this.helperCounter++;
    const inputId = `input-${varName}-${this.helperCounter}`;
    let currentValue = this.vnEngine.getVariable(varName);
    
    if (currentValue === undefined || currentValue === null) {
      currentValue = this.getDefaultValue(inputType, options);
      this.vnEngine.setVariable(varName, currentValue);
    }
    
    let inputHTML;
    const normalizedType = inputType.toLowerCase();
    
    switch (normalizedType) {
      case 'text': {
        inputHTML = `<input type="text" id="${inputId}" data-var="${varName}" data-type="text" class="vn-input" placeholder="${placeholder}" value="${this.escapeHTML(currentValue)}" aria-label="${placeholder || varName}">`;
        break;
      }
        
      case 'number': {
        const numOptions = this.parseOptions(options);
        inputHTML = `<input type="number" id="${inputId}" data-var="${varName}" data-type="number" class="vn-input" placeholder="${placeholder}" value="${currentValue}" ${numOptions.min !== undefined ? `min="${numOptions.min}"` : ''} ${numOptions.max !== undefined ? `max="${numOptions.max}"` : ''} ${numOptions.step !== undefined ? `step="${numOptions.step}"` : ''} aria-label="${placeholder || varName}">`;
        break;
      } 
      case 'select': {
        const selectOptions = this.parseSelectOptions(options);
        const placeholderOption = (!currentValue && placeholder && selectOptions.length === 0) ? 
          `<option value="" disabled selected>${placeholder}</option>` : '';
        const optionsHTML = selectOptions.map(opt => 
          `<option value="${this.escapeHTML(opt.value)}" ${opt.value === currentValue ? 'selected' : ''}>${this.escapeHTML(opt.label)}</option>`
        ).join('');
        inputHTML = `<select id="${inputId}" data-var="${varName}" data-type="select" class="vn-select" aria-label="${placeholder || varName}">${placeholderOption}${optionsHTML}</select>`;
        break;
      }
      case 'checkbox': {
        inputHTML = `<label class="vn-input-group" for="${inputId}"><input type="checkbox" id="${inputId}" data-var="${varName}" data-type="checkbox" class="vn-input" ${currentValue ? 'checked' : ''} aria-describedby="${inputId}-desc"> <span id="${inputId}-desc">${placeholder}</span></label>`;
        break;
      }
        
      case 'textarea': {
        inputHTML = `<textarea id="${inputId}" data-var="${varName}" data-type="textarea" class="vn-textarea" placeholder="${placeholder}" aria-label="${placeholder || varName}" rows="3">${this.escapeHTML(currentValue)}</textarea>`;
        break;
      }
        
      case 'range': {
        const rangeOptions = this.parseOptions(options);
        const minVal = rangeOptions.min !== undefined ? rangeOptions.min : 0;
        const maxVal = rangeOptions.max !== undefined ? rangeOptions.max : 100;
        const stepVal = rangeOptions.step !== undefined ? rangeOptions.step : 1;
        const currentVal = currentValue || minVal;
        inputHTML = `
          <div class="vn-range-container">
            <input type="range" id="${inputId}" data-var="${varName}" data-type="range" class="vn-input" value="${currentVal}" min="${minVal}" max="${maxVal}" step="${stepVal}" aria-label="${placeholder || varName}" aria-describedby="${inputId}-value">
            <output id="${inputId}-value" class="vn-range-value" for="${inputId}">${currentVal}</output>
          </div>
        `;
        break;
      }
      case 'radio': {
        const radioOptions = this.parseSelectOptions(options);
        inputHTML = `<fieldset class="vn-radio-group" role="radiogroup" aria-labelledby="${inputId}-legend">
          <legend id="${inputId}-legend" class="vn-radio-legend">${placeholder}</legend>`;
        radioOptions.forEach((opt, index) => {
          const radioId = `${inputId}-${index}`;
          const checked = opt.value === currentValue ? 'checked' : '';
          inputHTML += `
            <label class="vn-radio-label" for="${radioId}">
              <input type="radio" id="${radioId}" name="${varName}" value="${this.escapeHTML(opt.value)}" data-var="${varName}" data-type="radio" class="vn-input vn-radio" ${checked}>
              <span class="vn-radio-text">${this.escapeHTML(opt.label)}</span>
            </label>
          `;
        });
        inputHTML += `</fieldset>`;
        break;
      }
      default: {
        inputHTML = `<input type="text" id="${inputId}" data-var="${varName}" data-type="text" class="vn-input" placeholder="${placeholder}" value="${this.escapeHTML(currentValue)}" aria-label="${placeholder || varName}">`;
      }
    }
    
    return `<div class="vn-input-container" role="group" aria-labelledby="${inputId}-label">
      ${placeholder && normalizedType !== 'checkbox' && normalizedType !== 'radio' ? `<label id="${inputId}-label" class="vn-input-label" for="${inputId}">${placeholder}</label>` : ''}
      ${inputHTML}
    </div>`;
  }
  
  createInputEntryForFeed(label, inputConfig) {
    if (!this.feedManager) {
      console.warn('⚠️ Feed Manager not available for input entry');
      return this.createInputHelper(inputConfig.varName, label, inputConfig.type, inputConfig.options);
    }
    
    return this.feedManager.addInputEntry(label, inputConfig);
  }

  parseOptions(optionsString) {
    const options = {};
    if (optionsString) {
      const pairs = optionsString.split(',');
      pairs.forEach(pair => {
        const [key, value] = pair.split(':');
        if (key && value) {
          const numValue = parseFloat(value.trim());
          options[key.trim()] = isNaN(numValue) ? value.trim() : numValue;
        }
      });
    }
    return options;
  }

  parseSelectOptions(optionsString) {
    const optionsStr = (typeof optionsString === 'string') ? optionsString : '';
    if (!optionsStr) return [];
    
    return optionsStr.split(',').map(opt => {
      const trimmed = opt.trim();
      if (trimmed.includes(':')) {
        const [value, label] = trimmed.split(':');
        return { value: value.trim(), label: label.trim() };
      } else {
        return { value: trimmed, label: trimmed };
      }
    });
  }

  bindDynamicInputHelpers(containerElement) {
    const inputs = containerElement.querySelectorAll('[data-var]:not([data-bound])');
    inputs.forEach(element => {
      const varName = element.getAttribute('data-var');
      const inputType = element.getAttribute('data-type') || 'text';
      
      if (!this.inputElements.has(element.id)) {
        this.bindInputElement(element, varName, inputType);
        element.setAttribute('data-bound', 'true');
      }
    });
  }

  bindInputElement(element, varName, inputType) {
    const updateValue = () => {
      const value = this.getInputValue(element, inputType);
      const oldValue = this.vnEngine.getVariable(varName);
      
      this.vnEngine.setVariable(varName, value);
      console.log(`📝 Variable updated: ${varName} = ${value}`);
      
      if (inputType === 'range') {
        const output = document.getElementById(`${element.id}-value`);
        if (output) {
          output.textContent = value;
        }
      }
      
      if (this.liveRegion && oldValue !== value) {
        this.liveRegion.textContent = `${varName} updated to ${value}`;
      }
      
      if (this.shouldValidate(element)) {
        this.validateAndUpdateElement(element, value);
      }
    };

    if (inputType === 'checkbox' || inputType === 'radio') {
      element.addEventListener('change', updateValue);
    } else {
      element.addEventListener('input', updateValue);
      element.addEventListener('change', updateValue);
    }
    
    if (inputType === 'range') {
      element.addEventListener('input', () => {
        const output = document.getElementById(`${element.id}-value`);
        if (output) {
          output.textContent = element.value;
        }
      });
    }

    this.inputElements.set(element.id, { element, varName, inputType });
    
    this.enhanceAccessibility(element, inputType);
  }
  
  enhanceAccessibility(element, inputType) {
    element.setAttribute('aria-describedby', `${element.id}-help`);
    
    const helpText = document.createElement('div');
    helpText.id = `${element.id}-help`;
    helpText.className = 'vn-input-help';
    helpText.style.cssText = 'font-size: 0.875rem; color: rgba(255, 255, 255, 0.6); margin-top: 4px;';
    
    switch (inputType) {
      case 'range':
        const min = element.getAttribute('min') || '0';
        const max = element.getAttribute('max') || '100';
        helpText.textContent = `Use arrow keys or drag to adjust value between ${min} and ${max}`;
        break;
      case 'select':
        helpText.textContent = 'Use arrow keys to navigate options, Enter to select';
        break;
      case 'checkbox':
        helpText.textContent = 'Press Space to toggle';
        break;
      case 'radio':
        helpText.textContent = 'Use arrow keys to select option';
        break;
      default:
        helpText.textContent = 'Press Tab to move to next field';
    }
    
    element.parentNode.appendChild(helpText);
  }
  
  shouldValidate(element) {
    return element.hasAttribute('required') || 
           element.type === 'email' || 
           element.type === 'url' || 
           element.type === 'number';
  }
  
  validateAndUpdateElement(element, value) {
    const isValid = this.validateInput(value, element);
    
    element.classList.toggle('vn-input-invalid', !isValid);
    element.classList.toggle('vn-input-valid', isValid);
    
    element.setAttribute('aria-invalid', !isValid);
    
    let errorElement = document.getElementById(`${element.id}-error`);
    
    if (!isValid) {
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = `${element.id}-error`;
        errorElement.className = 'vn-input-error';
        errorElement.style.cssText = 'color: #ff6b6b; font-size: 0.875rem; margin-top: 4px;';
        element.parentNode.appendChild(errorElement);
      }
      
      errorElement.textContent = this.getValidationMessage(element, value);
      element.setAttribute('aria-describedby', `${element.id}-help ${element.id}-error`);
    } else if (errorElement) {
      errorElement.remove();
      element.setAttribute('aria-describedby', `${element.id}-help`);
    }
  }
  
  getValidationMessage(element, value) {
    if (element.hasAttribute('required') && (!value || value.toString().trim() === '')) {
      return 'This field is required';
    }
    
    if (element.type === 'number') {
      const num = parseFloat(value);
      if (isNaN(num)) return 'Please enter a valid number';
      
      const min = parseFloat(element.getAttribute('min'));
      const max = parseFloat(element.getAttribute('max'));
      
      if (!isNaN(min) && num < min) return `Value must be at least ${min}`;
      if (!isNaN(max) && num > max) return `Value must be no more than ${max}`;
    }
    
    if (element.type === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
      return 'Please enter a valid email address';
    }
    
    if (element.type === 'url' && value && !/^https?:\/\/.+/.test(value)) {
      return 'Please enter a valid URL starting with http:// or https://';
    }
    
    return 'Invalid input';
  }

  registerInputHelper(config) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.bindInputHelper(config);
      });
    } else {
      this.bindInputHelper(config);
    }
  }

  bindInputHelper(config) {
    const element = document.getElementById(config.id);
    if (!element) {
      console.warn(`⚠️ Input element not found: ${config.id}`);
      return;
    }

    const updateValue = () => {
      const value = this.getInputValue(element, config.type);
      
      if (this.validationRules.has(config.id)) {
        const isValid = this.validateInput(value, config);
        if (!isValid) {
          element.classList.add('vn-input-invalid');
          return;
        } else {
          element.classList.remove('vn-input-invalid');
        }
      }
      
      this.vnEngine.setVariable(config.varName, value);
    };

    if (config.type === 'checkbox' || config.type === 'radio') {
      element.addEventListener('change', updateValue);
    } else {
      element.addEventListener('input', updateValue);
      element.addEventListener('change', updateValue);
    }

    const currentValue = this.vnEngine.getVariable(config.varName);
    if (currentValue !== undefined) {
      this.setInputValue(element, config, currentValue);
    }

    this.inputElements.set(config.id, { element, config });
  }

  getInputValue(element, inputType) {
    switch (inputType) {
      case 'checkbox':
        return element.checked;
      case 'number':
      case 'range':
        return parseFloat(element.value) || 0;
      case 'radio': {
        if (element.type === 'radio') {
          const radioGroup = document.querySelectorAll(`input[name="${element.name}"]:checked`);
          return radioGroup.length > 0 ? radioGroup[0].value : '';
        }
        return element.value;
      }
      default:
        return element.value;
    }
  }

  setInputValue(element, config, value) {
    switch (config.type) {
      case 'checkbox':
        element.checked = !!value;
        break;
      case 'radio': {
        const radioElement = document.querySelector(`input[name="${config.varName}"][value="${value}"]`);
        if (radioElement) radioElement.checked = true;
        break;
      }
      default:
        element.value = value;
        break;
    }
  }

  validateInput(value, config) {
    if (config.required && (!value || value.toString().trim() === '')) {
      return false;
    }

    if (config.type === 'number' || config.type === 'range') {
      const num = parseFloat(value);
      if (isNaN(num)) return false;
      if (config.min !== undefined && num < config.min) return false;
      if (config.max !== undefined && num > config.max) return false;
    }

    return true;
  }

  getDefaultValue(inputType, options = '') {
    const normalizedType = inputType.toLowerCase();
    
    switch (normalizedType) {
      case 'text':
      case 'textarea': {
        return '';
      }
      
      case 'number': {
        const numOptions = this.parseOptions(options);
        return numOptions.min !== undefined ? parseFloat(numOptions.min) : 0;
      }
      
      case 'select':
      case 'radio': {
        const selectOptions = this.parseSelectOptions(options);
        return selectOptions.length > 0 ? selectOptions[0].value : '';
      }
      
      case 'checkbox': {
        return false;
      }
      
      case 'range': {
        const rangeOptions = this.parseOptions(options);
        return rangeOptions.min !== undefined ? parseFloat(rangeOptions.min) : 0;
      }
      
      default: {
        return '';
      }
    }
  }
  
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  getAllBoundInputs() {
    return Array.from(this.inputElements.keys());
  }
  
  getInputStats() {
    return {
      totalInputs: this.inputElements.size,
      helpersCreated: this.helperCounter,
      validationRules: this.validationRules.size
    };
  }
  
  clearAllInputs() {
    this.inputElements.clear();
    this.validationRules.clear();
    this.helperCounter = 0;
  }

  /**
   * Register input helpers with VN Engine for Handlebars template processing
   */
  registerVNEngineHelpers() {
    if (!this.vnEngine || !this.vnEngine.registerHelper) {
      console.warn('⚠️ Cannot register input helpers: VN Engine not available');
      return;
    }

    this.vnEngine.registerHelper('input', (name, prompt, type, options, context) => {
      if (arguments.length === 4) {
        context = options;
        options = '';
      }
      
      const inputId = `input-${name}-${this.helperCounter++}`;
      
      const config = {
        id: inputId,
        varName: name,
        prompt: prompt || '',
        type: type || 'text',
        options: (typeof options === 'string') ? options : ''
      };
            
      setTimeout(() => {
        this.bindInputHelper(config);
      }, 200);
      
      const html = this.createInputHTML(config);
      
      if (this.vnEngine.getTemplateCapabilities && 
          this.vnEngine.getTemplateCapabilities().handlebars &&
          this.vnEngine.getTemplateCapabilities().handlebars.SafeString) {
        return new this.vnEngine.getTemplateCapabilities().handlebars.SafeString(html);
      }
      
      if (context && context.data && context.data.root && 
          context.data.root.constructor && 
          context.data.root.constructor.SafeString) {
        return new context.data.root.constructor.SafeString(html);
      }
      
      if (context && context.fn && context.fn.constructor && 
          context.fn.constructor.SafeString) {
        return new context.fn.constructor.SafeString(html);
      }
      
      return html;
    });

    this.vnEngine.registerHelper('textInput', (name, prompt, defaultValue) => {
      return this.vnEngine.helpers.input(name, prompt, 'text', defaultValue);
    });

    this.vnEngine.registerHelper('selectInput', (name, prompt, options) => {
      return this.vnEngine.helpers.input(name, prompt, 'select', options);
    });

    this.vnEngine.registerHelper('checkboxInput', (name, prompt) => {
      return this.vnEngine.helpers.input(name, prompt, 'checkbox', '');
    });

    this.vnEngine.registerHelper('numberInput', (name, prompt, min, max) => {
      const options = min !== undefined ? `min:${min}` + (max !== undefined ? `,max:${max}` : '') : '';
      return this.vnEngine.helpers.input(name, prompt, 'number', options);
    });

  }

  /**
   * Create HTML for input element based on configuration
   */
  createInputHTML(config) {
    const { id, varName, prompt, type, options } = config;
    
    switch (type) {
      case 'text':
      case 'email':
      case 'password':
        return `<div class="vn-input-group">
          <label for="${id}">${this.escapeHTML(prompt)}</label>
          <input type="${type}" id="${id}" name="${varName}" class="vn-input" placeholder="${this.escapeHTML(prompt)}" />
        </div>`;
        
      case 'number':
      case 'range':
        const numOptions = this.parseOptions(options);
        const min = numOptions.min !== undefined ? `min="${numOptions.min}"` : '';
        const max = numOptions.max !== undefined ? `max="${numOptions.max}"` : '';
        const step = numOptions.step !== undefined ? `step="${numOptions.step}"` : '';
        return `<div class="vn-input-group">
          <label for="${id}">${this.escapeHTML(prompt)}</label>
          <input type="${type}" id="${id}" name="${varName}" class="vn-input" ${min} ${max} ${step} />
        </div>`;
        
      case 'select':
        const selectOptions = this.parseSelectOptions(options);
        const optionsHTML = selectOptions.map(opt => 
          `<option value="${this.escapeHTML(opt.value)}">${this.escapeHTML(opt.text)}</option>`
        ).join('');
        return `<div class="vn-input-group">
          <label for="${id}">${this.escapeHTML(prompt)}</label>
          <select id="${id}" name="${varName}" class="vn-input">
            <option value="">Choose...</option>
            ${optionsHTML}
          </select>
        </div>`;
        
      case 'checkbox':
        return `<div class="vn-input-group vn-checkbox-group">
          <label for="${id}">
            <input type="checkbox" id="${id}" name="${varName}" class="vn-checkbox" />
            ${this.escapeHTML(prompt)}
          </label>
        </div>`;
        
      case 'radio':
        const radioOptions = this.parseSelectOptions(options);
        const radioHTML = radioOptions.map((opt, index) => 
          `<label for="${id}-${index}">
            <input type="radio" id="${id}-${index}" name="${varName}" value="${this.escapeHTML(opt.value)}" class="vn-radio" />
            ${this.escapeHTML(opt.text)}
          </label>`
        ).join('');
        return `<div class="vn-input-group vn-radio-group">
          <fieldset>
            <legend>${this.escapeHTML(prompt)}</legend>
            ${radioHTML}
          </fieldset>
        </div>`;
        
      default:
        return `<div class="vn-input-group">
          <label for="${id}">${this.escapeHTML(prompt)}</label>
          <input type="text" id="${id}" name="${varName}" class="vn-input" placeholder="${this.escapeHTML(prompt)}" />
        </div>`;
    }
  }
}
