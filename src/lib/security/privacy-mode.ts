/**
 * 隐私模式管理器
 * 低成本实现差异化卖点：页面关闭后自动销毁内存数据，不留痕迹
 * 仅做内存隔离，不做加密体系
 */

class PrivacyModeManager {
  private _enabled: boolean = false;
  private _inMemoryData: Map<string, unknown> = new Map();

  get enabled(): boolean {
    return this._enabled;
  }

  /** 开启隐私模式 */
  enable(): void {
    this._enabled = true;
    // 清空 localStorage 中的敏感数据
    const sensitiveKeys = [
      'datainsight_llm_config',
      'datainsight_datasource_config',
      'datainsight_custom_metrics',
      'datainsight_alert_rules',
      'datainsight_dashboard_config',
      'datainsight_clean_templates',
      'datainsight_table_history',
    ];
    for (const key of sensitiveKeys) {
      localStorage.removeItem(key);
    }
    // 监听页面关闭
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._handleBeforeUnload);
    }
  }

  /** 关闭隐私模式 */
  disable(): void {
    this._enabled = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this._handleBeforeUnload);
    }
  }

  /** 存储数据（隐私模式下仅存内存） */
  setItem(key: string, value: unknown): void {
    if (this._enabled) {
      this._inMemoryData.set(key, value);
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // localStorage 满了或不可用时降级到内存
        this._inMemoryData.set(key, value);
      }
    }
  }

  /** 获取数据 */
  getItem<T = unknown>(key: string): T | null {
    if (this._enabled) {
      return (this._inMemoryData.get(key) as T) ?? null;
    }
    const value = localStorage.getItem(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /** 删除数据 */
  removeItem(key: string): void {
    if (this._enabled) {
      this._inMemoryData.delete(key);
    } else {
      localStorage.removeItem(key);
    }
  }

  /** 手动销毁所有数据 */
  destroyAll(): void {
    this._inMemoryData.clear();
    const sensitiveKeys = [
      'datainsight_llm_config',
      'datainsight_datasource_config',
      'datainsight_custom_metrics',
      'datainsight_alert_rules',
      'datainsight_dashboard_config',
      'datainsight_clean_templates',
      'datainsight_table_history',
    ];
    for (const key of sensitiveKeys) {
      localStorage.removeItem(key);
    }
  }

  /** 获取当前存储状态 */
  getStatus(): { enabled: boolean; memoryItems: number; localStorageItems: number } {
    let localStorageCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('datainsight_')) localStorageCount++;
    }
    return {
      enabled: this._enabled,
      memoryItems: this._inMemoryData.size,
      localStorageItems: localStorageCount,
    };
  }

  private _handleBeforeUnload = (): void => {
    this._inMemoryData.clear();
  };
}

/** 单例导出 */
export const privacyMode = new PrivacyModeManager();
