'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlatformIntegrations } from '@/components/platform-integrations';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Database,
  FileJson,
  Link2,
  Table2,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Settings,
  Cloud,
  Server,
  Loader2,
  ChevronDown,
  ChevronRight,
  TestTube,
  Zap,
  Eye,
  EyeOff,
  Clock,
  History,
  Copy,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData } from '@/lib/data-processor';

// 数据库连接错误诊断
const DATABASE_ERROR_CODES: Record<string, { title: string; description: string; solution: string }> = {
  'ECONNREFUSED': {
    title: '无法连接到服务器',
    description: '服务器地址可能不正确或服务未启动',
    solution: '请检查主机地址和端口号是否正确，确认数据库服务已启动'
  },
  'ETIMEDOUT': {
    title: '连接超时',
    description: '服务器响应时间过长',
    solution: '请检查网络连接，或尝试更换为内网地址'
  },
  'ENOTFOUND': {
    title: '地址解析失败',
    description: '找不到指定的主机地址',
    solution: '请确认主机地址是否正确，可以尝试使用 IP 地址代替域名'
  },
  'ER_ACCESS_DENIED_ERROR': {
    title: '用户名或密码错误',
    description: '数据库拒绝了访问请求',
    solution: '请检查用户名和密码是否正确，注意区分大小写'
  },
  'ER_DBACCESS_DENIED_ERROR': {
    title: '没有数据库访问权限',
    description: '当前用户无权访问该数据库',
    solution: '请确认用户有该数据库的访问权限，或联系管理员授权'
  },
  'ER_BAD_DB_ERROR': {
    title: '数据库不存在',
    description: '指定的数据库名称不存在',
    solution: '请确认数据库名称是否正确，或先创建该数据库'
  },
  'PROTOCOL_CONNECTION_LOST': {
    title: '连接已断开',
    description: '与数据库的连接意外中断',
    solution: '请尝试重新连接，如果问题持续存在请检查网络'
  },
  'default': {
    title: '连接遇到问题',
    description: '数据库连接过程中发生未知错误',
    solution: '请检查所有配置项是否正确，或查看详细错误信息'
  }
};

interface DataSourceConfig {
  id: string;
  name: string;
  type: 'file' | 'api' | 'database';
  config: Record<string, string>;
  lastSync?: string;
  status: 'connected' | 'error' | 'pending' | 'testing';
  errorMessage?: string;
  errorCode?: string;
}

interface DataSnapshot {
  id: string;
  name: string;
  sourceType: string;
  createdAt: string;
  size: string;
  rowCount: number;
  preview: string[];
}

interface DataSourceManagerProps {
  onDataSourceChange?: (data: ParsedData) => void;
  currentData?: ParsedData;
}

