// types/dependencies.ts

export interface DependencyConfig {
  name: string;
  version?: string;
  url?: string;
  type: 'cdn' | 'bundle' | 'inline' | 'preset';
  format?: 'js' | 'css';
  priority?: number;
  integrity?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
  defer?: boolean;
  async?: boolean;
  module?: boolean;
  nomodule?: boolean;
  condition?: string;
  content?: string;
  preset?: string;
  minify?: boolean;
}

export interface DependencyPreset {
  name: string;
  description: string;
  category: 'ui' | 'audio' | 'graphics' | 'analytics' | 'utils' | 'custom';
  dependencies: DependencyConfig[];
}

export interface BundledDependency {
  name: string;
  content: string;
  size: number;
  minified: boolean;
  originalUrl?: string;
  hash?: string;
}

export interface DependencyStats {
  total: number;
  bundled: number;
  cdn: number;
  inline: number;
  presets: number;
  totalBundledSize: number;
  cdnCached: number;
}

export interface DependencyManifest {
  dependencies: DependencyConfig[];
  bundled: BundledDependency[];
  presets: DependencyPreset[];
  stats: DependencyStats;
  generatedAt: string;
}

export interface DependencyManagerOptions {
  enableCache?: boolean;
  cacheDir?: string;
  timeout?: number; // Network timeout in ms
  retries?: number; // Retry attempts for failed downloads
  userAgent?: string;
}

// For YAML parsing
export interface YAMLDependencies {
  dependencies?: DependencyConfig[];
  dependencies_quick?: string[];
}