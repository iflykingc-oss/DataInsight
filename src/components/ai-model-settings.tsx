'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Save,
  Zap,
  Globe,
  Key,
  TestTube
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 预设模型配置
const PRESET_MODELS = [
  {
    id: 'doubao-seed',
    name: '豆包 Seed',
    provider: '字节跳动',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-seed-2-0-lite',
    description: '火山引擎豆包模型'
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    description: 'DeepSeek对话模型'
  },
  {
    id: 'kimi-chat',
    name: 'Kimi Chat',
    provider: '月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    description: 'Kimi长文本模型'
  },
  {
    id: 'qwen-turbo',
    name: '通义千问',
    provider: '阿里云',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    description: '阿里云通义千问'
  },
  {
    id: 'custom',
    name: '自定义模型',
    provider: '其他',
    baseUrl: '',
    defaultModel: '',
    description: '接入其他兼容OpenAI格式的模型'
  }
];

// AI模型配置接口
export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isDefault: boolean;
  enabled: boolean;
}

// 本地存储键名
const STORAGE_KEY = 'datainsight_ai_models';

// 默认配置
const DEFAULT_CONFIG: AIModelConfig[] = [
  {
    id: 'doubao-default',
    name: '豆包 Seed',
    provider: '字节跳动',
    apiKey: '',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-2-0-lite',
    isDefault: true,
    enabled: true
  }
];

// 加载保存的配置
const loadConfigs = (): AIModelConfig[] => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
};

