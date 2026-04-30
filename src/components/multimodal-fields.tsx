'use client';

import { useState } from 'react';
import { Image, Mic, FileImage, Wand2, Type, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
}

interface MultimodalFieldsProps {
  data: ParsedData;
  modelConfig: { apiKey: string; baseUrl: string; model: string } | null;
}

export function MultimodalFields({ data }: MultimodalFieldsProps) {
  const [activeTab, setActiveTab] = useState<'image-gen' | 'image-recognize' | 'audio'>('image-gen');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateImage = async () => {
    if (!prompt) return;
    setLoading(true);
    // 模拟图片生成（实际接入Image Generation Skill）
    setTimeout(() => {
      setResult(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`);
      setLoading(false);
    }, 1500);
  };

  const handleTranscribe = async () => {
    setLoading(true);
    setTimeout(() => {
      setResult('这是一段模拟的音频转文字结果。实际场景下将调用ASR服务将上传的音频文件转为文字。');
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="image-gen"><Wand2 className="w-3.5 h-3.5 mr-1" /> AI生图</TabsTrigger>
          <TabsTrigger value="image-recognize"><FileImage className="w-3.5 h-3.5 mr-1" /> 图生文</TabsTrigger>
          <TabsTrigger value="audio"><Mic className="w-3.5 h-3.5 mr-1" /> 语音转写</TabsTrigger>
        </TabsList>

        <TabsContent value="image-gen" className="space-y-3">
          <Card className="p-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">图片生成提示词</label>
                <Textarea
                  placeholder="描述你想要生成的图片内容..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={3}
                />
              </div>
              <Button size="sm" onClick={handleGenerateImage} disabled={loading || !prompt}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wand2 className="w-4 h-4 mr-1" />}
                生成图片
              </Button>
              {result && activeTab === 'image-gen' && (
                <div className="mt-3">
                  <img src={result} alt="generated" className="max-w-sm rounded-lg border" />
                  <p className="text-xs text-muted-foreground mt-1">提示: 图片URL可直接填入表格单元格</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="image-recognize" className="space-y-3">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">拖拽或点击上传图片</p>
                <p className="text-xs mt-1">支持 JPG、PNG、WEBP</p>
                <Input type="file" accept="image/*" className="mt-2 max-w-xs mx-auto" />
              </div>
              <Button size="sm" onClick={() => { setResult('图片中展示了一个数据仪表盘界面，包含多个图表和KPI指标卡片。'); }}>
                <FileImage className="w-4 h-4 mr-1" /> 识别图片
              </Button>
              {result && activeTab === 'image-recognize' && (
                <Card className="p-3 bg-muted/50">
                  <p className="text-sm"><Type className="w-3.5 h-3.5 inline mr-1" /> {result}</p>
                </Card>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="audio" className="space-y-3">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">拖拽或点击上传音频</p>
                <p className="text-xs mt-1">支持 MP3、WAV、M4A</p>
                <Input type="file" accept="audio/*" className="mt-2 max-w-xs mx-auto" />
              </div>
              <Button size="sm" onClick={handleTranscribe} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
                开始转写
              </Button>
              {result && activeTab === 'audio' && (
                <Card className="p-3 bg-muted/50">
                  <p className="text-sm"><Type className="w-3.5 h-3.5 inline mr-1" /> {result}</p>
                </Card>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 多模态字段说明 */}
      <Card className="p-3">
        <h4 className="text-xs font-medium mb-2">可用多模态字段类型</h4>
        <div className="flex flex-wrap gap-2">
          {['图片生成', '图片识别', '语音转写', '视频分析'].map(t => (
            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          提示：实际生产环境需配置对应的多模态模型API密钥。
        </p>
      </Card>
    </div>
  );
}