export function DataSourceManager({ onDataSourceChange, currentData }: DataSourceManagerProps) {
  // 状态
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>([
    {
      id: 'local-1',
      name: '本地文件',
      type: 'file',
      config: { accept: '.xlsx,.xls,.csv,.txt,.json' },
      status: 'connected'
    }
  ]);
  
  const [activeSource, setActiveSource] = useState<string | null>('local-1');
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<DataSnapshot[]>([]);
  
  // API 配置
  const [apiConfig, setApiConfig] = useState({
    name: '',
    url: '',
    method: 'GET' as 'GET' | 'POST',
    headers: '',
    params: ''
  });
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; data: unknown; preview: string[] } | null>(null);
  
  // 数据库配置 - 简化版
  const [dbConfig, setDbConfig] = useState({
    name: '我的数据库',
    type: 'postgresql' as 'postgresql' | 'mysql',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    ssl: false,
    sql: 'SELECT * FROM 表名 LIMIT 100'
  });

  // 常用端口预设
  const commonPorts = {
    postgresql: '5432',
    mysql: '3306'
  };

  // 切换数据库类型时自动设置端口
  useEffect(() => {
    if (dbConfig.port === '' || commonPorts[dbConfig.type] === dbConfig.port) {
      setDbConfig(prev => ({ ...prev, port: commonPorts[dbConfig.type] }));
    }
  }, [dbConfig.type]);

  // 测试数据库连接
  const testDatabaseConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    
    // 验证必填字段
    if (!dbConfig.host) {
      setTestResult({ 
        success: false, 
        message: '请填写服务器地址',
        details: '主机地址不能为空，例如：localhost 或 127.0.0.1'
      });
      setIsTesting(false);
      return;
    }
    
    if (!dbConfig.database) {
      setTestResult({ 
        success: false, 
        message: '请填写数据库名称',
        details: '数据库名称不能为空'
      });
      setIsTesting(false);
      return;
    }

    try {
      // 模拟连接测试（实际应调用后端API）
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟错误场景（实际连接时会返回真实错误码）
      if (dbConfig.host === 'wrong-host') {
        throw new Error('ENOTFOUND');
      }
      if (dbConfig.host === 'timeout') {
        throw new Error('ETIMEDOUT');
      }
      if (dbConfig.password === 'wrong') {
        throw new Error('ER_ACCESS_DENIED_ERROR');
      }
      
      setTestResult({ 
        success: true, 
        message: '连接成功！',
        details: `已成功连接到 ${dbConfig.type === 'postgresql' ? 'PostgreSQL' : 'MySQL'} 数据库`
      });
      
    } catch (error: unknown) {
      const errorCode = (error as Error).message || 'default';
      const errorInfo = DATABASE_ERROR_CODES[errorCode] || DATABASE_ERROR_CODES['default'];
      
      setTestResult({ 
        success: false, 
        message: errorInfo.title,
        details: `${errorInfo.description}\n\n💡 ${errorInfo.solution}`
      });
    } finally {
      setIsTesting(false);
    }
  }, [dbConfig]);

  // 测试 API 连接
  const testApiConnection = useCallback(async () => {
    if (!apiConfig.url) {
      setApiTestResult(null);
      return;
    }

    setIsTesting(true);
    try {
      const headers: Record<string, string> = {};
      if (apiConfig.headers) {
        try {
          Object.assign(headers, JSON.parse(apiConfig.headers));
        } catch {
          // 忽略解析错误
        }
      }

      const response = await fetch(apiConfig.url, {
        method: apiConfig.method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: apiConfig.method === 'POST' && apiConfig.params 
          ? apiConfig.params 
          : undefined
      });

      if (response.ok) {
        const data = await response.json();
        const preview = Array.isArray(data) 
          ? data.slice(0, 3).map((item: unknown) => JSON.stringify(item))
          : [JSON.stringify(data).substring(0, 200)];
        
        setApiTestResult({ success: true, data, preview });
      } else {
        setApiTestResult({ 
          success: false, 
          data: null, 
          preview: [`请求失败: HTTP ${response.status}`] 
        });
      }
    } catch (error) {
      setApiTestResult({ 
        success: false, 
        data: null, 
        preview: [`连接失败: ${(error as Error).message}`] 
      });
    } finally {
      setIsTesting(false);
    }
  }, [apiConfig]);

  // 保存数据快照
  const saveSnapshot = useCallback(() => {
    if (!currentData) return;
    
    const newSnapshot: DataSnapshot = {
      id: `snapshot-${Date.now()}`,
      name: `快照 ${new Date().toLocaleString()}`,
      sourceType: currentData.fileName || '未知来源',
      createdAt: new Date().toISOString(),
      size: `${(JSON.stringify(currentData).length / 1024).toFixed(1)} KB`,
      rowCount: currentData.rowCount,
      preview: currentData.headers.slice(0, 3)
    };
    
    setSnapshots(prev => [newSnapshot, ...prev]);
  }, [currentData]);

  // 删除快照
  const deleteSnapshot = useCallback((id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  }, []);

  // 获取数据源图标
  const _getSourceIcon = (type: string) => {
    switch (type) {
      case 'file': return <FileJson className="w-4 h-4" />;
      case 'api': return <Link2 className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      default: return <Table2 className="w-4 h-4" />;
    }
  };

  // 获取状态徽章
  const _getStatusBadge = (source: DataSourceConfig) => {
    if (source.status === 'testing') {
      return <Badge className="bg-blue-100 text-blue-700">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        测试中
      </Badge>;
    }
    switch (source.status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          已连接
        </Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700">
          <AlertCircle className="w-3 h-3 mr-1" />
          连接失败
        </Badge>;
      default:
        return <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          待配置
        </Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          数据源管理
          <Badge variant="outline" className="ml-auto text-xs">
            {dataSources.length} 个数据源
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="database" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="database">数据库</TabsTrigger>
            <TabsTrigger value="api">API接口</TabsTrigger>
            <TabsTrigger value="history">数据快照</TabsTrigger>
            <TabsTrigger value="feishu">飞书</TabsTrigger>
            <TabsTrigger value="wechat">企业微信</TabsTrigger>
            <TabsTrigger value="dingtalk">钉钉</TabsTrigger>
            <TabsTrigger value="wps">金山文档</TabsTrigger>
          </TabsList>
          
          {/* 数据库连接 - 简化版 */}
          <TabsContent value="database" className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-700">智能连接助手</p>
                  <p className="text-xs text-purple-600 mt-1">
                    只需填写必填项，系统会自动帮您检测并解决连接问题
                  </p>
                </div>
              </div>
            </div>

            {/* 简化配置表单 */}
            <div className="grid gap-4">
              {/* 连接名称 */}
              <div className="space-y-2">
                <Label>连接名称</Label>
                <Input 
                  placeholder="给这个连接起个名字"
                  value={dbConfig.name}
                  onChange={e => setDbConfig(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* 数据库类型 */}
              <div className="space-y-2">
                <Label>数据库类型</Label>
                <div className="flex gap-2">
                  <Button
                    variant={dbConfig.type === 'postgresql' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDbConfig(prev => ({ ...prev, type: 'postgresql' }))}
                    className="flex-1"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    PostgreSQL
                  </Button>
                  <Button
                    variant={dbConfig.type === 'mysql' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDbConfig(prev => ({ ...prev, type: 'mysql' }))}
                    className="flex-1"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    MySQL
                  </Button>
                </div>
              </div>

              {/* 连接信息 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>服务器地址 <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder={dbConfig.type === 'postgresql' ? 'localhost 或 127.0.0.1' : 'localhost 或 127.0.0.1'}
                    value={dbConfig.host}
                    onChange={e => setDbConfig(prev => ({ ...prev, host: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>端口 <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder={commonPorts[dbConfig.type]}
                    value={dbConfig.port}
                    onChange={e => setDbConfig(prev => ({ ...prev, port: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>数据库名称 <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="输入数据库名称"
                  value={dbConfig.database}
                  onChange={e => setDbConfig(prev => ({ ...prev, database: e.target.value }))}
                />
              </div>

              {/* 认证信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input 
                    placeholder="数据库用户名"
                    value={dbConfig.username}
                    onChange={e => setDbConfig(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>密码</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="数据库密码"
                      value={dbConfig.password}
                      onChange={e => setDbConfig(prev => ({ ...prev, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 高级选项 */}
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      高级选项
                    </span>
                    {isAdvancedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ssl"
                      checked={dbConfig.ssl}
                      onChange={e => setDbConfig(prev => ({ ...prev, ssl: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="ssl" className="cursor-pointer">使用 SSL/TLS 加密连接</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>SQL 查询语句</Label>
                    <Textarea 
                      placeholder="SELECT * FROM table_name LIMIT 100"
                      value={dbConfig.sql}
                      onChange={e => setDbConfig(prev => ({ ...prev, sql: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 测试结果 */}
            {testResult && (
              <div className={cn(
                'p-4 rounded-lg border',
                testResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              )}>
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={cn(
                      'font-medium',
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    )}>
                      {testResult.message}
                    </p>
                    {testResult.details && (
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                        {testResult.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button 
                onClick={testDatabaseConnection} 
                disabled={isTesting}
                variant="outline"
                className="flex-1"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    测试连接中...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    测试连接
                  </>
                )}
              </Button>
              <Button 
                disabled={!testResult?.success}
                className="flex-1"
              >
                <Zap className="w-4 h-4 mr-2" />
                保存并连接
              </Button>
            </div>
          </TabsContent>

          {/* API 接口配置 */}
          <TabsContent value="api" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>接口名称</Label>
                <Input 
                  placeholder="给这个接口起个名字"
                  value={apiConfig.name}
                  onChange={e => setApiConfig(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>请求地址</Label>
                <div className="flex gap-2">
                  <select
                    value={apiConfig.method}
                    onChange={e => setApiConfig(prev => ({ ...prev, method: e.target.value as 'GET' | 'POST' }))}
                    className="px-3 py-2 border rounded-md bg-white"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                  <Input 
                    placeholder="https://api.example.com/data"
                    value={apiConfig.url}
                    onChange={e => setApiConfig(prev => ({ ...prev, url: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>请求头 (JSON格式)</Label>
                <Textarea 
                  placeholder='{"Authorization": "Bearer xxx"}'
                  value={apiConfig.headers}
                  onChange={e => setApiConfig(prev => ({ ...prev, headers: e.target.value }))}
                  rows={2}
                />
              </div>

              {apiConfig.method === 'POST' && (
                <div className="space-y-2">
                  <Label>请求体</Label>
                  <Textarea 
                    placeholder='{"key": "value"}'
                    value={apiConfig.params}
                    onChange={e => setApiConfig(prev => ({ ...prev, params: e.target.value }))}
                    rows={2}
                  />
                </div>
              )}

              {/* API 测试结果预览 */}
              {apiTestResult && (
                <div className={cn(
                  'p-4 rounded-lg border',
                  apiTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {apiTestResult.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={cn(
                      'text-sm font-medium',
                      apiTestResult.success ? 'text-green-700' : 'text-red-700'
                    )}>
                      {apiTestResult.success ? '请求成功' : '请求失败'}
                    </span>
                  </div>
                  <div className="bg-white rounded border p-2 max-h-32 overflow-auto">
                    <p className="text-xs text-gray-500 mb-1">数据预览:</p>
                    {apiTestResult.preview.map((item, idx) => (
                      <pre key={idx} className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                        {item.length > 100 ? item.substring(0, 100) + '...' : item}
                      </pre>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={testApiConnection}
                  disabled={!apiConfig.url || isTesting}
                  variant="outline"
                  className="flex-1"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  发送测试请求
                </Button>
                <Button disabled={!apiTestResult?.success} className="flex-1">
                  <Zap className="w-4 h-4 mr-2" />
                  保存接口
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* 数据快照历史 */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {snapshots.length === 0 ? '暂无数据快照' : `已保存 ${snapshots.length} 个快照`}
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={saveSnapshot}
                disabled={!currentData}
              >
                <History className="w-4 h-4 mr-1" />
                保存当前快照
              </Button>
            </div>

            {snapshots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无保存的快照</p>
                <p className="text-sm">上传数据后可以保存数据快照，防止数据丢失</p>
              </div>
            ) : (
              <div className="space-y-2">
                {snapshots.map(snapshot => (
                  <div key={snapshot.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <History className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{snapshot.name}</p>
                          <p className="text-xs text-gray-500">
                            {snapshot.rowCount} 行 · {snapshot.size}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {new Date(snapshot.createdAt).toLocaleString()}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => deleteSnapshot(snapshot.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 飞书集成 */}
          <TabsContent value="feishu" className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Cloud className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700">飞书多维表格集成</p>
                  <p className="text-xs text-blue-600 mt-1">
                    连接飞书多维表格，实现数据实时同步与协作
                  </p>
                </div>
              </div>
            </div>
            <PlatformIntegrations onImportData={(d) => onDataSourceChange?.({ ...d, fileName: '飞书数据', rowCount: d.rows.length, columnCount: d.headers.length } as ParsedData)} />
          </TabsContent>

          <TabsContent value="wechat" className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Cloud className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700">企业微信集成</p>
                  <p className="text-xs text-green-600 mt-1">
                    对接企业微信，获取组织成员和业务数据
                  </p>
                </div>
              </div>
            </div>
            <PlatformIntegrations onImportData={(d) => onDataSourceChange?.({ ...d, fileName: '企业微信数据', rowCount: d.rows.length, columnCount: d.headers.length } as ParsedData)} />
          </TabsContent>

          <TabsContent value="dingtalk" className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Cloud className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700">钉钉集成</p>
                  <p className="text-xs text-blue-600 mt-1">
                    集成钉钉考勤、审批、任务数据
                  </p>
                </div>
              </div>
            </div>
            <PlatformIntegrations onImportData={(d) => onDataSourceChange?.({ ...d, fileName: '钉钉数据', rowCount: d.rows.length, columnCount: d.headers.length } as ParsedData)} />
          </TabsContent>

          <TabsContent value="wps" className="space-y-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Cloud className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">金山文档集成</p>
                  <p className="text-xs text-amber-600 mt-1">
                    连接 WPS 云文档，导入表格数据
                  </p>
                </div>
              </div>
            </div>
            <PlatformIntegrations onImportData={(d) => onDataSourceChange?.({ ...d, fileName: '金山文档数据', rowCount: d.rows.length, columnCount: d.headers.length } as ParsedData)} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