// 保存配置
const saveConfigs = (configs: AIModelConfig[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
};

interface AIModelSettingsProps {
  onModelChange?: (config: AIModelConfig) => void;
  className?: string;
}

export function AIModelSettings({ onModelChange, className }: AIModelSettingsProps) {
  const [configs, setConfigs] = useState<AIModelConfig[]>(DEFAULT_CONFIG);
  const [editingConfig, setEditingConfig] = useState<AIModelConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 加载配置
  useEffect(() => {
    const loaded = loadConfigs();
    setConfigs(loaded);
  }, []);

  // 保存配置
  useEffect(() => {
    saveConfigs(configs);
    const defaultModel = configs.find(c => c.isDefault && c.enabled);
    if (defaultModel) {
      onModelChange?.(defaultModel);
    }
  }, [configs, onModelChange]);

  // 获取当前使用的模型
  const activeModel = configs.find(c => c.isDefault && c.enabled);

  // 添加新配置
  const handleAddConfig = () => {
    setEditingConfig({
      id: `custom-${Date.now()}`,
      name: '',
      provider: '',
      apiKey: '',
      baseUrl: '',
      model: '',
      isDefault: configs.length === 0,
      enabled: true
    });
    setIsAddingNew(true);
    setIsDialogOpen(true);
  };

  // 编辑配置
  const handleEditConfig = (config: AIModelConfig) => {
    setEditingConfig({ ...config });
    setIsAddingNew(false);
    setIsDialogOpen(true);
  };

  // 删除配置
  const handleDeleteConfig = (id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
  };

  // 设置默认模型
  const handleSetDefault = (id: string) => {
    setConfigs(prev => prev.map(c => ({
      ...c,
      isDefault: c.id === id
    })));
  };

  // 切换启用状态
  const handleToggleEnabled = (id: string) => {
    setConfigs(prev => prev.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
  };

  // 保存配置
  const handleSaveConfig = () => {
    if (!editingConfig) return;
    
    // 验证必填项
    if (!editingConfig.name || !editingConfig.apiKey || !editingConfig.model) {
      setTestResult({ success: false, message: '请填写完整信息（名称、API Key、模型）' });
      return;
    }

    if (isAddingNew) {
      setConfigs(prev => [...prev, editingConfig]);
    } else {
      setConfigs(prev => prev.map(c => c.id === editingConfig.id ? editingConfig : c));
    }
    
    setIsDialogOpen(false);
    setEditingConfig(null);
    setTestResult(null);
  };

  // 测试连接
  const handleTestConnection = async () => {
    if (!editingConfig?.apiKey || !editingConfig.baseUrl || !editingConfig.model) {
      setTestResult({ success: false, message: '请先填写完整的连接信息' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${editingConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${editingConfig.apiKey}`
        },
        body: JSON.stringify({
          model: editingConfig.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        setTestResult({ success: true, message: '连接成功！模型响应正常' });
      } else {
        const error = await response.json().catch(() => ({}));
        setTestResult({ 
          success: false, 
          message: `连接失败: ${error.error?.message || response.statusText}` 
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: `连接失败: ${error instanceof Error ? error.message : '网络错误'}` 
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 从预设选择
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_MODELS.find(p => p.id === presetId);
    if (!preset) return;
    
    setEditingConfig({
      id: `preset-${Date.now()}`,
      name: preset.name,
      provider: preset.provider,
      apiKey: '',
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
      isDefault: false,
      enabled: true
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 当前使用模型 */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            当前使用的 AI 模型
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{activeModel?.name || '未配置'}</p>
                <p className="text-sm text-gray-500">
                  {activeModel?.provider || '请配置模型'}
                  {activeModel?.model && ` · ${activeModel.model}`}
                </p>
              </div>
            </div>
            <Badge variant={activeModel?.enabled ? 'default' : 'secondary'}>
              {activeModel?.enabled ? '使用中' : '未启用'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 模型配置列表 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-5 h-5" />
              模型配置
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleAddConfig}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加模型
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {isAddingNew ? '添加 AI 模型' : '编辑 AI 模型'}
                  </DialogTitle>
                  <DialogDescription>
                    配置模型连接信息，支持 OpenAI 兼容格式
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* 预设模板选择 */}
                  {isAddingNew && (
                    <div className="space-y-2">
                      <Label>快速选择预设模型</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_MODELS.filter(p => p.id !== 'custom').map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => handleSelectPreset(preset.id)}
                            className={cn(
                              'p-2 rounded-lg border text-left transition-all',
                              editingConfig?.baseUrl === preset.baseUrl
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-200 hover:border-primary/50'
                            )}
                          >
                            <p className="font-medium text-sm">{preset.name}</p>
                            <p className="text-xs text-gray-500">{preset.provider}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 配置表单 */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="model-name">模型名称 *</Label>
                      <Input
                        id="model-name"
                        placeholder="如：我的GPT-4"
                        value={editingConfig?.name || ''}
                        onChange={e => setEditingConfig(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="provider">服务商</Label>
                      <Input
                        id="provider"
                        placeholder="如：OpenAI / DeepSeek"
                        value={editingConfig?.provider || ''}
                        onChange={e => setEditingConfig(prev => prev ? { ...prev, provider: e.target.value } : null)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="base-url">Base URL *</Label>
                      <Input
                        id="base-url"
                        placeholder="https://api.openai.com/v1"
                        value={editingConfig?.baseUrl || ''}
                        onChange={e => setEditingConfig(prev => prev ? { ...prev, baseUrl: e.target.value } : null)}
                      />
                      <p className="text-xs text-gray-500">
                        支持 OpenAI 兼容格式的 API 地址
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="model">模型名称 *</Label>
                      <Input
                        id="model"
                        placeholder="如：gpt-4、claude-3-sonnet"
                        value={editingConfig?.model || ''}
                        onChange={e => setEditingConfig(prev => prev ? { ...prev, model: e.target.value } : null)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key *</Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="sk-..."
                        value={editingConfig?.apiKey || ''}
                        onChange={e => setEditingConfig(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                      />
                    </div>
                  </div>

                  {/* 测试结果 */}
                  {testResult && (
                    <div className={cn(
                      'p-3 rounded-lg flex items-center gap-2',
                      testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    )}>
                      {testResult.success ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                      <span className="text-sm">{testResult.message}</span>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        测试中...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4 mr-2" />
                        测试连接
                      </>
                    )}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleSaveConfig}>
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {configs.map(config => (
              <div
                key={config.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all',
                  config.enabled ? 'bg-white' : 'bg-gray-50 opacity-60'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    config.enabled ? 'bg-gray-100' : 'bg-gray-200'
                  )}>
                    <Bot className={cn(
                      'w-5 h-5',
                      config.enabled ? 'text-gray-700' : 'text-gray-400'
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.name}</span>
                      {config.isDefault && (
                        <Badge variant="default" className="text-xs">默认</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {config.provider} · {config.model}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* 启用开关 */}
                  <button
                    onClick={() => handleToggleEnabled(config.id)}
                    className={cn(
                      'relative w-10 h-6 rounded-full transition-colors',
                      config.enabled ? 'bg-primary' : 'bg-gray-300'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        config.enabled ? 'left-5' : 'left-1'
                      )}
                    />
                  </button>
                  
                  {/* 设置默认 */}
                  {!config.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(config.id)}
                    >
                      设为默认
                    </Button>
                  )}
                  
                  {/* 操作按钮 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditConfig(config)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  
                  {configs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteConfig(config.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {configs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂未配置任何 AI 模型</p>
                <p className="text-sm">点击上方按钮添加</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-medium text-gray-700">使用说明</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>API Key 仅本地存储，不会上传到服务器</li>
                <li>支持 OpenAI 兼容格式的模型接入</li>
                <li>建议设置默认模型，其他功能将自动使用</li>
                <li>如需更换模型，可直接编辑现有配置</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 导出获取当前配置的hook
export const useCurrentAIModel = () => {
  const [config, setConfig] = useState<AIModelConfig | null>(null);
  
  useEffect(() => {
    const configs = loadConfigs();
    const active = configs.find(c => c.isDefault && c.enabled);
    setConfig(active || null);
  }, []);
  
  return config;
};
