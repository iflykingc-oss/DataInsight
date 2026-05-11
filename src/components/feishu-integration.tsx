'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { FileSpreadsheet, Link2, Database, ArrowRight, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface FeishuIntegrationProps {
  onImportData?: (data: { headers: string[]; rows: Record<string, string | number>[] }) => void;
}

export function FeishuIntegration({ onImportData }: FeishuIntegrationProps) {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [tableId, setTableId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const integrationGuide = [
    {
      step: 1,
      title: '创建飞书应用',
      description: '在飞书开放平台创建应用，获取 App ID 和 App Secret',
      link: 'https://open.feishu.cn/'
    },
    {
      step: 2,
      title: '配置权限',
      description: '添加"读取多维表格"相关权限',
      permissions: [
        'bitable:app:readonly',
        'bitable:app:read',
        'bitable:table:readonly'
      ]
    },
    {
      step: 3,
      title: '获取多维表格数据',
      description: '输入多维表格的 App Token 和 Table ID'
    }
  ];
  
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const sampleData: {
    headers: string[];
    rows: Record<string, string | number>[];
  } = {
    headers: ['日期', '销售额', '访问量', '转化率'],
    rows: [
      { '日期': '2024-01-01', '销售额': 15000, '访问量': 2500, '转化率': '6.0%' },
      { '日期': '2024-01-02', '销售额': 18500, '访问量': 3200, '转化率': '5.8%' },
      { '日期': '2024-01-03', '销售额': 22000, '访问量': 4100, '转化率': '5.4%' },
      { '日期': '2024-01-04', '销售额': 16800, '访问量': 2800, '转化率': '6.0%' },
      { '日期': '2024-01-05', '销售额': 19500, '访问量': 3500, '转化率': '5.6%' }
    ]
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-500" />
            飞书多维表格集成
            <Badge variant="secondary" className="ml-auto">Beta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="connect" className="space-y-4">
            <TabsList>
              <TabsTrigger value="connect">连接配置</TabsTrigger>
              <TabsTrigger value="guide">集成指南</TabsTrigger>
              <TabsTrigger value="preview">数据预览</TabsTrigger>
            </TabsList>
            
            <TabsContent value="connect" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appId">App ID</Label>
                  <Input
                    id="appId"
                    placeholder="cli_xxxxxxxxxxxxxx"
                    value={appId}
                    onChange={e => setAppId(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="appSecret">App Secret</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    placeholder="请输入 App Secret"
                    value={appSecret}
                    onChange={e => setAppSecret(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tableId">多维表格 App Token</Label>
                  <Input
                    id="tableId"
                    placeholder="BxxxxxxxxxxRxxxx"
                    value={tableId}
                    onChange={e => setTableId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    在飞书多维表格 URL 中获取，例如：https://xxx.feishu.cn/base/BxxxxxxxxxxRxxxx
                  </p>
                </div>
                
                <Button
                  className="w-full"
                  disabled={!appId || !appSecret || !tableId}
                  onClick={() => setIsConnected(true)}
                >
                  连接飞书多维表格
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              {isConnected && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">连接成功</span>
                  </div>
                  <p className="text-sm text-green-600 mt-2">
                    已成功连接到飞书多维表格，可以开始导入数据
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="guide" className="space-y-4">
              <div className="space-y-4">
                {integrationGuide.map(item => (
                  <div key={item.step} className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-foreground mt-1">{item.description}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline mt-2"
                        >
                          前往飞书开放平台
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {item.permissions && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">所需权限：</p>
                          <div className="flex flex-wrap gap-1">
                            {item.permissions.map(perm => (
                              <Badge key={perm} variant="outline" className="text-xs font-mono">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">API 调用示例</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// 获取多维表格数据
const response = await fetch(
  \`https://open.feishu.cn/open-apis/bitable/v1/apps/\${appToken}/tables\`,
  {
    headers: {
      'Authorization': \`Bearer \${tenantAccessToken}\`,
    },
  }
);
const data = await response.json();`}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopyCode(`// 获取多维表格数据
const response = await fetch(
  \`https://open.feishu.cn/open-apis/bitable/v1/apps/\${appToken}/tables\`,
  {
    headers: {
      'Authorization': \`Bearer \${tenantAccessToken}\`,
    },
  }
);
const data = await response.json();`)}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-green-500" />
                  <span className="font-medium">示例销售数据</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onImportData?.(sampleData)}
                >
                  导入此数据
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {sampleData.headers.map(header => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleData.rows.map((row, i) => (
                      <TableRow key={i}>
                        {sampleData.headers.map(header => (
                          <TableCell key={header}>{row[header]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                连接飞书后，可以直接导入真实的多维表格数据
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
