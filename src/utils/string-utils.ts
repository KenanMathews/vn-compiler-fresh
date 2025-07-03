/**
 * Essential string helper functions for VN Compiler
 * Only the functions actually needed by the compiler
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHTML(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  /**
   * Generate a safe ID from a string (for HTML elements)
   */
  export function generateSafeId(input: string, prefix: string = ''): string {
    if (!input || typeof input !== 'string') return prefix || 'id';
    
    const safe = input
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return prefix ? `${prefix}-${safe}` : safe || 'id';
  }
  
  /**
   * Truncate text to a maximum length with ellipsis
   */
  export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    
    const truncated = text.slice(0, Math.max(0, maxLength - suffix.length));
    return truncated + suffix;
  }
  
  /**
   * Convert string to kebab-case (for CSS classes, file names)
   */
  export function kebabCase(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase()
      .replace(/^-+|-+$/g, '');
  }
  
  /**
   * Simple template replacement (for basic string interpolation)
   */
  export function simpleTemplate(template: string, variables: Record<string, any>): string {
    if (!template || typeof template !== 'string') return '';
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }
  
  /**
   * Count words in text (for reading time estimation)
   */
  export function countWords(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    
    const words = text.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }
  
  /**
   * Estimate reading time in minutes (assuming 200 words per minute)
   */
  export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
    const wordCount = countWords(text);
    return Math.ceil(wordCount / wordsPerMinute);
  }
  
  /**
   * Format reading time as human-readable string
   */
  export function formatReadingTime(text: string): string {
    const minutes = estimateReadingTime(text);
    
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes === 1) return '1 minute';
    if (minutes < 60) return `${minutes} minutes`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
  }
  
  /**
   * Remove extra whitespace and normalize line breaks
   */
  export function normalizeWhitespace(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }
  
  /**
   * Extract variables from template text (for analysis)
   */
  export function extractVariables(text: string): string[] {
    if (!text || typeof text !== 'string') return [];
    
    const matches = text.match(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g);
    if (!matches) return [];
    
    return [...new Set(matches.map(match => 
      match.slice(2, -2).trim()
    ))];
  }
  
  /**
   * Simple pluralization
   */
  export function pluralize(word: string, count: number): string {
    if (!word || typeof word !== 'string') return '';
    if (count === 1) return word;
    
    if (word.endsWith('y') && !word.endsWith('ay') && !word.endsWith('ey') && !word.endsWith('iy') && !word.endsWith('oy') && !word.endsWith('uy')) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
      return word + 'es';
    }
    
    return word + 's';
  }
  
  /**
   * Format file size for display
   */
  export function formatFileSize(bytes: number): string {
    if (typeof bytes !== 'number' || bytes < 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, unitIndex);
    const formattedSize = unitIndex === 0 ? size.toString() : size.toFixed(1);
    
    return `${formattedSize} ${units[unitIndex] || 'B'}`;
  }
  
  /**
   * Generate a simple hash from string (for cache keys, not cryptographic)
   */
  export function simpleHash(input: string): string {
    if (!input || typeof input !== 'string') return '0';
    
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Check if string contains only safe filename characters
   */
  export function isSafeFilename(filename: string): boolean {
    if (!filename || typeof filename !== 'string') return false;
    
    const unsafePattern = /[<>:"\/\\|?*\x00-\x1f]/;
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    
    return !unsafePattern.test(filename) && !reservedNames.test(filename);
  }
  
  /**
   * Create a safe filename from any string
   */
  export function toSafeFilename(input: string): string {
    if (!input || typeof input !== 'string') return 'untitled';
    
    let safe = input
      .replace(/[<>:"\/\\|?*\x00-\x1f]/g, '_')  // Replace unsafe chars
      .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, '_$1$2')
      .replace(/^[\s.]+|[\s.]+$/g, '')
      .replace(/_{2,}/g, '_');
    
    return safe || 'untitled';
  }
