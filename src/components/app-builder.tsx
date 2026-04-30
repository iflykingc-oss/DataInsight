'use client';

import { useState } from 'react';
import { Layout, Type, BarChart3, Table, Image, GripVertical, Trash2, Eye, Code } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface AppBlock {
  id: string;
  type: 'header' | 'text' | 'chart' | 'table' | 'image' | 'metric';
  title: string;
  config: Record<string, string>;
}

export function AppBuilder() {
  const [blocks, setBlocks] = useState<AppBlock[]>(() => {
    try { return JSON.parse(localStorage.getItem('datainsight-app-blocks') || '[]'); }
    catch { return []; }
  });
  const [preview, setPreview] = useState(false);

  const saveBlocks = (b: AppBlock[]) => {
    setBlocks(b);
    localStorage.setItem('datainsight-app-blocks', JSON.stringify(b));
  };

  const addBlock = (type: AppBlock['type']) => {
    const block: AppBlock = {
      id: `blk-${Date.now()}`,
      type,
      title: type === 'header' ? '标题' : type === 'text' ? '文本块' : type === 'chart' ? '图表' : type === 'table' ? '数据表' : type === 'image' ? '图片' : '指标卡',
      config: {},
    };
    saveBlocks([...blocks, block]);
  };

  const updateBlock = (id: string, patch: Partial<AppBlock>) => {
    saveBlocks(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const removeBlock = (id: string) => {
    saveBlocks(blocks.filter(b => b.id !== id));
  };

  const blockIcons: Record<string, typeof Type> = {
    header: Type,
    text: Type,
    chart: BarChart3,
    table: Table,
    image: Image,
    metric: Layout,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">应用设计器</h3>
          <Badge variant="secondary">{blocks.length} 组件</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">预览</span>
          <Switch checked={preview} onCheckedChange={setPreview} />
        </div>
      </div>

      {!preview && (
        <div className="flex flex-wrap gap-2">
          {(['header', 'text', 'metric', 'chart', 'table', 'image'] as const).map(type => {
            const Icon = blockIcons[type];
            return (
              <Button key={type} variant="outline" size="sm" onClick={() => addBlock(type)}>
                <Icon className="w-3.5 h-3.5 mr-1" />
                {type === 'header' ? '标题' : type === 'text' ? '文本' : type === 'metric' ? '指标' : type === 'chart' ? '图表' : type === 'table' ? '表格' : '图片'}
              </Button>
            );
          })}
        </div>
      )}

      {blocks.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>暂无组件</p>
          <p className="text-xs mt-1">拖拽式搭建业务应用界面</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, idx) => {
            const Icon = blockIcons[block.type];
            return (
              <Card key={block.id} className={`p-3 ${preview ? '' : 'border-dashed'}`}>
                {!preview ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <Icon className="w-4 h-4 text-primary" />
                      <Input
                        className="h-7 text-sm flex-1"
                        value={block.title}
                        onChange={e => updateBlock(block.id, { title: e.target.value })}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBlock(block.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                    {block.type === 'text' && (
                      <Textarea
                        rows={2}
                        placeholder="输入文本内容..."
                        value={block.config.content || ''}
                        onChange={e => updateBlock(block.id, { config: { ...block.config, content: e.target.value } })}
                      />
                    )}
                    {block.type === 'header' && (
                      <Input
                        placeholder="标题内容"
                        value={block.config.content || ''}
                        onChange={e => updateBlock(block.id, { config: { ...block.config, content: e.target.value } })}
                      />
                    )}
                    {block.type === 'metric' && (
                      <div className="flex gap-2">
                        <Input placeholder="指标名" className="h-7 text-xs" value={block.config.label || ''} onChange={e => updateBlock(block.id, { config: { ...block.config, label: e.target.value } })} />
                        <Input placeholder="数值" className="h-7 text-xs" value={block.config.value || ''} onChange={e => updateBlock(block.id, { config: { ...block.config, value: e.target.value } })} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {block.type === 'header' && <h2 className="text-lg font-bold">{block.config.content || block.title}</h2>}
                    {block.type === 'text' && <p className="text-sm text-muted-foreground">{block.config.content || '文本内容'}</p>}
                    {block.type === 'metric' && (
                      <div>
                        <p className="text-2xl font-bold">{block.config.value || '0'}</p>
                        <p className="text-xs text-muted-foreground">{block.config.label || '指标'}</p>
                      </div>
                    )}
                    {block.type === 'chart' && (
                      <div className="h-24 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">
                        <BarChart3 className="w-5 h-5 mr-1" /> 图表占位
                      </div>
                    )}
                    {block.type === 'table' && (
                      <div className="h-24 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">
                        <Table className="w-5 h-5 mr-1" /> 数据表占位
                      </div>
                    )}
                    {block.type === 'image' && (
                      <div className="h-24 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">
                        <Image className="w-5 h-5 mr-1" /> 图片占位
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
