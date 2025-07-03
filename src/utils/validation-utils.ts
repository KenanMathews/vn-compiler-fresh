/**
 * Validation utilities for VN Compiler
 * Simple validation helpers used throughout the application
 */

/**
 * Check if a string is a valid scene name
 */
export function isValidSceneName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    
    return /^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(name);
  }
  
  /**
   * Check if a string is a valid variable name
   */
  export function isValidVariableName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    
    return /^[a-zA-Z_][a-zA-Z0-9_.]{0,99}$/.test(name);
  }
  
  /**
   * Check if a string contains valid YAML syntax (basic check)
   */
  export function hasValidYAMLSyntax(content: string): { valid: boolean; error?: string } {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Content is empty or not a string' };
    }
  
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      if (line.includes('\t')) {
        return { valid: false, error: `Line ${lineNum}: YAML should use spaces, not tabs` };
      }
      
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;
      
      if (singleQuotes % 2 !== 0) {
        return { valid: false, error: `Line ${lineNum}: Unmatched single quote` };
      }
      
      if (doubleQuotes % 2 !== 0) {
        return { valid: false, error: `Line ${lineNum}: Unmatched double quote` };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Check if input helper syntax is valid
   */
  export function isValidInputHelper(helperText: string): { valid: boolean; error?: string } {
    const inputPattern = /\{\{input:([^:}]+):([^:}]*):([^:}]*):?([^}]*)\}\}/;
    const match = helperText.match(inputPattern);
    
    if (!match) {
      return { valid: false, error: 'Invalid input helper syntax' };
    }
    
    const [, varName, placeholder, type, options] = match;
    
    if (!isValidVariableName(varName.trim())) {
      return { valid: false, error: `Invalid variable name: ${varName}` };
    }
    
    const validTypes = ['text', 'number', 'select', 'checkbox', 'radio', 'textarea', 'range'];
    const normalizedType = type.trim().toLowerCase();
    
    if (normalizedType && !validTypes.includes(normalizedType)) {
      return { valid: false, error: `Invalid input type: ${type}. Must be one of: ${validTypes.join(', ')}` };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if asset reference is valid
   */
  export function isValidAssetReference(assetRef: string): boolean {
    if (!assetRef || typeof assetRef !== 'string') return false;
    
    return /^[a-zA-Z0-9_-]+$/.test(assetRef);
  }
  
  /**
   * Check if choice syntax is valid
   */
  export function isValidChoice(choice: any): { valid: boolean; error?: string } {
    if (!choice || typeof choice !== 'object') {
      return { valid: false, error: 'Choice must be an object' };
    }
    
    if (!choice.text || typeof choice.text !== 'string') {
      return { valid: false, error: 'Choice must have a text property' };
    }
    
    if (choice.text.length === 0) {
      return { valid: false, error: 'Choice text cannot be empty' };
    }
    
    if (choice.text.length > 200) {
      return { valid: false, error: 'Choice text is too long (max 200 characters)' };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if action syntax is valid
   */
  export function isValidAction(action: any): { valid: boolean; error?: string } {
    if (!action || typeof action !== 'object') {
      return { valid: false, error: 'Action must be an object' };
    }
    
    if (!action.type || typeof action.type !== 'string') {
      return { valid: false, error: 'Action must have a type property' };
    }
    
    const validActionTypes = ['setVar', 'addVar', 'setFlag', 'clearFlag', 'addToList', 'addTime'];
    
    if (!validActionTypes.includes(action.type)) {
      return { valid: false, error: `Invalid action type: ${action.type}. Must be one of: ${validActionTypes.join(', ')}` };
    }
    
    switch (action.type) {
      case 'setVar':
      case 'addVar':
        if (!action.key || typeof action.key !== 'string') {
          return { valid: false, error: `${action.type} action must have a key property` };
        }
        if (!isValidVariableName(action.key)) {
          return { valid: false, error: `Invalid variable name: ${action.key}` };
        }
        break;
        
      case 'setFlag':
      case 'clearFlag':
        if (!action.flag || typeof action.flag !== 'string') {
          return { valid: false, error: `${action.type} action must have a flag property` };
        }
        break;
        
      case 'addToList':
        if (!action.list || typeof action.list !== 'string') {
          return { valid: false, error: 'addToList action must have a list property' };
        }
        if (action.item === undefined) {
          return { valid: false, error: 'addToList action must have an item property' };
        }
        break;
        
      case 'addTime':
        if (typeof action.minutes !== 'number') {
          return { valid: false, error: 'addTime action must have a numeric minutes property' };
        }
        break;
    }
    
    return { valid: true };
  }
  
  /**
   * Check if condition syntax is valid (basic check)
   */
  export function isValidCondition(condition: string): { valid: boolean; error?: string } {
    if (!condition || typeof condition !== 'string') {
      return { valid: false, error: 'Condition must be a non-empty string' };
    }
    
    if (condition.trim().length === 0) {
      return { valid: false, error: 'Condition cannot be empty' };
    }
    
    let depth = 0;
    for (const char of condition) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth < 0) {
        return { valid: false, error: 'Unmatched closing parenthesis in condition' };
      }
    }
    
    if (depth > 0) {
      return { valid: false, error: 'Unmatched opening parenthesis in condition' };
    }
    
    return { valid: true };
  }
  
  /**
   * Sanitize a string for safe use in HTML attributes
   */
  export function sanitizeForHTML(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  /**
   * Check if a file extension is supported for assets
   */
  export function isSupportedAssetType(filename: string): boolean {
    if (!filename || typeof filename !== 'string') return false;
    
    const ext = filename.toLowerCase().split('.').pop();
    if (!ext) return false;
    
    const supportedTypes = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
      'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac',
      'mp4', 'webm', 'avi', 'mov', 'wmv', 'flv'
    ];
    
    return supportedTypes.includes(ext);
  }
  
  /**
   * Get asset type from filename
   */
  export function getAssetType(filename: string): 'image' | 'audio' | 'video' | 'unknown' {
    if (!filename || typeof filename !== 'string') return 'unknown';
    
    const ext = filename.toLowerCase().split('.').pop();
    if (!ext) return 'unknown';
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
    const videoTypes = ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv'];
    
    if (imageTypes.includes(ext)) return 'image';
    if (audioTypes.includes(ext)) return 'audio';
    if (videoTypes.includes(ext)) return 'video';
    
    return 'unknown';
  }
