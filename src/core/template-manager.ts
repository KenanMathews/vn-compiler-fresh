import type { ThemeConfig, TemplateOverrides, Logger } from "../types/compiler.ts";

/**
 * Built-in theme configurations
 */
interface BuiltInTheme {
  name: string;
  category: 'dark' | 'light';
  description: string;
  variables: Record<string, string>;
}

/**
 * Template Manager v1 - Modular Client Runtime Approach with Theme Support
 * Uses external client runtime files for better organization and maintainability
 */
export class TemplateManager {
  private baseTheme: ThemeConfig;
  private builtInThemes: Map<string, BuiltInTheme> = new Map();
  private currentThemeId: string = 'dark_historical';
  private templateOverrides: TemplateOverrides = {};
  private clientRuntimePath: string;
  private clientAssets: Record<string, string> = {};

  constructor(
    private logger: Logger,
    clientRuntimePath: string = "./client"
  ) {
    this.clientRuntimePath = clientRuntimePath;
    this.initializeBuiltInThemes();
    this.baseTheme = this.createBaseTheme();
  }

  /**
   * Initialize built-in themes
   */
  private initializeBuiltInThemes(): void {
    // Dark Historical
    this.builtInThemes.set('dark_historical', {
      name: 'Dark Historical',
      category: 'dark',
      description: 'Classic dark red theme for dramatic historical narratives',
      variables: {
        '--vn-bg-primary': '#221112',
        '--vn-bg-secondary': '#331a1b', 
        '--vn-bg-tertiary': '#472426',
        '--vn-bg-quaternary': '#5a2f32',
        '--vn-bg-accent': '#663336',
        
        '--vn-accent-primary': '#e92932',
        '--vn-accent-secondary': '#d11f28',
        '--vn-accent-tertiary': '#b91e26',
        
        '--vn-text-primary': '#ffffff',
        '--vn-text-secondary': 'rgba(255, 255, 255, 0.7)',
        '--vn-text-tertiary': 'rgba(255, 255, 255, 0.6)',
        '--vn-text-muted': 'rgba(255, 255, 255, 0.5)',
        
        '--vn-border-primary': 'rgba(255, 255, 255, 0.2)',
        '--vn-border-secondary': 'rgba(255, 255, 255, 0.15)',
        '--vn-border-accent': 'rgba(233, 41, 50, 0.3)',
        
        '--vn-overlay-light': 'rgba(255, 255, 255, 0.05)',
        '--vn-overlay-medium': 'rgba(255, 255, 255, 0.1)',
        '--vn-overlay-heavy': 'rgba(255, 255, 255, 0.15)',
        
        '--vn-shadow-primary': 'rgba(0, 0, 0, 0.3)',
        '--vn-shadow-heavy': 'rgba(0, 0, 0, 0.5)',
        '--vn-shadow-accent': 'rgba(233, 41, 50, 0.4)',
        
        '--vn-component-persistent': '#ff4757',
        '--vn-component-scene': '#2ed573',
        '--vn-success-color': '#22c55e',
        '--vn-error-color': '#ef4444',
        '--vn-warning-color': '#f59e0b',

        // Legacy variables for backwards compatibility
        '--primary-color': '#e92932',
        '--primary-dark': '#d11d26',
        '--secondary-color': '#472426',
        '--background-color': '#221112',
        '--text-color': '#ffffff',
        '--text-muted': 'rgba(255, 255, 255, 0.7)',
        '--border-color': 'rgba(255, 255, 255, 0.2)',
        '--accent-color': '#e92932'
      }
    });

    // Ocean Blue theme
    this.builtInThemes.set('ocean_blue', {
      name: 'Ocean Blue',
      category: 'dark',
      description: 'Cool blue theme for sci-fi and technological narratives',
      variables: {
        '--vn-bg-primary': '#0a1628',
        '--vn-bg-secondary': '#1e293b',
        '--vn-bg-tertiary': '#334155',
        '--vn-bg-quaternary': '#475569',
        '--vn-bg-accent': '#64748b',
        
        '--vn-accent-primary': '#0ea5e9',
        '--vn-accent-secondary': '#0284c7',
        '--vn-accent-tertiary': '#0369a1',
        
        '--vn-text-primary': '#f1f5f9',
        '--vn-text-secondary': 'rgba(241, 245, 249, 0.8)',
        '--vn-text-tertiary': 'rgba(241, 245, 249, 0.6)',
        '--vn-text-muted': 'rgba(241, 245, 249, 0.5)',
        
        '--vn-border-primary': 'rgba(14, 165, 233, 0.2)',
        '--vn-border-secondary': 'rgba(14, 165, 233, 0.15)',
        '--vn-border-accent': 'rgba(14, 165, 233, 0.4)',
        
        '--vn-overlay-light': 'rgba(14, 165, 233, 0.05)',
        '--vn-overlay-medium': 'rgba(14, 165, 233, 0.1)',
        '--vn-overlay-heavy': 'rgba(14, 165, 233, 0.15)',
        
        '--vn-shadow-primary': 'rgba(0, 0, 0, 0.4)',
        '--vn-shadow-heavy': 'rgba(0, 0, 0, 0.6)',
        '--vn-shadow-accent': 'rgba(14, 165, 233, 0.4)',
        
        '--vn-component-persistent': '#06b6d4',
        '--vn-component-scene': '#10b981',
        '--vn-success-color': '#22c55e',
        '--vn-error-color': '#ef4444',
        '--vn-warning-color': '#f59e0b',

        // Legacy variables
        '--primary-color': '#0ea5e9',
        '--primary-dark': '#0284c7',
        '--secondary-color': '#334155',
        '--background-color': '#0a1628',
        '--text-color': '#f1f5f9',
        '--text-muted': 'rgba(241, 245, 249, 0.7)',
        '--border-color': 'rgba(14, 165, 233, 0.2)',
        '--accent-color': '#0ea5e9'
      }
    });

    // Forest Green theme
    this.builtInThemes.set('forest_green', {
      name: 'Forest Green',
      category: 'dark',
      description: 'Natural green theme for adventure and nature stories',
      variables: {
        '--vn-bg-primary': '#0f1419',
        '--vn-bg-secondary': '#1a2e1a',
        '--vn-bg-tertiary': '#2d4a2d',
        '--vn-bg-quaternary': '#405a40',
        '--vn-bg-accent': '#4a5d4a',
        
        '--vn-accent-primary': '#10b981',
        '--vn-accent-secondary': '#059669',
        '--vn-accent-tertiary': '#047857',
        
        '--vn-text-primary': '#ecfdf5',
        '--vn-text-secondary': 'rgba(236, 253, 245, 0.8)',
        '--vn-text-tertiary': 'rgba(236, 253, 245, 0.6)',
        '--vn-text-muted': 'rgba(236, 253, 245, 0.5)',
        
        '--vn-border-primary': 'rgba(16, 185, 129, 0.2)',
        '--vn-border-secondary': 'rgba(16, 185, 129, 0.15)',
        '--vn-border-accent': 'rgba(16, 185, 129, 0.4)',
        
        '--vn-overlay-light': 'rgba(16, 185, 129, 0.05)',
        '--vn-overlay-medium': 'rgba(16, 185, 129, 0.1)',
        '--vn-overlay-heavy': 'rgba(16, 185, 129, 0.15)',
        
        '--vn-shadow-primary': 'rgba(0, 0, 0, 0.4)',
        '--vn-shadow-heavy': 'rgba(0, 0, 0, 0.6)',
        '--vn-shadow-accent': 'rgba(16, 185, 129, 0.4)',
        
        '--vn-component-persistent': '#34d399',
        '--vn-component-scene': '#60a5fa',
        '--vn-success-color': '#22c55e',
        '--vn-error-color': '#ef4444',
        '--vn-warning-color': '#f59e0b',

        // Legacy variables
        '--primary-color': '#10b981',
        '--primary-dark': '#059669',
        '--secondary-color': '#2d4a2d',
        '--background-color': '#0f1419',
        '--text-color': '#ecfdf5',
        '--text-muted': 'rgba(236, 253, 245, 0.7)',
        '--border-color': 'rgba(16, 185, 129, 0.2)',
        '--accent-color': '#10b981'
      }
    });

    // Mystical Purple theme
    this.builtInThemes.set('mystical_purple', {
      name: 'Mystical Purple',
      category: 'dark',
      description: 'Purple theme for fantasy and magical stories',
      variables: {
        '--vn-bg-primary': '#1a0b2e',
        '--vn-bg-secondary': '#2d1b69',
        '--vn-bg-tertiary': '#3730a3',
        '--vn-bg-quaternary': '#4338ca',
        '--vn-bg-accent': '#6366f1',
        
        '--vn-accent-primary': '#8b5cf6',
        '--vn-accent-secondary': '#7c3aed',
        '--vn-accent-tertiary': '#6d28d9',
        
        '--vn-text-primary': '#f3e8ff',
        '--vn-text-secondary': 'rgba(243, 232, 255, 0.8)',
        '--vn-text-tertiary': 'rgba(243, 232, 255, 0.6)',
        '--vn-text-muted': 'rgba(243, 232, 255, 0.5)',
        
        '--vn-border-primary': 'rgba(139, 92, 246, 0.2)',
        '--vn-border-secondary': 'rgba(139, 92, 246, 0.15)',
        '--vn-border-accent': 'rgba(139, 92, 246, 0.4)',
        
        '--vn-overlay-light': 'rgba(139, 92, 246, 0.05)',
        '--vn-overlay-medium': 'rgba(139, 92, 246, 0.1)',
        '--vn-overlay-heavy': 'rgba(139, 92, 246, 0.15)',
        
        '--vn-shadow-primary': 'rgba(0, 0, 0, 0.4)',
        '--vn-shadow-heavy': 'rgba(0, 0, 0, 0.6)',
        '--vn-shadow-accent': 'rgba(139, 92, 246, 0.4)',
        
        '--vn-component-persistent': '#a78bfa',
        '--vn-component-scene': '#34d399',
        '--vn-success-color': '#22c55e',
        '--vn-error-color': '#ef4444',
        '--vn-warning-color': '#f59e0b',

        // Legacy variables
        '--primary-color': '#8b5cf6',
        '--primary-dark': '#7c3aed',
        '--secondary-color': '#3730a3',
        '--background-color': '#1a0b2e',
        '--text-color': '#f3e8ff',
        '--text-muted': 'rgba(243, 232, 255, 0.7)',
        '--border-color': 'rgba(139, 92, 246, 0.2)',
        '--accent-color': '#8b5cf6'
      }
    });

    // Clean Light theme
    this.builtInThemes.set('clean_light', {
      name: 'Clean Light',
      category: 'light',
      description: 'Minimal light theme for educational and accessible content',
      variables: {
        '--vn-bg-primary': '#ffffff',
        '--vn-bg-secondary': '#f8fafc',
        '--vn-bg-tertiary': '#e2e8f0',
        '--vn-bg-quaternary': '#cbd5e1',
        '--vn-bg-accent': '#94a3b8',
        
        '--vn-accent-primary': '#0f172a',
        '--vn-accent-secondary': '#1e293b',
        '--vn-accent-tertiary': '#334155',
        
        '--vn-text-primary': '#0f172a',
        '--vn-text-secondary': 'rgba(15, 23, 42, 0.8)',
        '--vn-text-tertiary': 'rgba(15, 23, 42, 0.6)',
        '--vn-text-muted': 'rgba(15, 23, 42, 0.5)',
        
        '--vn-border-primary': 'rgba(15, 23, 42, 0.1)',
        '--vn-border-secondary': 'rgba(15, 23, 42, 0.05)',
        '--vn-border-accent': 'rgba(15, 23, 42, 0.2)',
        
        '--vn-overlay-light': 'rgba(15, 23, 42, 0.02)',
        '--vn-overlay-medium': 'rgba(15, 23, 42, 0.05)',
        '--vn-overlay-heavy': 'rgba(15, 23, 42, 0.1)',
        
        '--vn-shadow-primary': 'rgba(0, 0, 0, 0.1)',
        '--vn-shadow-heavy': 'rgba(0, 0, 0, 0.2)',
        '--vn-shadow-accent': 'rgba(15, 23, 42, 0.15)',
        
        '--vn-component-persistent': '#ef4444',
        '--vn-component-scene': '#22c55e',
        '--vn-success-color': '#16a34a',
        '--vn-error-color': '#dc2626',
        '--vn-warning-color': '#d97706',

        // Legacy variables
        '--primary-color': '#0f172a',
        '--primary-dark': '#1e293b',
        '--secondary-color': '#e2e8f0',
        '--background-color': '#ffffff',
        '--text-color': '#0f172a',
        '--text-muted': 'rgba(15, 23, 42, 0.7)',
        '--border-color': 'rgba(15, 23, 42, 0.1)',
        '--accent-color': '#0f172a'
      }
    });

    this.logger.debug(`🎨 Initialized ${this.builtInThemes.size} built-in themes`);
  }

