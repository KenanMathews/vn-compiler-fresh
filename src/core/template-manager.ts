import type { ThemeConfig, TemplateOverrides, Logger } from "../types/compiler.ts";

/**
 * Template Manager v1 - Modular Client Runtime Approach
 * Uses external client runtime files for better organization and maintainability
 */
export class TemplateManager {
  private baseTheme: ThemeConfig;
  private templateOverrides: TemplateOverrides = {};
  private clientRuntimePath: string;
  private clientAssets: Record<string, string> = {};

  constructor(
    private logger: Logger,
    clientRuntimePath: string = "./client"
  ) {
    this.clientRuntimePath = clientRuntimePath;
    this.baseTheme = this.createBaseTheme();
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
   * Get the main game shell HTML template
   */
  getGameShellTemplate(): string {
    if (this.templateOverrides.gameShell) {
      return this.templateOverrides.gameShell;
    }

    return this.getDefaultGameShellTemplate();
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
   * Create the base theme configuration
   */
  private createBaseTheme(): ThemeConfig {
    return {
      name: 'base',
      css: '',
      variables: {
        '--primary-color': '#e92932',
        '--primary-dark': '#d11d26',
        '--secondary-color': '#472426',
        '--background-color': '#221112',
        '--text-color': '#ffffff',
        '--text-muted': '#a0aec0',
        '--border-color': '#3c2328',
        '--accent-color': '#e92932',
      },
    };
  }

  /**
   * Initialize the base theme
   */
  private initializeBaseTheme(): void {
    this.baseTheme = this.createBaseTheme();
  }

  /**
   * Update base theme with CSS loaded from external assets
   */
  private updateThemeWithLoadedAssets(): void {
    if (this.clientAssets['ASSETS_THEME_CSS']) {
      this.baseTheme.css = this.clientAssets['ASSETS_THEME_CSS'];
      this.logger.debug('✅ Base theme updated with loaded CSS asset');
    }
  }

  /**
   * Get the base theme (replaces getTheme method)
   */
  getTheme(): ThemeConfig {
    return this.baseTheme;
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
