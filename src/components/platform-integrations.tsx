'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Link2,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  CheckCircle,
  AlertCircle,
  Loader2,

  Trash2,
} from 'lucide-react';

interface PlatformIntegrationProps {
  onImportData?: (data: { headers: string[]; rows: Record<string, string | number>[] }) => void;
}

// 飞书集成
function FeishuPanel({ onImportData }: { onImportData?: (d: { headers: string[]; rows: Record<string, string | number>[] }) => void }) {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [appToken, setAppToken] = useState('');
  const [tableId, setTableId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!appId || !appSecret || !appToken) return;
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const response = await fetch('/api/platform/feishu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          credentials: { appId, appSecret },
          appToken,
          tableId,
        }),
      });

      if (!response.ok) {
        setConnectionError('连接失败，请检查配置');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
      } else {
        setConnectionError(result.message || '连接失败');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : '连接失败');
    } finally {
      setIsConnecting(false);
    }
  }, [appId, appSecret, appToken, tableId]);

  const handleSync = useCallback(async () => {
    if (!appToken || !tableId) return;
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/platform/feishu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          credentials: { appId, appSecret },
          appToken,
          tableId,
        }),
      });

      if (!response.ok) {
        setSyncMessage('同步失败，请重试');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setSyncMessage(result.message || '同步成功');
      } else {
        setConnectionError(result.message || '同步失败');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : '同步失败');
    } finally {
      setIsSyncing(false);
    }
  }, [appId, appSecret, appToken, tableId]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleData = {
    headers: ['日期', '销售额', '访问量', '转化率'],
    rows: [
      { '日期': '2024-01-01', '销售额': 15000, '访问量': 2500, '转化率': '6.0%' },
      { '日期': '2024-01-02', '销售额': 18500, '访问量': 3200, '转化率': '5.8%' },
      { '日期': '2024-01-03', '销售额': 22000, '访问量': 4100, '转化率': '5.4%' },
    ]
  };

  const guideSteps = [
    { step: 1, title: '创建飞书应用', desc: '在飞书开放平台创建应用，获取 App ID 和 App Secret', link: 'https://open.feishu.cn/' },
    { step: 2, title: '配置权限', desc: '添加"读取多维表格"相关权限', perms: ['bitable:app:readonly', 'bitable:app:read', 'bitable:table:readonly'] },
    { step: 3, title: '获取多维表格数据', desc: '输入多维表格的 App Token 和 Table ID' },
  ];

  return (
    <Tabs defaultValue="connect" className="space-y-4">
      <TabsList>
        <TabsTrigger value="connect">连接配置</TabsTrigger>
        <TabsTrigger value="guide">集成指南</TabsTrigger>
        <TabsTrigger value="preview">数据预览</TabsTrigger>
      </TabsList>

      <TabsContent value="connect" className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="feishu-appid">App ID</Label>
            <Input id="feishu-appid" placeholder="cli_xxxxxxxxxxxxxx" value={appId} onChange={e => setAppId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feishu-secret">App Secret</Label>
            <Input id="feishu-secret" type="password" placeholder="请输入 App Secret" value={appSecret} onChange={e => setAppSecret(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feishu-token">多维表格 App Token</Label>
            <Input id="feishu-token" placeholder="BxxxxxxxxxxRxxxx" value={appToken} onChange={e => setAppToken(e.target.value)} />
            <p className="text-xs text-muted-foreground">在飞书多维表格 URL 中获取</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feishu-tableid">数据表 ID</Label>
            <Input id="feishu-tableid" placeholder="tblxxxxxxxxxx" value={tableId} onChange={e => setTableId(e.target.value)} />
          </div>

          <Button className="w-full" disabled={!appId || !appSecret || !appToken || isConnecting} onClick={handleConnect}>
            {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />连接中...</> : <>连接飞书多维表格 <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>

          {isConnected && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">连接成功</span>
              </div>
              <p className="text-sm text-green-600 mt-2">已成功连接到飞书多维表格，可以开始导入数据</p>
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing || !tableId}
              >
                {isSyncing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />同步中...</>
                ) : (
                  <><ArrowRight className="w-4 h-4 mr-2" />同步数据</>
                )}
              </Button>
              {syncMessage && (
                <p className="text-sm text-green-600 mt-2">{syncMessage}</p>
              )}
            </div>
          )}

          {connectionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">连接失败</span>
              </div>
              <p className="text-sm text-red-600 mt-2">{connectionError}</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="guide" className="space-y-4">
        <div className="space-y-4">
          {guideSteps.map(item => (
            <div key={item.step} className="flex gap-4 p-4 bg-muted/30 rounded-md">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">{item.step}</div>
              <div className="flex-1">
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-foreground mt-1">{item.desc}</p>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline mt-2">
                    前往飞书开放平台 <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {item.perms && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">所需权限：</p>
                    <div className="flex flex-wrap gap-1">
                      {item.perms.map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs font-mono">{perm}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">API 调用示例</CardTitle></CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs overflow-x-auto">
{`// 获取多维表格数据
const resp = await fetch(
  \`https://open.feishu.cn/open-apis/bitable/v1/apps/\${appToken}/tables\`,
  { headers: { 'Authorization': \`Bearer \${token}\` } }
);`}
              </pre>
              <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleCopy('https://open.feishu.cn')}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preview" className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">示例销售数据</span>
          <Button size="sm" onClick={() => onImportData?.(sampleData)}>
            导入此数据 <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>{sampleData.headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {sampleData.rows.map((row, i) => (
                <TableRow key={i}>
                  {sampleData.headers.map(h => <TableCell key={h}>{(row as Record<string, string | number | undefined>)[h]}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// 微信企业版集成
function WeChatPanel({ onImportData }: { onImportData?: (d: { headers: string[]; rows: Record<string, string | number>[] }) => void }) {
  const [corpId, setCorpId] = useState('');
  const [corpSecret, setCorpSecret] = useState('');
  const [agentId, setAgentId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  const handleConnect = useCallback(async () => {
    if (!corpId || !corpSecret) return;
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const response = await fetch('/api/platform/wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          credentials: { corpId, corpSecret, agentId },
        }),
      });

      if (!response.ok) {
        setConnectionError('连接失败，请检查配置');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
        if (result.databases) {
          setDepartments(result.databases);
        }
      } else {
        setConnectionError(result.message || '连接失败');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : '连接失败');
    } finally {
      setIsConnecting(false);
    }
  }, [corpId, corpSecret, agentId]);

  const handleSync = useCallback(async (departmentId?: string) => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/platform/wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          credentials: { corpId, corpSecret, agentId },
          departmentId: departmentId || (departments[0]?.id),
        }),
      });

      if (!response.ok) {
        setConnectionError('同步失败，请重试');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setSyncMessage(result.message || '同步成功');
      } else {
        setConnectionError(result.message || '同步失败');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : '同步失败');
    } finally {
      setIsSyncing(false);
    }
  }, [corpId, corpSecret, agentId, departments]);

  const sampleData = {
    headers: ['部门', '成员数', '活跃度', '满意度'],
    rows: [
      { '部门': '销售部', '成员数': 45, '活跃度': '92%', '满意度': '4.5' },
      { '部门': '技术部', '成员数': 38, '活跃度': '88%', '满意度': '4.7' },
      { '部门': '运营部', '成员数': 22, '活跃度': '85%', '满意度': '4.3' },
    ]
  };

  return (
    <Tabs defaultValue="connect" className="space-y-4">
      <TabsList>
        <TabsTrigger value="connect">连接配置</TabsTrigger>
        <TabsTrigger value="guide">集成指南</TabsTrigger>
        <TabsTrigger value="preview">数据预览</TabsTrigger>
      </TabsList>

      <TabsContent value="connect" className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="wx-corpid">企业 ID (Corp ID)</Label>
            <Input id="wx-corpid" placeholder="wwxxxxxxxxxxxxxx" value={corpId} onChange={e => setCorpId(e.target.value)} />
            <p className="text-xs text-muted-foreground">在微信企业微信管理后台 → 我的企业中获取</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wx-secret">应用密钥 (Secret)</Label>
            <Input id="wx-secret" type="password" placeholder="请输入应用密钥" value={corpSecret} onChange={e => setCorpSecret(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wx-agentid">应用 ID (Agent ID)</Label>
            <Input id="wx-agentid" placeholder="1000001" value={agentId} onChange={e => setAgentId(e.target.value)} />
            <p className="text-xs text-muted-foreground">在应用管理页面获取</p>
          </div>

          <Button className="w-full" disabled={!corpId || !corpSecret || isConnecting} onClick={handleConnect}>
            {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />连接中...</> : <>连接微信企业版 <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>

          {isConnected && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">连接成功</span>
              </div>
              <p className="text-sm text-green-600 mt-2">已成功连接到微信企业版</p>
              {departments.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">选择部门：</p>
                  <select
                    className="w-full mt-1 p-2 border rounded"
                    onChange={(e) => handleSync(e.target.value)}
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={() => handleSync()}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />同步中...</>
                ) : (
                  <><ArrowRight className="w-4 h-4 mr-2" />同步数据</>
                )}
              </Button>
              {syncMessage && (
                <p className="text-sm text-green-600 mt-2">{syncMessage}</p>
              )}
            </div>
          )}

          {connectionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">连接失败</span>
              </div>
              <p className="text-sm text-red-600 mt-2">{connectionError}</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="guide" className="space-y-4">
        <div className="space-y-4">
          {[
            { step: 1, title: '登录企业微信管理后台', desc: '访问 work.weixin.qq.com，登录企业管理后台', link: 'https://work.weixin.qq.com/' },
            { step: 2, title: '创建应用', desc: '在"应用管理"中创建自建应用，获取 AgentId 和 Secret' },
            { step: 3, title: '获取企业 ID', desc: '在"我的企业" → "企业信息"中获取 CorpId' },
            { step: 4, title: '配置应用权限', desc: '添加"查看企业通讯录"等接口权限' },
          ].map(item => (
            <div key={item.step} className="flex gap-4 p-4 bg-muted/30 rounded-md">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">{item.step}</div>
              <div className="flex-1">
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-foreground mt-1">{item.desc}</p>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline mt-2">
                    前往企业微信管理后台 <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="preview" className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">示例部门数据</span>
          <Button size="sm" onClick={() => onImportData?.(sampleData)}>
            导入此数据 <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>{sampleData.headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {sampleData.rows.map((row, i) => (
                <TableRow key={i}>
                  {sampleData.headers.map(h => <TableCell key={h}>{(row as Record<string, string | number | undefined>)[h]}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// 钉钉集成
function DingTalkPanel({ onImportData }: { onImportData?: (d: { headers: string[]; rows: Record<string, string | number>[] }) => void }) {
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [agentId, setAgentId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!appKey || !appSecret) return;
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const response = await fetch('/api/platform/dingtalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          credentials: { appKey, appSecret },
        }),
      });

      if (!response.ok) {
        setConnectionError('连接失败，请检查配置');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
      } else {
        setConnectionError(result.message || '连接失败');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : '连接失败');
    } finally {
      setIsConnecting(false);
    }
  }, [appKey, appSecret]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const today = new Date();
      const workDateFrom = today.toISOString().split('T')[0];
      const workDateTo = workDateFrom;

      const response = await fetch('/api/platform/dingtalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          credentials: { appKey, appSecret },
          workDateFrom,
          workDateTo,
        }),
      });

      if (!response.ok) {
        setConnectionError('同步失败，请重试');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setSyncMessage(result.message || '同步成功');
      } else {
        setConnectionError(result.message || '同步失败');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : '同步失败');
    } finally {
      setIsSyncing(false);
    }
  }, [appKey, appSecret]);

  const sampleData = {
    headers: ['姓名', '部门', '考勤天数', '任务完成率'],
    rows: [
      { '姓名': '张三', '部门': '产品部', '考勤天数': 22, '任务完成率': '95%' },
      { '姓名': '李四', '部门': '研发部', '考勤天数': 21, '任务完成率': '88%' },
      { '姓名': '王五', '部门': '市场部', '考勤天数': 20, '任务完成率': '92%' },
    ]
  };

  return (
    <Tabs defaultValue="connect" className="space-y-4">
      <TabsList>
        <TabsTrigger value="connect">连接配置</TabsTrigger>
        <TabsTrigger value="guide">集成指南</TabsTrigger>
        <TabsTrigger value="preview">数据预览</TabsTrigger>
      </TabsList>

      <TabsContent value="connect" className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="dt-appkey">App Key</Label>
            <Input id="dt-appkey" placeholder="dingxxxxxxxxxxxxxx" value={appKey} onChange={e => setAppKey(e.target.value)} />
            <p className="text-xs text-muted-foreground">在钉钉开放平台 → 应用开发 → 内部应用创建后获取</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-secret">App Secret</Label>
            <Input id="dt-secret" type="password" placeholder="请输入 App Secret" value={appSecret} onChange={e => setAppSecret(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-agentid">Agent ID</Label>
            <Input id="dt-agentid" placeholder="1234567890" value={agentId} onChange={e => setAgentId(e.target.value)} />
          </div>

          <Button className="w-full" disabled={!appKey || !appSecret || isConnecting} onClick={handleConnect}>
            {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />连接中...</> : <>连接钉钉 <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>

          {isConnected && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">连接成功</span>
              </div>
              <p className="text-sm text-green-600 mt-2">已成功连接到钉钉</p>
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />同步中...</>
                ) : (
                  <><ArrowRight className="w-4 h-4 mr-2" />同步考勤数据</>
                )}
              </Button>
              {syncMessage && (
                <p className="text-sm text-green-600 mt-2">{syncMessage}</p>
              )}
            </div>
          )}

          {connectionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">连接失败</span>
              </div>
              <p className="text-sm text-red-600 mt-2">{connectionError}</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="guide" className="space-y-4">
        <div className="space-y-4">
          {[
            { step: 1, title: '登录钉钉开放平台', desc: '访问 open.dingtalk.com，创建企业内部应用', link: 'https://open.dingtalk.com/' },
            { step: 2, title: '获取凭证', desc: '在应用详情 → 基本信息中获取 AppKey 和 AppSecret' },
            { step: 3, title: '配置权限', desc: '添加"考勤数据"、"审批数据"、"任务数据"等权限' },
            { step: 4, title: '开发调试', desc: '使用钉钉提供的 API 拉取组织成员和业务数据' },
          ].map(item => (
            <div key={item.step} className="flex gap-4 p-4 bg-muted/30 rounded-md">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">{item.step}</div>
              <div className="flex-1">
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-foreground mt-1">{item.desc}</p>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2">
                    前往钉钉开放平台 <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="preview" className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">示例考勤数据</span>
          <Button size="sm" onClick={() => onImportData?.(sampleData)}>
            导入此数据 <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>{sampleData.headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {sampleData.rows.map((row, i) => (
                <TableRow key={i}>
                  {sampleData.headers.map(h => <TableCell key={h}>{(row as Record<string, string | number | undefined>)[h]}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// WPS金山文档集成
function WPSPanel({ onImportData }: { onImportData?: (d: { headers: string[]; rows: Record<string, string | number>[] }) => void }) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [docId, setDocId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!apiKey || !apiSecret) return;
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const response = await fetch('/api/platform/wps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          credentials: { apiKey, apiSecret },
        }),
      });

      if (!response.ok) {
        setConnectionError('连接失败，请检查配置');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
      } else {
        setConnectionError(result.message || '连接失败');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : '连接失败');
    } finally {
      setIsConnecting(false);
    }
  }, [apiKey, apiSecret]);

  const handleSync = useCallback(async () => {
    if (!docId) return;
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/platform/wps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          credentials: { apiKey, apiSecret },
          docId,
        }),
      });

      if (!response.ok) {
        setConnectionError('同步失败，请重试');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setSyncMessage(result.message || '同步成功');
      } else {
        setConnectionError(result.message || '同步失败');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : '同步失败');
    } finally {
      setIsSyncing(false);
    }
  }, [apiKey, apiSecret, docId]);

  const sampleData = {
    headers: ['文档名', '创建者', '修改时间', '共享状态'],
    rows: [
      { '文档名': 'Q1销售报告', '创建者': '张经理', '修改时间': '2024-01-15', '共享状态': '已共享' },
      { '文档名': '产品需求文档', '创建者': '李产品', '修改时间': '2024-01-18', '共享状态': '内部共享' },
      { '文档名': '会议纪要', '创建者': '王助理', '修改时间': '2024-01-20', '共享状态': '未共享' },
    ]
  };

  return (
    <Tabs defaultValue="connect" className="space-y-4">
      <TabsList>
        <TabsTrigger value="connect">连接配置</TabsTrigger>
        <TabsTrigger value="guide">集成指南</TabsTrigger>
        <TabsTrigger value="preview">数据预览</TabsTrigger>
      </TabsList>

      <TabsContent value="connect" className="space-y-4">
        <div className="grid gap-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>WPS 集成需要开通金山文档企业版服务</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wps-apikey">API Key</Label>
            <Input id="wps-apikey" placeholder="请输入 API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            <p className="text-xs text-muted-foreground">在金山文档开放平台获取</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wps-secret">API Secret</Label>
            <Input id="wps-secret" type="password" placeholder="请输入 API Secret" value={apiSecret} onChange={e => setApiSecret(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wps-docid">文档 ID</Label>
            <Input id="wps-docid" placeholder="金山文档链接中的文档ID" value={docId} onChange={e => setDocId(e.target.value)} />
            <p className="text-xs text-muted-foreground">在金山文档 URL 中获取，例如：https://kdocs.cn/office/xxx/document</p>
          </div>

          <Button className="w-full" disabled={!apiKey || !apiSecret || isConnecting} onClick={handleConnect}>
            {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />连接中...</> : <>连接金山文档 <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>

          {isConnected && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">连接成功</span>
              </div>
              <p className="text-sm text-green-600 mt-2">已成功连接到金山文档</p>
              <div className="mt-3">
                <Label>文档 ID</Label>
                <Input
                  placeholder="输入文档 ID"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing || !docId}
              >
                {isSyncing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />同步中...</>
                ) : (
                  <><ArrowRight className="w-4 h-4 mr-2" />同步文档</>
                )}
              </Button>
              {syncMessage && (
                <p className="text-sm text-green-600 mt-2">{syncMessage}</p>
              )}
            </div>
          )}

          {connectionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">连接失败</span>
              </div>
              <p className="text-sm text-red-600 mt-2">{connectionError}</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="guide" className="space-y-4">
        <div className="space-y-4">
          {[
            { step: 1, title: '开通金山文档企业版', desc: '访问 kdocs.cn，开通企业版服务获取 API 凭证', link: 'https://kdocs.cn/' },
            { step: 2, title: '获取 API 凭证', desc: '在企业管理后台 → 开放平台获取 API Key 和 Secret' },
            { step: 3, title: '配置应用权限', desc: '添加文档读取权限，获取文档数据接口访问权限' },
            { step: 4, title: '连接数据', desc: '输入文档 ID，导入金山文档中的表格数据' },
          ].map(item => (
            <div key={item.step} className="flex gap-4 p-4 bg-muted/30 rounded-md">
              <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">{item.step}</div>
              <div className="flex-1">
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-foreground mt-1">{item.desc}</p>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-amber-600 hover:underline mt-2">
                    前往金山文档 <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="preview" className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">示例文档数据</span>
          <Button size="sm" onClick={() => onImportData?.(sampleData)}>
            导入此数据 <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>{sampleData.headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {sampleData.rows.map((row, i) => (
                <TableRow key={i}>
                  {sampleData.headers.map(h => <TableCell key={h}>{(row as Record<string, string | number | undefined>)[h]}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// 主组件：多平台集成面板
export function PlatformIntegrations({ onImportData }: PlatformIntegrationProps) {
  const [savedConnections, setSavedConnections] = useState<Array<{ id: string; name: string; type: string; status: 'connected' | 'error' }>>([]);
  // showAddDialog unused
  

  return (
    <div className="space-y-4">
      {/* 平台集成入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PlatformCard
          name="飞书多维表格"
          badge="Beta"
          badgeColor="bg-blue-100 text-blue-700"
          desc="连接飞书多维表格，实时同步数据"
          icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#3370FF"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#3370FF" strokeWidth="2"/></svg>}
        />
        <PlatformCard
          name="微信企业版"
          badge="Beta"
          badgeColor="bg-green-100 text-green-700"
          desc="对接企业微信，获取组织数据"
          icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="#07C160"><path d="M8.5 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm5.5 4H20a1 1 0 011 1v8a1 1 0 01-1 1h-2.04c-.48 1.68-2.04 2.9-3.87 3.12C14.1 20.12 13.05 20 12 20s-2.1.12-3.09.12C7.04 20 5.9 20.12 4 20.12A4.001 4.001 0 010 16.12V13a1 1 0 011-1h.5a6.5 6.5 0 014.5 1.7L9 15a6 6 0 006 0l1.5-1.3A6.5 6.5 0 0021 12v1a1 1 0 01-1 1z"/></svg>}
        />
        <PlatformCard
          name="钉钉"
          badge="Beta"
          badgeColor="bg-blue-100 text-blue-700"
          desc="集成钉钉考勤、审批、任务数据"
          icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="#1677FF"><circle cx="12" cy="12" r="10" fill="#1677FF"/><path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        />
        <PlatformCard
          name="金山文档"
          badge="Beta"
          badgeColor="bg-amber-100 text-amber-700"
          desc="连接 WPS 云文档，导入表格数据"
          icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#FF6A00"/><text x="6" y="17" fontSize="12" fontWeight="bold" fill="white">W</text></svg>}
        />
      </div>

      {/* 已保存的连接 */}
      {savedConnections.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">已保存的连接</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedConnections.map(conn => (
                <div key={conn.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{conn.name}</span>
                    <Badge variant="outline" className="text-xs">{conn.type}</Badge>
                    {conn.status === 'connected' ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">已连接</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">连接失败</Badge>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSavedConnections(prev => prev.filter(c => c.id !== conn.id))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 各平台详细配置 */}
      <Tabs defaultValue="feishu" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="feishu">飞书</TabsTrigger>
          <TabsTrigger value="wechat">企业微信</TabsTrigger>
          <TabsTrigger value="dingtalk">钉钉</TabsTrigger>
          <TabsTrigger value="wps">金山文档</TabsTrigger>
        </TabsList>

        <TabsContent value="feishu">
          <FeishuPanel onImportData={onImportData} />
        </TabsContent>
        <TabsContent value="wechat">
          <WeChatPanel onImportData={onImportData} />
        </TabsContent>
        <TabsContent value="dingtalk">
          <DingTalkPanel onImportData={onImportData} />
        </TabsContent>
        <TabsContent value="wps">
          <WPSPanel onImportData={onImportData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 平台卡片组件
function PlatformCard({ name, badge, badgeColor, desc, icon }: {
  name: string; badge: string; badgeColor: string; desc: string; icon: React.ReactNode;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button className="bg-white border rounded-md p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="font-medium text-sm">{name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${badgeColor}`}>{badge}</span>
          </div>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{name} 集成配置</DialogTitle>
          <DialogDescription>填写以下信息连接到 {name}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-foreground">请在下方「连接配置」标签页中填写 {name} 的凭证信息，完成连接配置。</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>关闭</Button>
          <Button onClick={() => setIsDialogOpen(false)}>去配置 <ArrowRight className="w-4 h-4 ml-1" /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