  /**
   * Initialize template manager with base theme
   */
  initialize(): void {
    this.logger.debug("🎨 Initializing Template Manager v1...");
    
    this.initializeBaseTheme();
    
    this.logger.info("✅ Template Manager v1 initialized");
  }

  /**
   * Set the current theme by ID
   */
  setTheme(themeId: string): void {
    if (this.builtInThemes.has(themeId)) {
      this.currentThemeId = themeId;
      this.baseTheme = this.createThemeFromBuiltIn(themeId);
      this.logger.debug(`🎨 Theme set to: ${themeId}`);
    } else {
      this.logger.warn(`⚠️ Theme '${themeId}' not found, using fallback`);
      // Keep current theme
    }
  }

  /**
   * Set theme from metadata styles
   */
  setThemeFromMetadata(metadata: any): void {
    const themeId = metadata?.styles?.theme;
    if (themeId && typeof themeId === 'string') {
      this.setTheme(themeId);
    } else {
      this.logger.debug('📄 No theme specified in metadata, using default');
    }
  }

  /**
   * Get available theme IDs and info
   */
  getAvailableThemes(): Array<{id: string, name: string, category: string, description: string}> {
    return Array.from(this.builtInThemes.entries()).map(([id, theme]) => ({
      id,
      name: theme.name,
      category: theme.category,
      description: theme.description
    }));
  }

