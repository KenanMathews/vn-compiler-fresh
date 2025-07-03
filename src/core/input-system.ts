import type { InputHelperConfig, Logger } from "../types/compiler.ts";

/**
 * VN Input Helper System
 * Extracts and manages input helpers from YAML scripts
 */
export class VNInputHelperSystem {
  private helpers: Map<string, InputHelperConfig> = new Map();
  private helperCounter = 0;

  constructor(
    private vnEngine: any,
    private logger: Logger
  ) {}

  /**
   * Extract input helpers from parsed scenes
   */
  extractInputHelpers(scenes: any[]): InputHelperConfig[] {
    this.logger.debug("🔍 Extracting input helpers from scenes...");
    
    const helpers: InputHelperConfig[] = [];
    
    for (const scene of scenes) {
      const sceneHelpers = this.extractFromScene(scene);
      helpers.push(...sceneHelpers);
    }
    
    this.logger.info(`📝 Found ${helpers.length} input helpers`);
    return helpers;
  }

  /**
   * Register input helpers with VN Engine
   */
  registerInputHelpers(): void {
    this.logger.debug("📋 Registering input helpers with VN Engine...");
    
    this.vnEngine.registerHelper('input', this.createInputHelper.bind(this));
    
    this.vnEngine.handlebars.registerHelper('textInput', this.createTextInputHelper.bind(this));
    this.vnEngine.handlebars.registerHelper('numberInput', this.createNumberInputHelper.bind(this));
    this.vnEngine.handlebars.registerHelper('selectInput', this.createSelectInputHelper.bind(this));
    this.vnEngine.handlebars.registerHelper('checkboxInput', this.createCheckboxInputHelper.bind(this));
    this.vnEngine.handlebars.registerHelper('radioInput', this.createRadioInputHelper.bind(this));
    this.vnEngine.handlebars.registerHelper('textareaInput', this.createTextareaInputHelper.bind(this));
    this.vnEngine.handlebars.registerHelper('rangeInput', this.createRangeInputHelper.bind(this));
    
    this.logger.info("✅ Input helpers registered with VN Engine");
  }

  /**
   * Extract input helpers from a single scene
   */
  private extractFromScene(scene: any): InputHelperConfig[] {
    const helpers: InputHelperConfig[] = [];
    
    if (!scene.instructions) return helpers;
    
    for (let i = 0; i < scene.instructions.length; i++) {
      const instruction = scene.instructions[i];
      const instructionHelpers = this.extractFromInstruction(instruction, scene.name, i);
      helpers.push(...instructionHelpers);
    }
    
    return helpers;
  }

  /**
   * Extract input helpers from a single instruction
   */
  private extractFromInstruction(instruction: any, sceneId: string, instructionIndex: number): InputHelperConfig[] {
    const helpers: InputHelperConfig[] = [];
    
    if (instruction.text) {
      const textHelpers = this.extractFromText(instruction.text, sceneId, instructionIndex);
      helpers.push(...textHelpers);
    }
    
    if (instruction.speaker) {
      const speakerHelpers = this.extractFromText(instruction.speaker, sceneId, instructionIndex);
      helpers.push(...speakerHelpers);
    }
    
    if (instruction.choices) {
      for (const choice of instruction.choices) {
        if (choice.text) {
          const choiceHelpers = this.extractFromText(choice.text, sceneId, instructionIndex);
          helpers.push(...choiceHelpers);
        }
      }
    }
    
    if (instruction.type === 'conditional') {
      if (instruction.then) {
        for (let i = 0; i < instruction.then.length; i++) {
          const thenHelpers = this.extractFromInstruction(instruction.then[i], sceneId, instructionIndex);
          helpers.push(...thenHelpers);
        }
      }
      if (instruction.else) {
        for (let i = 0; i < instruction.else.length; i++) {
          const elseHelpers = this.extractFromInstruction(instruction.else[i], sceneId, instructionIndex);
          helpers.push(...elseHelpers);
        }
      }
    }
    
    return helpers;
  }

