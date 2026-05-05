export type PlatformType = 'feishu' | 'wechat' | 'dingtalk' | 'wps';

export interface PlatformCredentials {
  appId?: string;
  appKey?: string;
  appSecret?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface PlatformConfig {
  id: string;
  platform: PlatformType;
  name: string;
  credentials: PlatformCredentials;
  tableId?: string;
  database?: string;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncOptions {
  syncType: 'manual' | 'auto';
  syncFrequency?: 'hourly' | 'daily' | 'weekly';
  syncMode: 'full' | 'incremental';
  enableSync: boolean;
}

export interface SyncResult {
  success: boolean;
  recordCount?: number;
  syncedAt?: string;
  error?: string;
}

export interface ConnectResult {
  success: boolean;
  message: string;
  platform?: PlatformType;
  tables?: Array<{ id: string; name: string }>;
  databases?: Array<{ id: string; name: string }>;
}
