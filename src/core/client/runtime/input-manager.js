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

  handleButtonClick(buttonElement, varName) {
    if (buttonElement.disabled || buttonElement.querySelector('.vn-button-spinner')) {
      return;
    }
    
    const action = buttonElement.getAttribute('data-action');
    const scene = buttonElement.getAttribute('data-scene');
    const setVar = buttonElement.getAttribute('data-set-var');
    const callFunc = buttonElement.getAttribute('data-call');
    const needsConfirm = buttonElement.getAttribute('data-confirm') === 'true';
    const confirmText = buttonElement.getAttribute('data-confirm-text');
    
    if (needsConfirm && !confirm(confirmText)) {
      return;
    }
    
    this.setButtonLoading(buttonElement, true);
    
    try {
      if (scene) {
        console.log(`🎬 Loading scene: ${scene}`);
        if (this.vnEngine.startScene) {
          this.vnEngine.startScene(scene);
        } else if (window.vnRuntime && window.vnRuntime.vnEngine.startScene) {
          window.vnRuntime.vnEngine.startScene(scene);
        }
      }
      
      if (setVar) {
        const [variable, value] = setVar.split(':');
        if (variable && value !== undefined) {
          console.log(`📝 Setting variable: ${variable} = ${value}`);
          this.vnEngine.setVariable(variable.trim(), value.trim());
        }
      }
      
      if (callFunc) {
        console.log(`📞 Calling function: ${callFunc}`);
        if (window[callFunc] && typeof window[callFunc] === 'function') {
          window[callFunc](buttonElement, varName);
        } else if (this.vnEngine[callFunc] && typeof this.vnEngine[callFunc] === 'function') {
          this.vnEngine[callFunc](buttonElement, varName);
        } else {
          console.warn(`⚠️ Function not found: ${callFunc}`);
        }
      }
      
      if (action) {
        console.log(`⚡ Executing action: ${action}`);
        window.dispatchEvent(new CustomEvent('vn-button-action', {
          detail: {
            action: action,
            button: buttonElement,
            varName: varName,
            element: buttonElement
          }
        }));
      }
      
      this.vnEngine.setVariable(varName, Date.now());
      
      if (this.liveRegion) {
        this.liveRegion.textContent = `${buttonElement.textContent} activated`;
      }
      
    } catch (error) {
      console.error('❌ Button action failed:', error);
    } finally {
      setTimeout(() => {
        this.setButtonLoading(buttonElement, false);
      }, 300);
    }
  }

  setButtonLoading(buttonElement, loading) {
    if (loading) {
      buttonElement.disabled = true;
      if (!buttonElement.querySelector('.vn-button-spinner')) {
        const spinner = document.createElement('span');
        spinner.className = 'vn-button-spinner';
        buttonElement.insertBefore(spinner, buttonElement.firstChild);
      }
      buttonElement.classList.add('vn-button-loading');
    } else {
      buttonElement.disabled = false;
      const spinner = buttonElement.querySelector('.vn-button-spinner');
      if (spinner) {
        spinner.remove();
      }
      buttonElement.classList.remove('vn-button-loading');
    }
  }
  
  enhanceAccessibility(element, inputType) {
    if (inputType === 'button') {
      return;
    }
    
    element.setAttribute('aria-describedby', `${element.id}-help`);
    
    const helpText = document.createElement('div');
    helpText.id = `${element.id}-help`;
    helpText.className = 'vn-input-help';
    helpText.style.cssText = 'font-size: 0.875rem; color: rgba(255, 255, 255, 0.6); margin-top: 4px;';
    
    switch (inputType) {
      case 'range': {
        const min = element.getAttribute('min') || '0';
        const max = element.getAttribute('max') || '100';
        helpText.textContent = `Use arrow keys or drag to adjust value between ${min} and ${max}`;
        break;
      }
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
        helpText.textContent = '';
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
      
      if (config.type === 'range') {
        const output = document.getElementById(`${element.id}-value`);
        if (output) {
          output.textContent = value;
        }
      }
      
      if (this.liveRegion && config.type !== 'button') {
        this.liveRegion.textContent = `${config.varName} updated to ${value}`;
      }
    };

    if (config.type === 'checkbox' || config.type === 'radio') {
      element.addEventListener('change', updateValue);
    } else if (config.type === 'button') {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleButtonClick(element, config.varName);
      });
    } else {
      element.addEventListener('input', updateValue);
      element.addEventListener('change', updateValue);
    }
    
    if (config.type === 'range') {
      element.addEventListener('input', () => {
        const output = document.getElementById(`${element.id}-value`);
        if (output) {
          output.textContent = element.value;
        }
      });
    }

    const currentValue = this.vnEngine.getVariable(config.varName);
    if (currentValue !== undefined) {
      this.setInputValue(element, config, currentValue);
    }

    this.inputElements.set(config.id, { element, config });
    
    //this.enhanceAccessibility(element, config.type);
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
      case 'button':
        if (value && element.disabled) {
          element.disabled = false;
        }
        break;
      default:
        if (element.value !== undefined) {
          element.value = value;
        }
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

  getButtonClasses(buttonOptions) {
    const classes = ['vn-button'];
    
    switch (buttonOptions.type) {
      case 'primary':
        classes.push('vn-button-primary');
        break;
      case 'secondary':
        classes.push('vn-button-secondary');
        break;
      case 'menu':
        classes.push('vn-menu-button');
        break;
      case 'choice':
        classes.push('vn-choice-button');
        break;
      case 'custom':
        break;
      default:
        classes.push('vn-button-primary');
    }
    
    if (buttonOptions.size === 'large') {
      classes.push('vn-button-large');
    }
    
    // Add any custom classes
    if (buttonOptions.className) {
      classes.push(...buttonOptions.className.split(' '));
    }
    
    return classes.join(' ');
  }


  getIconHTML(icon) {
    if (icon.startsWith('&#') || icon.length === 1) {
      return `<span class="vn-button-icon">${icon}</span>`;
    } else if (icon.includes('<svg')) {
      return icon;
    } else {
      return `<i class="vn-button-icon ${icon}"></i>`;
    }
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
            
      // Use DOM observer to bind input helper when element is ready
      if (window.domObserver) {
        window.domObserver.waitForElementById(config.id, () => {
          this.bindInputHelper(config);
        });
      } else {
        // Fallback to requestAnimationFrame if DOM observer not available
        const checkForInput = () => {
          const inputElement = document.getElementById(config.id);
          if (inputElement) {
            this.bindInputHelper(config);
          } else {
            requestAnimationFrame(checkForInput);
          }
        };
        requestAnimationFrame(checkForInput);
      }
      
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
    const handlebars = this.vnEngine.templateManager.handlebars;
    this.vnEngine.registerHelper('textInput', (name, prompt, defaultValue) => {
      return handlebars.helpers.input(name, prompt, 'text', defaultValue);
    });

    this.vnEngine.registerHelper('selectInput', (name, prompt, options) => {
      return handlebars.helpers.input(name, prompt, 'select', options);
    });

    this.vnEngine.registerHelper('checkboxInput', (name, prompt) => {
      return handlebars.helpers.input(name, prompt, 'checkbox', '');
    });

    this.vnEngine.registerHelper('numberInput', (name, prompt, min, max) => {
      const options = min !== undefined ? `min:${min}` + (max !== undefined ? `,max:${max}` : '') : '';
      return handlebars.helpers.input(name, prompt, 'number', options);
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
      case 'range':{
        const numOptions = this.parseOptions(options);
        const min = numOptions.min !== undefined ? `min="${numOptions.min}"` : '';
        const max = numOptions.max !== undefined ? `max="${numOptions.max}"` : '';
        const step = numOptions.step !== undefined ? `step="${numOptions.step}"` : '';
        return `<div class="vn-input-group">
          <label for="${id}">${this.escapeHTML(prompt)}</label>
          <input type="${type}" id="${id}" name="${varName}" class="vn-input" ${min} ${max} ${step} />
        </div>`;
      }
      case 'select':{
        const selectOptions = this.parseSelectOptions(options);
        const optionsHTML = selectOptions.map(opt => 
          `<option value="${this.escapeHTML(opt.value)}">${this.escapeHTML(opt.label)}</option>`
        ).join('');
        return `<div class="vn-input-group">
          <label for="${id}">${this.escapeHTML(prompt)}</label>
          <select id="${id}" name="${varName}" class="vn-select">
            <option value="">Choose...</option>
            ${optionsHTML}
          </select>
        </div>`;
      }
      case 'checkbox':
        return `<div class="vn-input-group vn-checkbox-group">
          <label for="${id}">
            <input type="checkbox" id="${id}" name="${varName}" class="vn-checkbox" />
            ${this.escapeHTML(prompt)}
          </label>
        </div>`;
        
      case 'radio':{
        const radioOptions = this.parseSelectOptions(options);
        const radioHTML = radioOptions.map((opt, index) => 
          `<label for="${id}-${index}">
            <input type="radio" id="${id}-${index}" name="${varName}" value="${this.escapeHTML(opt.value)}" class="vn-radio" />
            ${this.escapeHTML(opt.label)}
          </label>`
        ).join('');
        return `<div class="vn-input-group vn-radio-group">
          <fieldset>
            <legend>${this.escapeHTML(prompt)}</legend>
            ${radioHTML}
          </fieldset>
        </div>`;
      }
      case 'button': {
        const buttonOptions = this.parseOptions(options); // Use existing parseOptions method
        const buttonClasses = this.getButtonClasses(buttonOptions);
        const iconHTML = buttonOptions.icon ? this.getIconHTML(buttonOptions.icon) : '';
        const loadingHTML = buttonOptions.loading === 'true' ? '<span class="vn-button-spinner"></span>' : '';
        
        return `<button type="button" id="${id}" 
          data-var="${varName}" 
          data-type="button" 
          class="${buttonClasses}"
          data-action="${buttonOptions.action || ''}"
          data-scene="${buttonOptions.scene || ''}"
          data-set-var="${buttonOptions.setVar || ''}"
          data-call="${buttonOptions.call || ''}"
          data-confirm="${buttonOptions.confirm || 'false'}"
          data-confirm-text="${buttonOptions.confirmText || 'Are you sure?'}"
          ${buttonOptions.disabled === 'true' ? 'disabled' : ''}
          ${buttonOptions.ariaLabel ? `aria-label="${this.escapeHTML(buttonOptions.ariaLabel)}"` : `aria-label="${this.escapeHTML(prompt) || varName}"`}
          ${buttonOptions.style ? `style="${buttonOptions.style}"` : ''}
        >
          ${loadingHTML}${iconHTML}<span class="vn-button-text">${this.escapeHTML(prompt)}</span>
        </button>`;
        break;
      }
        
      default:
        return `<div class="vn-input-group">
          <label for="${id}">${this.escapeHTML(prompt)}</label>
          <input type="text" id="${id}" name="${varName}" class="vn-input" placeholder="${this.escapeHTML(prompt)}" />
        </div>`;
    }
  }
}
