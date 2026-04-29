export type PlatformType = 'feishu' | 'dingtalk' | 'wechat' | 'wps' | 'database';

export interface PlatformCredentials {
  appId?: string;
  appSecret?: string;
  appKey?: string;
  token?: string;
  webhookUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  corpId?: string;
  agentId?: string;
  corpSecret?: string;
  ssl?: boolean;
}

export interface PlatformConfig<T extends PlatformCredentials = PlatformCredentials> {
  type: PlatformType;
  name: string;
  enabled: boolean;
  credentials: T;
  settings?: Record<string, unknown>;
}

export interface PlatformConnectionTest {
  success: boolean;
  message: string;
  responseTime?: number;
  error?: string;
}

export interface FeishuConfig extends PlatformConfig<{
  appId: string;
  appSecret: string;
  webhookUrl?: string;
}> {
  type: 'feishu';
  settings?: {
    defaultTableId?: string;
    syncInterval?: number;
  };
}

export interface DingtalkConfig extends PlatformConfig<{
  appKey: string;
  appSecret: string;
  webhookUrl?: string;
}> {
  type: 'dingtalk';
}

export interface WechatConfig extends PlatformConfig<{
  corpId: string;
  agentId: string;
  corpSecret: string;
  webhookUrl?: string;
}> {
  type: 'wechat';
}

export interface WPSConfig extends PlatformConfig<{
  apiKey: string;
  apiSecret?: string;
}> {
  type: 'wps';
}

export interface DatabaseConfig extends PlatformConfig<{
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}> {
  type: 'database';
  settings?: {
    queryTimeout?: number;
    maxConnections?: number;
  };
}
