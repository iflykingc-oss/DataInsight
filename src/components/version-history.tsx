'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader} from '@/components/ui/card';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  History,
  Clock,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  Eye,
  MoreVertical,
  LayoutDashboard,
  FileText,
  Database,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Copy,
  Download,
  Upload,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

// 资源类型
type ResourceType = 'dashboard' | 'report' | 'data';

// 快照内容
interface SnapshotContent {
  dashboard?: Record<string, unknown>;
  report?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

// 版本快照
export interface Snapshot {
  id: string;
  name: string;
  description?: string;
  resourceType: ResourceType;
  resourceId: string;
  content: SnapshotContent;
  version: number;
  createdAt: number;
  updatedAt: number;
  size?: number; // 预估大小（KB）
  tags?: string[];
}

// 资源信息
interface ResourceInfo {
  id: string;
  name: string;
  type: ResourceType;
  updatedAt: number;
}

// 本地存储键名
const SNAPSHOTS_STORAGE_KEY = 'datainsight_snapshots';

interface VersionHistoryProps {
  resourceId?: string;
  resourceType?: ResourceType;
  currentContent?: SnapshotContent;
  onRestore?: (snapshot: Snapshot) => void;
  onSnapshotCreate?: (name: string, description?: string) => void;
  className?: string;
}

export function VersionHistory({
  resourceId,
  resourceType = 'dashboard',
  currentContent,
  onRestore,
  onSnapshotCreate,
  className
}: VersionHistoryProps) {
  // 状态
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(resourceId || null);
  const [activeTab, setActiveTab] = useState<'history' | 'compare'>('history');
  const [isCreating, setIsCreating] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [compareSnapshot, setCompareSnapshot] = useState<Snapshot | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 加载快照和资源
  useEffect(() => {
    const saved = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSnapshots(parsed);
        
        // 提取资源列表
        const resourceMap = new Map<string, ResourceInfo>();
        parsed.forEach((s: Snapshot) => {
          if (!resourceMap.has(s.resourceId)) {
            resourceMap.set(s.resourceId, {
              id: s.resourceId,
              name: s.name.split(' - ')[0] || s.resourceType,
              type: s.resourceType,
              updatedAt: s.createdAt
            });
          }
        });
        setResources(Array.from(resourceMap.values()));
      } catch {
        console.error('Failed to load snapshots');
      }
    }
  }, []);

  // 保存快照
  useEffect(() => {
    if (snapshots.length > 0) {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
    }
  }, [snapshots]);

  // 当前资源关联的快照
  const filteredSnapshots = useMemo(() => {
    if (!selectedResourceId) return snapshots;
    return snapshots
      .filter(s => s.resourceId === selectedResourceId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [snapshots, selectedResourceId]);

  // 创建新快照
  const handleCreateSnapshot = () => {
    if (!newSnapshotName.trim() || !currentContent) return;

    const latestVersion = filteredSnapshots.length > 0 
      ? Math.max(...filteredSnapshots.map(s => s.version))
      : 0;

    const newSnapshot: Snapshot = {
      id: `snapshot-${Date.now()}`,
      name: newSnapshotName,
      description: newSnapshotDesc,
      resourceType,
      resourceId: selectedResourceId || `res-${Date.now()}`,
      content: currentContent,
      version: latestVersion + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      size: Math.ceil(JSON.stringify(currentContent).length / 1024),
      tags: []
    };

    setSnapshots(prev => [...prev, newSnapshot]);
    setNewSnapshotName('');
    setNewSnapshotDesc('');
    setIsDialogOpen(false);
    onSnapshotCreate?.(newSnapshotName, newSnapshotDesc);
  };

  // 恢复快照
  const handleRestore = async (snapshot: Snapshot) => {
    setIsRestoring(true);
    
    // 模拟恢复过程
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onRestore?.(snapshot);
    setIsRestoring(false);
  };

  // 删除快照
  const handleDelete = (id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  };

  // 复制快照
  const handleDuplicate = (snapshot: Snapshot) => {
    const duplicated: Snapshot = {
      ...snapshot,
      id: `snapshot-${Date.now()}`,
      name: `${snapshot.name} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setSnapshots(prev => [...prev, duplicated]);
  };

  // 导出快照
  const handleExport = (snapshot: Snapshot) => {
    const dataStr = JSON.stringify(snapshot, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${snapshot.name.replace(/\s+/g, '_')}_v${snapshot.version}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取资源类型图标
  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'dashboard':
        return LayoutDashboard;
      case 'report':
        return FileText;
      case 'data':
        return Database;
    }
  };

  // 获取资源类型名称
  const getResourceName = (type: ResourceType): string => {
    switch (type) {
      case 'dashboard':
        return '仪表盘';
      case 'report':
        return '报表';
      case 'data':
        return '数据集';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium">版本历史</h3>
          {filteredSnapshots.length > 0 && (
            <Badge variant="secondary">{filteredSnapshots.length} 个版本</Badge>
          )}
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              onClick={() => setIsDialogOpen(true)}
              disabled={!currentContent}
            >
              <Plus className="w-4 h-4 mr-1" />
              创建快照
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>创建新快照</DialogTitle>
              <DialogDescription>
                保存当前状态的快照，方便以后恢复或对比
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="snapshot-name">快照名称 *</Label>
                <Input
                  id="snapshot-name"
                  placeholder="如：月度报表 v1.0"
                  value={newSnapshotName}
                  onChange={e => setNewSnapshotName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="snapshot-desc">描述（可选）</Label>
                <Input
                  id="snapshot-desc"
                  placeholder="描述这个版本的特点..."
                  value={newSnapshotDesc}
                  onChange={e => setNewSnapshotDesc(e.target.value)}
                />
              </div>

              {currentContent && (
                <div className="p-3 bg-muted/30 rounded-md text-sm text-foreground">
                  <p>预估大小：约 {Math.ceil(JSON.stringify(currentContent).length / 1024)} KB</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateSnapshot} disabled={!newSnapshotName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                创建快照
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 资源选择 */}
      {resources.length > 0 && (
        <div className="flex items-center gap-2 pb-2 border-b overflow-x-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap">资源：</span>
          <button
            onClick={() => setSelectedResourceId(null)}
            className={cn(
              'px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors',
              !selectedResourceId 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-muted'
            )}
          >
            全部
          </button>
          {resources.map(resource => {
            const Icon = getResourceIcon(resource.type);
            return (
              <button
                key={resource.id}
                onClick={() => setSelectedResourceId(resource.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1',
                  selectedResourceId === resource.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-muted'
                )}
              >
                <Icon className="w-3 h-3" />
                {resource.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'history' | 'compare')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="w-4 h-4" />
            版本列表
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-1">
            <Copy className="w-4 h-4" />
            对比视图
          </TabsTrigger>
        </TabsList>

        {/* 版本列表 */}
        <TabsContent value="history" className="mt-4">
          {filteredSnapshots.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">暂无版本快照</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentContent ? '点击上方按钮创建第一个快照' : '加载数据后可以创建快照'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredSnapshots.map((snapshot, index) => {
                const isLatest = index === 0;
                const Icon = getResourceIcon(snapshot.resourceType);
                
                return (
                  <Card 
                    key={snapshot.id}
                    className={cn(
                      'transition-all hover:shadow-md',
                      isLatest && 'border-blue-200 bg-blue-50/50'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'p-2 rounded-md',
                            isLatest ? 'bg-blue-100' : 'bg-muted'
                          )}>
                            <Icon className={cn(
                              'w-5 h-5',
                              isLatest ? 'text-blue-600' : 'text-foreground'
                            )} />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{snapshot.name}</h4>
                              {isLatest && (
                                <Badge variant="default" className="text-xs">最新</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                v{snapshot.version}
                              </Badge>
                            </div>
                            
                            {snapshot.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {snapshot.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(snapshot.createdAt)}
                              </span>
                              {snapshot.size && (
                                <span>{snapshot.size} KB</span>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {getResourceName(snapshot.resourceType)}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* 操作 */}
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCompareSnapshot(snapshot)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>预览</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRestore(snapshot)}
                                disabled={isRestoring}
                              >
                                {isRestoring ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>恢复到该版本</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDuplicate(snapshot)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>复制版本</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExport(snapshot)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>导出</TooltipContent>
                          </Tooltip>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(snapshot.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 对比视图 */}
        <TabsContent value="compare" className="mt-4">
          {filteredSnapshots.length < 2 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Copy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">需要至少 2 个版本才能对比</p>
                <p className="text-sm text-muted-foreground mt-1">
                  创建更多快照后可以使用对比功能
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>选择版本 A</Label>
                  <select 
                    className="w-full mt-1 p-2 border rounded"
                    onChange={e => {
                      const snapshot = filteredSnapshots.find(s => s.id === e.target.value);
                      if (snapshot) setCompareSnapshot(snapshot);
                    }}
                  >
                    {filteredSnapshots.map(s => (
                      <option key={s.id} value={s.id}>
                        v{s.version} - {s.name} ({formatTime(s.createdAt)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center mt-6">
                  <ChevronRight className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <Label>选择版本 B</Label>
                  <select 
                    className="w-full mt-1 p-2 border rounded"
                    defaultValue={filteredSnapshots[0]?.id}
                  >
                    {filteredSnapshots.slice(1).map(s => (
                      <option key={s.id} value={s.id}>
                        v{s.version} - {s.name} ({formatTime(s.createdAt)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {compareSnapshot && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">对比预览</span>
                    </div>
                    <pre className="text-xs bg-white p-3 rounded overflow-auto max-h-[300px]">
                      {JSON.stringify(compareSnapshot.content, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 使用提示 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-700">
              <p className="font-medium">版本管理提示</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>创建快照保存重要节点，方便回滚</li>
                <li>可以导出快照为 JSON 文件进行备份</li>
                <li>恢复快照会覆盖当前内容，请谨慎操作</li>
                <li>建议在重大修改前创建快照</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VersionHistory;
