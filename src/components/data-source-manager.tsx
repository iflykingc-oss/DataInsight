'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Server
} from 'lucide-react';
import type { ParsedData } from '@/lib/data-processor';

interface DataSourceConfig {
  id: string;
  name: string;
  type: 'file' | 'api' | 'database';
  config: Record<string, string>;
  lastSync?: string;
  status: 'connected' | 'error' | 'pending';
}

interface DataSourceManagerProps {
  onDataSourceChange?: (data: ParsedData) => void;
  currentData?: ParsedData;
}

export function DataSourceManager({ onDataSourceChange, currentData }: DataSourceManagerProps) {
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>([
    {
      id: 'local-1',
      name: '本地文件',
      type: 'file',
      config: { accept: '.xlsx,.xls,.csv,.json' },
      status: 'connected'
    },
    {
      id: 'feishu-1',
      name: '飞书多维表格',
      type: 'api',
      config: { appToken: '', tableId: '' },
      status: 'pending'
    }
  ]);
  
  const [activeSource, setActiveSource] = useState<string | null>('local-1');
  const [isConnecting, setIsConnecting] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST'>('GET');
  const [apiHeaders, setApiHeaders] = useState('');
  const [apiBody, setApiBody] = useState('');
  
  const [databaseConfig, setDatabaseConfig] = useState({
    type: 'postgresql',
    host: '',
    port: '5432',
    database: '',
    username: '',
    password: '',
    sql: 'SELECT * FROM table LIMIT 1000'
  });
  
  // 测试API连接
  const testApiConnection = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: apiHeaders ? JSON.parse(apiHeaders) : {},
        body: apiMethod === 'POST' ? apiBody : undefined
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('API连接成功', data);
      }
    } catch (error) {
      console.error('API连接失败', error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // 添加新数据源
  const addDataSource = (type: DataSourceConfig['type']) => {
    const newSource: DataSourceConfig = {
      id: `${type}-${Date.now()}`,
      name: type === 'file' ? '新文件数据源' : type === 'api' ? '新API数据源' : '新数据库',
      type,
      config: {},
      status: 'pending'
    };
    setDataSources([...dataSources, newSource]);
  };
  
  // 删除数据源
  const removeDataSource = (id: string) => {
    setDataSources(dataSources.filter(s => s.id !== id));
    if (activeSource === id) {
      setActiveSource('local-1');
    }
  };
  
  // 刷新数据源
  const refreshDataSource = async (id: string) => {
    const source = dataSources.find(s => s.id === id);
    if (!source) return;
    
    setDataSources(dataSources.map(s => 
      s.id === id ? { ...s, status: 'connected' as const, lastSync: new Date().toISOString() } : s
    ));
  };
  
  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'file': return <FileJson className="w-4 h-4" />;
      case 'api': return <Link2 className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      default: return <Table2 className="w-4 h-4" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          已连接
        </Badge>;
      case 'error':
        return <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          连接失败
        </Badge>;
      default:
        return <Badge variant="secondary">
          <RefreshCw className="w-3 h-3 mr-1" />
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="sources" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sources">数据源列表</TabsTrigger>
            <TabsTrigger value="api">API数据源</TabsTrigger>
            <TabsTrigger value="database">数据库连接</TabsTrigger>
            <TabsTrigger value="feishu">飞书深度集成</TabsTrigger>
          </TabsList>
          
          {/* 数据源列表 */}
          <TabsContent value="sources" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">已配置 {dataSources.length} 个数据源</p>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      添加数据源
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加数据源</DialogTitle>
                      <DialogDescription>选择数据源类型</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                      <button
                        onClick={() => { addDataSource('file'); }}
                        className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <FileJson className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-medium">文件上传</p>
                        <p className="text-xs text-gray-500">Excel/CSV/JSON</p>
                      </button>
                      <button
                        onClick={() => { addDataSource('api'); }}
                        className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Link2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p className="text-sm font-medium">API接口</p>
                        <p className="text-xs text-gray-500">REST API</p>
                      </button>
                      <button
                        onClick={() => { addDataSource('database'); }}
                        className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Server className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                        <p className="text-sm font-medium">数据库</p>
                        <p className="text-xs text-gray-500">PostgreSQL/MySQL</p>
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* 数据源列表 */}
            <div className="space-y-2">
              {dataSources.map(source => (
                <div
                  key={source.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    activeSource === source.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setActiveSource(source.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        source.type === 'file' ? 'bg-blue-100 text-blue-600' :
                        source.type === 'api' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {getSourceIcon(source.type)}
                      </div>
                      <div>
                        <p className="font-medium">{source.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{source.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(source.status)}
                      {source.lastSync && (
                        <span className="text-xs text-gray-400">
                          {new Date(source.lastSync).toLocaleString()}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshDataSource(source.id);
                        }}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDataSource(source.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          {/* API数据源 */}
          <TabsContent value="api" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>API地址</Label>
                <div className="flex gap-2">
                  <select
                    value={apiMethod}
                    onChange={e => setApiMethod(e.target.value as 'GET' | 'POST')}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                  <Input
                    placeholder="https://api.example.com/data"
                    value={apiUrl}
                    onChange={e => setApiUrl(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>请求头 (JSON格式)</Label>
                <Textarea
                  placeholder='{"Authorization": "Bearer xxx"}'
                  value={apiHeaders}
                  onChange={e => setApiHeaders(e.target.value)}
                  rows={2}
                />
              </div>
              
              {apiMethod === 'POST' && (
                <div className="space-y-2">
                  <Label>请求体 (JSON格式)</Label>
                  <Textarea
                    placeholder='{"key": "value"}'
                    value={apiBody}
                    onChange={e => setApiBody(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
              
              <Button onClick={testApiConnection} disabled={!apiUrl || isConnecting}>
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    连接中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    测试连接
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          {/* 数据库连接 */}
          <TabsContent value="database" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>数据库类型</Label>
                <div className="flex gap-2">
                  <Button
                    variant={databaseConfig.type === 'postgresql' ? 'default' : 'outline'}
                    onClick={() => setDatabaseConfig({ ...databaseConfig, type: 'postgresql' })}
                  >
                    PostgreSQL
                  </Button>
                  <Button
                    variant={databaseConfig.type === 'mysql' ? 'default' : 'outline'}
                    onClick={() => setDatabaseConfig({ ...databaseConfig, type: 'mysql' })}
                  >
                    MySQL
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>主机地址</Label>
                  <Input
                    placeholder="localhost"
                    value={databaseConfig.host}
                    onChange={e => setDatabaseConfig({ ...databaseConfig, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>端口</Label>
                  <Input
                    placeholder={databaseConfig.type === 'postgresql' ? '5432' : '3306'}
                    value={databaseConfig.port}
                    onChange={e => setDatabaseConfig({ ...databaseConfig, port: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>数据库名</Label>
                  <Input
                    placeholder="mydb"
                    value={databaseConfig.database}
                    onChange={e => setDatabaseConfig({ ...databaseConfig, database: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input
                    placeholder="admin"
                    value={databaseConfig.username}
                    onChange={e => setDatabaseConfig({ ...databaseConfig, username: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>密码</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={databaseConfig.password}
                  onChange={e => setDatabaseConfig({ ...databaseConfig, password: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>SQL查询语句</Label>
                <Textarea
                  placeholder="SELECT * FROM table_name LIMIT 1000"
                  value={databaseConfig.sql}
                  onChange={e => setDatabaseConfig({ ...databaseConfig, sql: e.target.value })}
                  rows={3}
                />
              </div>
              
              <Button>
                <CheckCircle className="w-4 h-4 mr-2" />
                连接并执行查询
              </Button>
            </div>
          </TabsContent>
          
          {/* 飞书深度集成 */}
          <TabsContent value="feishu" className="space-y-4">
            <div className="grid gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">飞书多维表格深度集成</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  通过飞书开放平台API直接读取多维表格数据，支持实时同步
                </p>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>App Token (多维表格标识)</Label>
                    <Input placeholder="BxxxxxxxxxxRxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>Table ID (数据表标识)</Label>
                    <Input placeholder="tblxxxxxxxxxx" />
                  </div>
                  <Button className="w-full">
                    <Link2 className="w-4 h-4 mr-2" />
                    连接飞书多维表格
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">同步方式</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="sync" defaultChecked />
                      <span className="text-sm">手动同步</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="sync" />
                      <span className="text-sm">定时同步 (每小时)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="sync" />
                      <span className="text-sm">实时同步</span>
                    </label>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">数据映射</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• 自动识别字段类型</p>
                    <p>• 保留飞书多维表格视图</p>
                    <p>• 支持关联字段展开</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
