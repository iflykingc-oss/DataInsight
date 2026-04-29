export * from './api';
export * from './data';
export * from './llm';
export * from './chart';
export * from './platform';

export interface AppConfig {
  version: string;
  buildTime: string;
  environment: 'development' | 'test' | 'production';
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface AppState {
  currentData: import('./data').ParsedData | null;
  currentAnalysis: import('./data').DataAnalysis | null;
  activeModel: import('./llm').AIModelConfig | null;
  theme: 'light' | 'dark' | 'auto';
  language: string;
}
