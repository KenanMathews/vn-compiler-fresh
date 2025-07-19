/**
 * Asset Manager 
 */
class AssetManager {
  constructor(assetManifest) {
    this.assets = assetManifest || {};
    this.loadedAssets = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Get asset metadata by key
   */
  getAsset(key) {
    return this.assets[key] || null;
  }

  /**
   * Get asset URL for direct use
   */
  getAssetUrl(key) {
    const asset = this.getAsset(key);
    if (!asset) return null;
    
    // Return URL directly if available
    if (asset.url) return asset.url;
    
    // Return data URL if it's already a data URL
    if (asset.data && asset.data.startsWith('data:')) {
      return asset.data;
    }
    
    return null;
  }

  /**
   * Load an asset and return usable URL/data
   */
  async loadAsset(key) {
    // Return cached result if available
    if (this.loadedAssets.has(key)) {
      return this.loadedAssets.get(key);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const asset = this.getAsset(key);
    if (!asset) {
      console.warn(`⚠️ Asset not found: ${key}`);
      return null;
    }

    // Create loading promise
    const promise = this.performAssetLoad(asset);
    this.loadingPromises.set(key, promise);
    
    try {
      const result = await promise;
      this.loadedAssets.set(key, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to load asset ${key}:`, error);
      return null;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  /**
   * Perform the actual asset loading
   */
  async performAssetLoad(asset) {
    // Return embedded data directly
    if (asset.data) {
      return asset.data;
    }
    
    // Load from URL
    if (asset.url) {
      return asset.url; // Return URL directly for simple use
    }
    
    throw new Error('Asset has no data or URL');
  }

  /**
   * Check if asset is already loaded
   */
  isLoaded(key) {
    return this.loadedAssets.has(key);
  }

  /**
   * Preload an asset (load but don't return result)
   */
  async preload(key) {
    await this.loadAsset(key);
  }

  /**
   * Get asset info for debugging
   */
  getAssetInfo(key) {
    const asset = this.getAsset(key);
    if (!asset) return null;
    
    return {
      key,
      hasData: !!asset.data,
      hasUrl: !!asset.url,
      loaded: this.isLoaded(key),
      loading: this.loadingPromises.has(key)
    };
  }

  /**
   * Get all available assets
   */
  getAllAssets() {
    return { ...this.assets };
  }

  /**
   * Clear loaded asset cache
   */
  clearCache() {
    this.loadedAssets.clear();
    console.log('🧹 Asset cache cleared');
  }
}

// Export for global use
window.AssetManager = AssetManager;