  /**
   * Get current theme ID
   */
  getCurrentThemeId(): string {
    return this.currentThemeId;
  }

  /**
   * Create theme from built-in theme configuration
   */
  private createThemeFromBuiltIn(themeId: string): ThemeConfig {
    const builtIn = this.builtInThemes.get(themeId);
    if (!builtIn) {
      return this.createBaseTheme();
    }

    return {
      name: builtIn.name,
      css: '', // Will be populated by external assets if available
      variables: { ...builtIn.variables }
    };
  }

  /**
   * Create the base theme configuration (fallback)
   */
  private createBaseTheme(): ThemeConfig {
    // Use dark_historical as the default base theme
    return this.createThemeFromBuiltIn('dark_historical');
  }

  /**
   * Initialize the base theme
   */
  private initializeBaseTheme(): void {
    this.baseTheme = this.createBaseTheme();
  }

  /**
   * Update theme with CSS loaded from external assets
   */
  private updateThemeWithLoadedAssets(): void {
    if (this.clientAssets['ASSETS_THEME_CSS']) {
      this.baseTheme.css = this.clientAssets['ASSETS_THEME_CSS'];
      this.logger.debug('✅ Theme updated with loaded CSS asset');
    }
  }

  /**
   * Get the current theme
   */
  getTheme(): ThemeConfig {
    return this.baseTheme;
  }

