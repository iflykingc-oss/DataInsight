import type { ParsedData, DataAnalysis } from './data-processor';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string;
  size: number;
}

export interface DataCacheEntry extends CacheEntry<ParsedData> {
  fileName: string;
  rowCount: number;
}

export interface AnalysisCacheEntry extends CacheEntry<DataAnalysis> {
  dataHash: string;
  fieldCount: number;
}

export interface ChartConfigCacheEntry extends CacheEntry<unknown> {
  chartType: string;
  dataHash: string;
}

class TripleCache {
  private dataCache = new Map<string, DataCacheEntry>();
  private analysisCache = new Map<string, AnalysisCacheEntry>();
  private chartConfigCache = new Map<string, ChartConfigCacheEntry>();

  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024;
  private currentSize = 0;

  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36) + Date.now().toString(36);
  }

  private calculateSize(data: unknown): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private evictIfNeeded(neededSize: number) {
    while (this.currentSize + neededSize > this.MAX_CACHE_SIZE && this.currentSize > 0) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.remove(oldestKey);
      } else {
        break;
      }
    }
  }

  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.dataCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    for (const [key, entry] of this.analysisCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    for (const [key, entry] of this.chartConfigCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private remove(key: string) {
    const dataEntry = this.dataCache.get(key);
    if (dataEntry) {
      this.currentSize -= dataEntry.size;
      this.dataCache.delete(key);
      return;
    }

    const analysisEntry = this.analysisCache.get(key);
    if (analysisEntry) {
      this.currentSize -= analysisEntry.size;
      this.analysisCache.delete(key);
      return;
    }

    const chartEntry = this.chartConfigCache.get(key);
    if (chartEntry) {
      this.currentSize -= chartEntry.size;
      this.chartConfigCache.delete(key);
    }
  }

  public hashData(data: ParsedData): string {
    const content = JSON.stringify({
      headers: data.headers,
      rows: data.rows.slice(0, 100),
      rowCount: data.rowCount,
      columnCount: data.columnCount
    });
    return this.generateHash(content);
  }

  public cacheData(data: ParsedData): string {
    const hash = this.hashData(data);
    const size = this.calculateSize(data);

    this.evictIfNeeded(size);

    const entry: DataCacheEntry = {
      data,
      timestamp: Date.now(),
      hash,
      size,
      fileName: data.fileName,
      rowCount: data.rowCount
    };

    this.dataCache.set(hash, entry);
    this.currentSize += size;

    return hash;
  }

  public getData(hash: string): ParsedData | null {
    const entry = this.dataCache.get(hash);
    if (entry) {
      entry.timestamp = Date.now();
      return entry.data;
    }
    return null;
  }

  public cacheAnalysis(dataHash: string, analysis: DataAnalysis, fieldCount: number): string {
    const cacheKey = `analysis_${dataHash}`;
    const size = this.calculateSize(analysis);

    this.evictIfNeeded(size);

    const entry: AnalysisCacheEntry = {
      data: analysis,
      timestamp: Date.now(),
      hash: cacheKey,
      size,
      dataHash,
      fieldCount
    };

    this.analysisCache.set(cacheKey, entry);
    this.currentSize += size;

    return cacheKey;
  }

  public getAnalysis(dataHash: string): DataAnalysis | null {
    const cacheKey = `analysis_${dataHash}`;
    const entry = this.analysisCache.get(cacheKey);
    if (entry) {
      entry.timestamp = Date.now();
      return entry.data;
    }
    return null;
  }

  public cacheChartConfig(
    chartType: string,
    dataHash: string,
    config: unknown
  ): string {
    const cacheKey = `chart_${chartType}_${dataHash}`;
    const size = this.calculateSize(config);

    this.evictIfNeeded(size);

    const entry: ChartConfigCacheEntry = {
      data: config,
      timestamp: Date.now(),
      hash: cacheKey,
      size,
      chartType,
      dataHash
    };

    this.chartConfigCache.set(cacheKey, entry);
    this.currentSize += size;

    return cacheKey;
  }

  public getChartConfig(chartType: string, dataHash: string): unknown | null {
    const cacheKey = `chart_${chartType}_${dataHash}`;
    const entry = this.chartConfigCache.get(cacheKey);
    if (entry) {
      entry.timestamp = Date.now();
      return entry.data;
    }
    return null;
  }

  public invalidateData(dataHash: string) {
    this.dataCache.delete(dataHash);
    this.analysisCache.delete(`analysis_${dataHash}`);
  }

  public clear() {
    this.dataCache.clear();
    this.analysisCache.clear();
    this.chartConfigCache.clear();
    this.currentSize = 0;
  }

  public getStats() {
    return {
      dataCacheCount: this.dataCache.size,
      analysisCacheCount: this.analysisCache.size,
      chartConfigCacheCount: this.chartConfigCache.size,
      currentSize: this.currentSize,
      maxSize: this.MAX_CACHE_SIZE
    };
  }
}

export const tripleCache = new TripleCache();

export function loadFromLocalStorage<T>(key: string, maxAge?: number): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry = JSON.parse(cached);
    if (maxAge && Date.now() - entry.timestamp > maxAge) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data as T;
  } catch {
    return null;
  }
}

export function saveToLocalStorage<T>(key: string, data: T, ttl?: number) {
  try {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn('LocalStorage save failed:', error);
  }
}

export function removeFromLocalStorage(key: string) {
  localStorage.removeItem(key);
}

export function getLocalStorageSize(): number {
  let size = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      size += localStorage[key].length + key.length;
    }
  }
  return size;
}
