/**
 * Core types for VN Compiler
 */

export interface CompileOptions {
  /** Input YAML script file or content */
  input: string;
  /** Output HTML file path */
  output: string;
  /** Assets directory path */
  assetsDir?: string;
  /** Custom CSS file path */
  customCSS?: string;
  /** Custom JavaScript file path */
  customJS?: string;
  /** Whether to minify the output */
  minify?: boolean;
  /** Title for the generated game */
  title?: string;
  /** Additional metadata */
  metadata?: GameMetadata;
  /** Template overrides */
  templates?: TemplateOverrides;
  /** Development mode (includes debug info) */
  dev?: boolean;
}

export interface GameMetadata {
  title?: string;
  author?: string;
  description?: string;
  version?: string;
  created?: string;
  tags?: string[];
  [key: string]: any;
}

export interface CompileResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  warnings?: string[];
  stats?: CompilationStats;
}

export interface CompilationStats {
  sceneCount: number;
  assetCount: number;
  outputSize: number;
  compilationTime: number;
  templateEngine: 'handlebars' | 'simple';
}

export interface ProcessedAsset {
  key: string;
  name: string;
  path: string;
  type: 'image' | 'audio' | 'video' | 'unknown';
  size: number;
  data?: string;
  url?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
}

export interface TemplateOverrides {
  gameShell?: string;
  sceneContainer?: string;
  inputHelper?: string;
  choiceButton?: string;
  assetImage?: string;
  assetAudio?: string;
  assetVideo?: string;
}
import { DependencyConfig, YAMLDependencies } from './dependencies.ts';

export interface BundleOptions {
  title: string;
  customCSS?: string;
  customJS?: string;
  theme: ThemeConfig;
  assets: ProcessedAsset[];
  gameData: GameData;
  minify: boolean;
  metadata: GameMetadata;
  dependencies?: DependencyConfig[];
  yamlDependencies?: YAMLDependencies;
  bundleDependencies?: boolean;
}

export interface GameData {
  script: string | Record<string, unknown>;
  scenes: any[];
  assets: ProcessedAsset[];
  metadata: GameMetadata;
  components: ComponentHelperConfig[];
}

export interface InputHelperConfig {
  id: string;
  varName: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'range';
  placeholder?: string;
  defaultValue?: any;
  options?: string[] | { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  validation?: string;
  sceneId: string;
  instructionIndex: number;
}

export interface ThemeConfig {
  name: string;
  css: string;
  variables: Record<string, string>;
  customProperties?: Record<string, string>;
}

export interface HTMLGenerationOptions {
  template: string;
  title: string;
  css: string;
  javascript: string;
  metadata: GameMetadata;
  gameData: GameData;
  minify: boolean;
}

export interface CLIArgs {
  _: string[];
  output?: string;
  css?: string;
  js?: string;
  assets?: string;
  template?: 'basic' | 'interactive' | 'media-rich';
  config?: string;
  help?: boolean;
  version?: boolean;
  minify?: boolean;
  verbose?: boolean;
  watch?: boolean;
  "no-watch"?: boolean;
  port?: number;
  theme?: string;
  title?: string;
  dev?: boolean;
  directory?: string;
  author?: string;
  description?: string;
  cors?: string;
  workdir?: string;
}

export interface ProjectConfig {
  title: string;
  author?: string;
  description?: string;
  version: string;
  input: string;
  output: string;
  assetsDir?: string;
  theme: string;
  customCSS?: string;
  customJS?: string;
  minify: boolean;
  metadata?: Record<string, any>;
  templates?: TemplateOverrides;
}

export interface CompilerContext {
  options: CompileOptions;
  vnEngine: any;
  componentSystem: any;
  sceneManager: any;
  assetBundler: any;
  htmlGenerator: any;
  logger: Logger;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  verbose(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
  step(step: number, total: number, message: string): void;
  progress(current: number, total: number, message: string): void;
  custom(prefix: string, message: string, color?: string, ...args: any[]): void;
}

export interface InitProjectOptions {
  name: string;
  template: 'basic' | 'interactive' | 'media-rich';
  directory?: string;
  title?: string;
  author?: string;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  type: 'syntax' | 'reference' | 'asset' | 'template' | 'component';
  message: string;
  location?: {
    scene?: string;
    line?: number;
    column?: number;
  };
  scene?: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

/**
* Component Helper Configuration
*/
export interface ComponentHelperConfig {
id: string;                    // Unique component instance ID
componentName: string;         // Component class name (e.g., 'MapComponent')
scriptPath: string;           // Path to component file (e.g., './components/map.js')
cssPath?: string;             // Optional path to component CSS file (e.g., './components/map.css')
instanceId: string;           // User-defined instance name (e.g., 'worldMap')
config: Record<string, any>;  // Component configuration options
sceneId: string;              // Scene where component is used
instructionIndex: number;     // Position in scene instructions
}

/**
* VN Component Interface
*/
export interface VNComponent {
// Lifecycle methods
mount(container: HTMLElement): Promise<void> | void;
unmount(): Promise<void> | void;
update(config: Record<string, any>): Promise<void> | void;

// VN Engine integration
onGameStateChange?(state: any): void;
onSceneChange?(sceneId: string): void;

// Communication
emit(event: string, data: any): void;
}

/**
* Component Metadata
*/
export interface ComponentMetadata {
name: string;
instances: string[];          // List of instance IDs
scenes: string[];            // Scenes where component is used
scriptPath: string;
loaded: boolean;
mountCount: number;
}