  /**
   * Generate CSS variables string for current theme
   */
  getThemeVariablesCSS(): string {
    const variables = Object.entries(this.baseTheme.variables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');
    
    return `:root {\n${variables}\n}`;
  }

  /**
   * Set client assets loaded by ClientBuilder
   */
  setClientAssets(assets: Record<string, string>): void {
    this.clientAssets = assets;
    this.logger.debug(`💼 Client assets loaded: ${Object.keys(assets).length} assets`);
    
    this.updateThemeWithLoadedAssets();
  }

  /**
   * Get the main game shell HTML template
   */
  getGameShellTemplate(): string {
    if (this.templateOverrides.gameShell) {
      return this.templateOverrides.gameShell;
    }

    return this.getDefaultGameShellTemplate();
  }

  /**
   * Get the default game shell template
   */
  getDefaultGameShellTemplate(): string {
    if (this.clientAssets && this.clientAssets['ASSETS_TEMPLATE_HTML']) {
      this.logger.debug('✅ Using loaded HTML template asset');
      return this.clientAssets['ASSETS_TEMPLATE_HTML'];
    }
    
    throw new Error('HTML template asset not loaded. External template.html file is required for compilation.');
  }

  /**
   * Apply theme variables to CSS content
   */
  applyThemeVariables(css: string, theme?: ThemeConfig): string {
    const themeToUse = theme || this.baseTheme;
    let result = css;
    
    for (const [variable, value] of Object.entries(themeToUse.variables)) {
      const regex = new RegExp(`var\\(${variable}\\)`, 'g');
      result = result.replace(regex, value as string);
    }
    
    return result;
  }
}