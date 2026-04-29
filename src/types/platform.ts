export type PlatformType = 'feishu' | 'dingtalk' | 'wechat' | 'wps' | 'database';

export interface PlatformConfig {
  type: PlatformType;
  name: string;
  enabled: boolean;
  credentials: PlatformCredentials;
  settings?: Record<string, unknown>;
}

export interface PlatformCredentials {
  appId?: string;
  appSecret?: string;
  token?: string;
  webhookUrl?: string;
  apiKey?: string;
}

export interface PlatformConnectionTest {
  success: boolean;
  message: string;
  responseTime?: number;
  error?: string;
}

export interface FeishuConfig extends PlatformConfig {
  type: 'feishu';
  credentials: {
    appId: string;
    appSecret: string;
    webhookUrl?: string;
  };
  settings?: {
    defaultTableId?: string;
    syncInterval?: number;
  };
}

export interface DingtalkConfig extends PlatformConfig {
  type: 'dingtalk';
  credentials: {
    appKey: string;
    appSecret: string;
    webhookUrl?: string;
  };
}

export interface WechatConfig extends PlatformConfig {
  type: 'wechat';
  credentials: {
    corpId: string;
    agentId: string;
    corpSecret: string;
    webhookUrl?: string;
  };
}

export interface WPSConfig extends PlatformConfig {
  type: 'wps';
  credentials: {
    apiKey: string;
    apiSecret?: string;
  };
}

export interface DatabaseConfig extends PlatformConfig {
  type: 'database';
  credentials: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };
  settings?: {
    queryTimeout?: number;
    maxConnections?: number;
  };
}

export interface DataSource {
  id: string;
  name: string;
  type: PlatformType | 'file';
  config: PlatformConfig | FileDataSource;
  lastSyncAt?: string;
  status: 'active' | 'inactive' | 'error';
}

export interface FileDataSource {
  type: 'file';
  supportedFormats: string[];
  maxFileSize: number;
}

export interface SyncResult {
  success: boolean;
  recordsImported: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors?: string[];
  duration: number;
}
