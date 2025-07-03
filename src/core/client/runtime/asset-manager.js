class AssetManager {
    constructor(assetManifest) {
      this.assets = assetManifest || {};
      this.loadedAssets = new Map();
      this.loadingPromises = new Map();
    }
  
    getAsset(key) {
      return this.assets[key] || null;
    }
  
    async loadAsset(key) {
      if (this.loadedAssets.has(key)) {
        return this.loadedAssets.get(key);
      }
  
      if (this.loadingPromises.has(key)) {
        return this.loadingPromises.get(key);
      }
  
      const asset = this.getAsset(key);
      if (!asset) {
        console.warn(`⚠️ Asset not found: ${key}`);
        return null;
      }
  
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
  
    async performAssetLoad(asset) {
      if (asset.data) {
        return asset.data;
      } else if (asset.url) {
        const response = await fetch(asset.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      throw new Error('Asset has no data or URL');
    }
  }