  /**
   * Extract input helpers from text using regex
   */
  private extractFromText(text: string, sceneId: string, instructionIndex: number): InputHelperConfig[] {
    const helpers: InputHelperConfig[] = [];
    
    const inputRegex = /\{\{input:([^:}]+):([^:}]*):([^:}]*):?([^}]*)\}\}/g;
    
    let match;
    while ((match = inputRegex.exec(text)) !== null) {
      const [fullMatch, varName, placeholder, type, options] = match;
      
      const helper: InputHelperConfig = {
        id: this.generateHelperId(varName, sceneId),
        varName: varName.trim(),
        type: this.normalizeInputType(type.trim()),
        placeholder: placeholder.trim() || undefined,
        sceneId,
        instructionIndex
      };
      
      if (options && options.trim()) {
        this.parseInputOptions(helper, options.trim());
      }
      
      helpers.push(helper);
      this.helpers.set(helper.id, helper);
      
      this.logger.debug(`📝 Found input helper: ${helper.varName} (${helper.type}) in ${sceneId}`);
    }
    
    return helpers;
  }

  /**
   * Generate unique ID for input helper
   */
  private generateHelperId(varName: string, sceneId: string): string {
    this.helperCounter++;
    return `input-${varName}-${sceneId}-${this.helperCounter}`;
  }

  /**
   * Normalize input type to supported types
   */
  private normalizeInputType(type: string): InputHelperConfig['type'] {
    const lowerType = type.toLowerCase();
    
    switch (lowerType) {
      case 'text':
      case 'string':
        return 'text';
      case 'number':
      case 'num':
      case 'int':
      case 'integer':
        return 'number';
      case 'select':
      case 'dropdown':
      case 'choice':
        return 'select';
      case 'checkbox':
      case 'check':
      case 'bool':
      case 'boolean':
        return 'checkbox';
      case 'radio':
        return 'radio';
      case 'textarea':
      case 'multiline':
        return 'textarea';
      case 'range':
      case 'slider':
        return 'range';
      default:
        this.logger.warn(`⚠️  Unknown input type '${type}', defaulting to 'text'`);
        return 'text';
    }
  }

  /**
   * Parse input options for select, radio, and range inputs
   */
  private parseInputOptions(helper: InputHelperConfig, options: string): void {
    try {
      if (helper.type === 'select' || helper.type === 'radio') {
        const optionPairs = options.split(',').map(opt => opt.trim());
        helper.options = optionPairs.map(pair => {
          if (pair.includes(':')) {
            const [value, label] = pair.split(':');
            return { value: value.trim(), label: label.trim() };
          } else {
            return { value: pair, label: pair };
          }
        });
      } else if (helper.type === 'range') {
        const rangePairs = options.split(',').map(opt => opt.trim());
        for (const pair of rangePairs) {
          if (pair.includes(':')) {
            const [key, value] = pair.split(':');
            const numValue = parseFloat(value.trim());
            if (!isNaN(numValue)) {
              switch (key.trim().toLowerCase()) {
                case 'min':
                  helper.min = numValue;
                  break;
                case 'max':
                  helper.max = numValue;
                  break;
                case 'step':
                  helper.step = numValue;
                  break;
              }
            }
          }
        }
      } else if (helper.type === 'text' || helper.type === 'number') {
        if (options.toLowerCase().includes('required')) {
          helper.required = true;
        }
      }
    } catch (error) {
      const errorString = error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️  Failed to parse options for ${helper.id}: ${errorString}`);
    }
  }

  /**
   * Main input helper that processes colon syntax
   */
  private createInputHelper(params: string): string {
    const parts = params.split(':');
    if (parts.length < 3) {
      this.logger.warn(`⚠️  Invalid input helper syntax: ${params}`);
      return `<!-- Invalid input syntax: ${params} -->`;
    }
    
    const [varName, placeholder, type, ...optionParts] = parts;
    const options = optionParts.join(':');
    
    const config: Partial<InputHelperConfig> = {
      id: this.generateHelperId(varName.trim(), 'runtime'),
      varName: varName.trim(),
      type: this.normalizeInputType(type.trim()),
      placeholder: placeholder.trim() || undefined,
      sceneId: 'runtime',
      instructionIndex: 0
    };
    
    if (options) {
      this.parseInputOptions(config as InputHelperConfig, options);
    }
    
    return this.generateInputHTML(config as InputHelperConfig);
  }

  /**
   * Generate HTML for an input helper
   */
  private generateInputHTML(config: InputHelperConfig): string {
    const baseAttributes = `
      id="${config.id}" 
      name="${config.varName}" 
      data-var="${config.varName}"
      data-helper-type="${config.type}"
      class="vn-input"
    `.trim();
    
    switch (config.type) {
      case 'text':
        return `<input type="text" ${baseAttributes} placeholder="${config.placeholder || ''}" ${config.required ? 'required' : ''}>`;
        
      case 'number':
        return `<input type="number" ${baseAttributes} placeholder="${config.placeholder || ''}" ${config.min !== undefined ? `min="${config.min}"` : ''} ${config.max !== undefined ? `max="${config.max}"` : ''} ${config.step !== undefined ? `step="${config.step}"` : ''} ${config.required ? 'required' : ''}>`;
        
      case 'select': {
        const selectOptions = (config.options || []).map(opt => {
          if (typeof opt === 'string') {
            return `<option value="${this.escapeHTML(opt)}">${this.escapeHTML(opt)}</option>`;
          } else {
            return `<option value="${this.escapeHTML(String(opt.value))}">${this.escapeHTML(opt.label)}</option>`;
          }
        }).join('');
        return `<select ${baseAttributes} class="vn-select">${selectOptions}</select>`;
      }
        
      case 'checkbox':
        return `<label class="vn-input-group"><input type="checkbox" ${baseAttributes}> ${config.placeholder || config.varName}</label>`;
        
      case 'radio': {
        const radioOptions = (config.options || []).map((opt, index) => {
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          return `<label class="vn-radio-option"><input type="radio" name="${config.varName}" value="${this.escapeHTML(String(optValue))}" data-var="${config.varName}" ${index === 0 ? 'checked' : ''}> ${this.escapeHTML(optLabel)}</label>`;
        }).join('');
        return `<div class="vn-radio-group" id="${config.id}">${radioOptions}</div>`;
      }
        
      case 'textarea':
        return `<textarea ${baseAttributes} class="vn-textarea" placeholder="${config.placeholder || ''}" ${config.required ? 'required' : ''}></textarea>`;
        
      case 'range':
        return `<input type="range" ${baseAttributes} ${config.min !== undefined ? `min="${config.min}"` : 'min="0"'} ${config.max !== undefined ? `max="${config.max}"` : 'max="100"'} ${config.step !== undefined ? `step="${config.step}"` : 'step="1"'}>`;
        
      default:
        return `<!-- Unsupported input type: ${config.type} -->`;
    }
  }

  /**
   * Specific input type helpers
   */
  private createTextInputHelper(varName: string, placeholder = '', required = false): string {
    const config: InputHelperConfig = {
      id: this.generateHelperId(varName, 'runtime'),
      varName,
      type: 'text',
      placeholder,
      required,
      sceneId: 'runtime',
      instructionIndex: 0
    };
    return this.generateInputHTML(config);
  }

  private createNumberInputHelper(varName: string, placeholder = '', min?: number, max?: number, step?: number): string {
    const config: InputHelperConfig = {
      id: this.generateHelperId(varName, 'runtime'),
      varName,
      type: 'number',
      placeholder,
      min,
      max,
      step,
      sceneId: 'runtime',
      instructionIndex: 0
    };
    return this.generateInputHTML(config);
  }

  private createSelectInputHelper(varName: string, options: string[] = []): string {
    const config: InputHelperConfig = {
      id: this.generateHelperId(varName, 'runtime'),
      varName,
      type: 'select',
      options: options.map(opt => ({ value: opt, label: opt })),
      sceneId: 'runtime',
      instructionIndex: 0
    };
    return this.generateInputHTML(config);
  }

  private createCheckboxInputHelper(varName: string, label = ''): string {
    const config: InputHelperConfig = {
      id: this.generateHelperId(varName, 'runtime'),
      varName,
      type: 'checkbox',
      placeholder: label || varName,
      sceneId: 'runtime',
      instructionIndex: 0
    };
    return this.generateInputHTML(config);
  }

  private createRadioInputHelper(varName: string, options: string[] = []): string {
    const config: InputHelperConfig = {
      id: this.generateHelperId(varName, 'runtime'),
      varName,
      type: 'radio',
      options: options.map(opt => ({ value: opt, label: opt })),
      sceneId: 'runtime',
      instructionIndex: 0
    };
    return this.generateInputHTML(config);
  }

  private createTextareaInputHelper(varName: string, placeholder = ''): string {
    const config: InputHelperConfig = {
      id: this.generateHelperId(varName, 'runtime'),
      varName,
      type: 'textarea',
      placeholder,
      sceneId: 'runtime',
      instructionIndex: 0
    };
    return this.generateInputHTML(config);
  }

  private createRangeInputHelper(varName: string, min = 0, max = 100, step = 1): string {
    const config: InputHelperConfig = {
      id: this.generateHelperId(varName, 'runtime'),
      varName,
      type: 'range',
      min,
      max,
      step,
      sceneId: 'runtime',
      instructionIndex: 0
    };
    return this.generateInputHTML(config);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
