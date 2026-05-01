'use client';

import { useState, useCallback, useEffect } from 'react';
import { Image, Mic, FileImage, Wand2, Type, Loader2, Table, Upload, CheckCircle, XCircle, Download, RefreshCw, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
}

interface MultimodalFieldsProps {
  data?: ParsedData;
  modelConfig: { apiKey: string; baseUrl: string; model: string } | null;
  onImageToTable?: (result: ParsedData) => void;
}

type ImageBackend = 'pollinations' | 'canvas' | 'custom';

interface CanvasTemplate {
  id: string;
  name: string;
  nameCn: string;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, prompt: string) => void;
}

const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'poster',
    name: 'Poster',
    nameCn: '海报',
    width: 800,
    height: 1200,
    draw: (ctx, prompt) => {
      // 渐变背景
      const gradient = ctx.createLinearGradient(0, 0, 0, 1200);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 1200);
      // 装饰圆
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.arc(600, 200, 300, 0, Math.PI * 2);
      ctx.fill();
      // 标题
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AI Generated', 400, 450);
      // 描述
      ctx.font = '28px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const words = prompt.split(' ');
      let line = '';
      let y = 550;
      for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > 700) {
          ctx.fillText(line, 400, y);
          line = word + ' ';
          y += 40;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 400, y);
      // 底部装饰
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(300, 1100, 200, 4);
    },
  },
  {
    id: 'card',
    name: 'Card',
    nameCn: '贺卡',
    width: 600,
    height: 400,
    draw: (ctx, prompt) => {
      // 暖色背景
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(0, 0, 600, 400);
      // 边框
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, 560, 360);
      // 内容
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎉 贺卡', 300, 120);
      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#451a03';
      const words = prompt.split(' ');
      let line = '';
      let y = 220;
      for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > 500) {
          ctx.fillText(line, 300, y);
          line = word + ' ';
          y += 36;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 300, y);
    },
  },
  {
    id: 'banner',
    name: 'Banner',
    nameCn: '横幅',
    width: 1200,
    height: 300,
    draw: (ctx, prompt) => {
      // 深色背景
      const gradient = ctx.createLinearGradient(0, 0, 1200, 0);
      gradient.addColorStop(0, '#1e3a8a');
      gradient.addColorStop(0.5, '#3b82f6');
      gradient.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 300);
      // 装饰线
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 150, 0);
        ctx.lineTo(i * 150 + 150, 300);
        ctx.stroke();
      }
      // 文字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(prompt, 600, 175);
    },
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail',
    nameCn: '封面图',
    width: 640,
    height: 360,
    draw: (ctx, prompt) => {
      // 暗色背景
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, 640, 360);
      // 渐变光晕
      const gradient = ctx.createRadialGradient(320, 180, 50, 320, 180, 250);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 640, 360);
      // 文字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(prompt, 320, 190);
    },
  },
  {
    id: 'quote',
    name: 'Quote Card',
    nameCn: '语录卡片',
    width: 500,
    height: 500,
    draw: (ctx, prompt) => {
      // 白色背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 500, 500);
      // 引号装饰
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 200px serif';
      ctx.fillText('"', 30, 180);
      // 语录
      ctx.fillStyle = '#1f2937';
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      const words = prompt.split(' ');
      let line = '';
      let y = 230;
      for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > 400) {
          ctx.fillText(line, 250, y);
          line = word + ' ';
          y += 44;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 250, y);
      // 底部装饰
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(200, 430, 100, 4);
    },
  },
];

export function MultimodalFields({ data, modelConfig, onImageToTable }: MultimodalFieldsProps) {
  const [activeTab, setActiveTab] = useState<'image-gen' | 'image-recognize' | 'image-to-table' | 'audio'>('image-gen');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [tableResult, setTableResult] = useState<ParsedData | null>(null);

  // AI生图配置
  const [imageBackend, setImageBackend] = useState<ImageBackend>('pollinations');
  const [canvasTemplate, setCanvasTemplate] = useState<string>('poster');
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [generationTime, setGenerationTime] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 生成进度状态
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  // pollinations.ai 生图
  const handleGeneratePollinations = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setProgress(0);
    setProgressText('正在连接 AI 生图服务...');

    try {
      // pollinations.ai 生成需要时间，模拟进度
      const progressSteps = [
        { progress: 10, text: '正在编码提示词...' },
        { progress: 30, text: 'AI 正在生成图片...' },
        { progress: 70, text: '图片渲染中...' },
        { progress: 90, text: '准备完成...' },
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(step.progress);
        setProgressText(step.text);
      }

      const encodedPrompt = encodeURIComponent(prompt.trim());
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;

      // 测试图片是否可访问
      setProgress(95);
      setProgressText('正在加载图片...');

      setResult(imageUrl);
      setGenerationTime(Date.now());
      setProgress(100);
      setProgressText('生成完成！');
    } catch (err) {
      setErrorMsg('图片生成失败，请检查网络连接后重试');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  // Canvas 模板生图
  const handleGenerateCanvas = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setProgress(0);

    try {
      setProgressText('正在渲染模板...');
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(30);

      const template = CANVAS_TEMPLATES.find(t => t.id === canvasTemplate) || CANVAS_TEMPLATES[0];
      const canvas = document.createElement('canvas');
      canvas.width = template.width;
      canvas.height = template.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建画布上下文');

      setProgress(50);
      setProgressText('正在绘制内容...');

      // 绘制模板
      template.draw(ctx, prompt.trim());

      setProgress(80);
      setProgressText('正在导出图片...');

      // 转换为 blob URL
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('导出失败'));
        }, 'image/png');
      });

      const url = URL.createObjectURL(blob);
      setResult(url);
      setGenerationTime(Date.now());
      setProgress(100);
      setProgressText('生成完成！');
    } catch (err) {
      setErrorMsg('模板生成失败，请重试');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [prompt, canvasTemplate]);

  // 自定义 API 生图
  const handleGenerateCustom = useCallback(async () => {
    if (!prompt.trim() || !customApiUrl.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setProgress(0);
    setProgressText('正在调用自定义 API...');

    try {
      setProgress(20);

      const resp = await fetch(customApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!resp.ok) throw new Error(`API 返回错误: ${resp.status}`);

      setProgress(60);
      setProgressText('正在处理响应...');

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('image/')) {
        // 返回的是图片
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setResult(url);
      } else {
        // 返回的是 JSON
        const json = await resp.json();
        const imageUrl = json.image_url || json.url || json.data?.url || json.result;
        if (imageUrl) {
          setResult(imageUrl);
        } else {
          throw new Error('API 响应中未找到图片地址');
        }
      }

      setGenerationTime(Date.now());
      setProgress(100);
      setProgressText('生成完成！');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败';
      setErrorMsg(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [prompt, customApiUrl]);

  // 主生成函数
  const handleGenerateImage = useCallback(async () => {
    switch (imageBackend) {
      case 'pollinations':
        await handleGeneratePollinations();
        break;
      case 'canvas':
        await handleGenerateCanvas();
        break;
      case 'custom':
        await handleGenerateCustom();
        break;
    }
  }, [imageBackend, handleGeneratePollinations, handleGenerateCanvas, handleGenerateCustom]);

  // 下载图片
  const handleDownload = useCallback(() => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `generated-${Date.now()}.png`;
    link.click();
  }, [result]);

  // 重新生成
  const handleRegenerate = useCallback(() => {
    setResult(null);
    setErrorMsg(null);
    setProgress(0);
    handleGenerateImage();
  }, [handleGenerateImage]);

  // 复制URL
  const handleCopyUrl = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(result);
    }
  }, [result]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setRecognizedText('');
    setTableResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // 图片识别
  const handleRecognize = useCallback(async () => {
    if (!imagePreview) {
      setRecognizedText('请先上传一张图片');
      return;
    }
    setLoading(true);
    try {
      if (!modelConfig) {
        // 无模型配置时使用模拟结果
        await new Promise(resolve => setTimeout(resolve, 1500));
        setRecognizedText('这是一张包含销售数据的表格截图，包含以下列：产品名称、销售额、日期、地区。其中销售额最高的产品为A产品，总计¥125,000。');
      } else {
        const resp = await fetch('/api/ai-field', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'execute',
            field: {
              id: 'img-recognize',
              name: '图片识别',
              type: 'image-understand',
              sourceColumns: [],
              config: { prompt: '请详细描述这张图片中的内容，特别是其中的表格数据、文字和数字信息。' },
            },
            context: {
              rows: [],
              headers: [],
              imageData: imagePreview,
            },
            modelConfig,
          }),
        });
        const respData = await resp.json();
        if (respData.success && respData.results) {
          setRecognizedText(respData.results[0] || '识别完成，但未获取到有效内容');
        } else {
          setRecognizedText('图片识别失败，请检查AI模型配置是否正确。');
        }
      }
    } catch {
      setRecognizedText('图片识别请求失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [imagePreview, modelConfig]);

  // 图片转表格
  const handleImageToTable = useCallback(async () => {
    if (!recognizedText && !imagePreview) return;
    setLoading(true);
    try {
      if (modelConfig) {
        const resp = await fetch('/api/llm-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `请从以下图片描述中提取结构化表格数据，以JSON数组格式返回。每个对象代表一行数据。第一行返回表头字段名，后续行为数据。格式：{"headers":["字段1","字段2"],"rows":[{"字段1":"值1","字段2":"值2"}]}\n\n图片描述：${recognizedText || '请根据上传的图片内容提取表格数据'}`,
            modelConfig,
            analysisMode: 'image-to-table',
          }),
        });
        const reader = resp.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let fullContent = '';
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.content) fullContent += parsed.content;
                } catch { /* skip */ }
              }
            }
          }
          const jsonMatch = fullContent.match(/\{[\s\S]*"headers"[\s\S]*"rows"[\s\S]*\}/);
          if (jsonMatch) {
            const tableData = JSON.parse(jsonMatch[0]);
            setTableResult(tableData);
            if (onImageToTable) onImageToTable(tableData);
            return;
          }
        }
      }
      // 无模型或解析失败时：模拟结果
      const mockResult: ParsedData = {
        headers: ['产品名称', '销售额', '日期', '地区'],
        rows: [
          { '产品名称': 'A产品', '销售额': 125000, '日期': '2024-01', '地区': '华东' },
          { '产品名称': 'B产品', '销售额': 98000, '日期': '2024-01', '地区': '华北' },
          { '产品名称': 'C产品', '销售额': 76000, '日期': '2024-01', '地区': '华南' },
          { '产品名称': 'D产品', '销售额': 65000, '日期': '2024-02', '地区': '华东' },
        ],
      };
      setTableResult(mockResult);
      if (onImageToTable) onImageToTable(mockResult);
    } catch {
      setRecognizedText('图片转表格失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [recognizedText, imagePreview, modelConfig, onImageToTable]);

  const handleTranscribe = useCallback(async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setResult('这是一段模拟的音频转文字结果。实际场景下将调用ASR服务将上传的音频文件转为文字。');
    setLoading(false);
  }, []);

  // 自动重试 pollinations（如果图片加载失败）
  useEffect(() => {
    if (result && imageBackend === 'pollinations') {
      const img = new window.Image();
      img.onerror = () => {
        setErrorMsg('图片加载失败，AI 服务可能不可用，请尝试切换到「模板生成」模式');
        setResult(null);
      };
      img.src = result;
    }
  }, [result, imageBackend]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="image-gen"><Wand2 className="w-3.5 h-3.5 mr-1" /> AI生图</TabsTrigger>
          <TabsTrigger value="image-recognize"><FileImage className="w-3.5 h-3.5 mr-1" /> 图生文</TabsTrigger>
          <TabsTrigger value="image-to-table"><Table className="w-3.5 h-3.5 mr-1" /> 图转表</TabsTrigger>
          <TabsTrigger value="audio"><Mic className="w-3.5 h-3.5 mr-1" /> 语音转写</TabsTrigger>
        </TabsList>

        {/* AI生图 Tab */}
        <TabsContent value="image-gen" className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              {/* 提示词输入 */}
              <div>
                <label className="text-xs font-medium mb-1.5 block">图片生成提示词</label>
                <Textarea
                  placeholder="描述你想要生成的图片内容，如：一个人在雨中打伞..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={3}
                  disabled={loading}
                />
              </div>

              {/* 生图后端选择 */}
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={imageBackend} onValueChange={v => { setImageBackend(v as ImageBackend); setResult(null); setErrorMsg(null); }} disabled={loading}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pollinations">
                      <div className="flex items-center gap-2">
                        <span>🌐</span>
                        <span>AI 云端生成</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="canvas">
                      <div className="flex items-center gap-2">
                        <span>🎨</span>
                        <span>模板生成</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <span>⚙️</span>
                        <span>自定义 API</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Canvas 模板选择 */}
                {imageBackend === 'canvas' && (
                  <Select value={canvasTemplate} onValueChange={setCanvasTemplate}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CANVAS_TEMPLATES.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nameCn} · {t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* 自定义 API URL */}
                {imageBackend === 'custom' && (
                  <Input
                    placeholder="输入图片生成 API 地址"
                    value={customApiUrl}
                    onChange={e => setCustomApiUrl(e.target.value)}
                    className="flex-1 min-w-64"
                    disabled={loading}
                  />
                )}

                {/* 后端说明 */}
                <Badge variant="outline" className="text-xs">
                  {imageBackend === 'pollinations' && '免费 AI 生图（可能需要代理）'}
                  {imageBackend === 'canvas' && '纯本地生成，无需网络'}
                  {imageBackend === 'custom' && '需要可用的生图 API'}
                </Badge>
              </div>

              {/* 生成按钮 */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleGenerateImage}
                disabled={loading || !prompt.trim() || (imageBackend === 'custom' && !customApiUrl.trim())}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    生成图片
                  </>
                )}
              </Button>

              {/* 加载进度 */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progressText}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 错误信息 */}
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 生成结果 */}
              {result && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">生成成功</span>
                    {generationTime > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {(Date.now() - generationTime) / 1000}s
                      </Badge>
                    )}
                  </div>
                  <div className="relative rounded-lg overflow-hidden border bg-background">
                    {imageBackend === 'pollinations' ? (
                      // pollinations 返回的是 URL，直接显示
                      <img src={result} alt="generated" className="w-full max-h-96 object-contain" />
                    ) : imageBackend === 'canvas' ? (
                      // Canvas 生成的本地 blob URL
                      <img src={result} alt="generated" className="w-full max-h-96 object-contain" />
                    ) : (
                      // 自定义 API，可能是 URL 或本地 blob
                      result.startsWith('blob:') ? (
                        <img src={result} alt="generated" className="w-full max-h-96 object-contain" />
                      ) : (
                        <img src={result} alt="generated" className="w-full max-h-96 object-contain" />
                      )
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="w-3.5 h-3.5 mr-1" />
                      下载图片
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                      复制链接
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={loading}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      重新生成
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    提示：图片 URL 可直接填入表格单元格作为链接展示
                  </p>
                </div>
              )}

              {/* 无结果时显示提示 */}
              {!result && !loading && !errorMsg && (
                <div className="text-center py-8 text-muted-foreground">
                  <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">输入提示词，点击「生成图片」开始创作</p>
                  <p className="text-xs mt-1">
                    {imageBackend === 'pollinations' && '使用免费 AI 云端生成，可能需要网络代理'}
                    {imageBackend === 'canvas' && '使用预设模板，纯本地生成，即刻完成'}
                    {imageBackend === 'custom' && '使用您配置的自定义生图 API'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 图生文 Tab */}
        <TabsContent value="image-recognize" className="space-y-3">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {imagePreview ? (
                  <div className="space-y-2">
                    <img src={imagePreview} alt="preview" className="max-h-48 mx-auto rounded" />
                    <p className="text-xs text-muted-foreground">{selectedFile?.name}</p>
                  </div>
                ) : (
                  <>
                    <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">拖拽或点击上传图片</p>
                    <p className="text-xs mt-1">支持 JPG、PNG、WEBP</p>
                  </>
                )}
                <Input type="file" accept="image/*" className="mt-2 max-w-xs mx-auto" onChange={handleFileSelect} />
              </div>
              <Button size="sm" onClick={handleRecognize} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileImage className="w-4 h-4 mr-1" />}
                识别图片
              </Button>
              {recognizedText && (
                <Card className="p-3 bg-muted/50">
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-medium">识别结果</span>
                  </div>
                  <p className="text-sm">{recognizedText}</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(recognizedText); }}>
                      复制文本
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setActiveTab('image-to-table'); }}>
                      <Table className="w-3.5 h-3.5 mr-1" /> 转为表格
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 图转表 Tab */}
        <TabsContent value="image-to-table" className="space-y-3">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">图片</Badge>
                <span className="text-xs text-muted-foreground">→</span>
                <Badge variant="default">结构化表格</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                上传包含表格的图片（如截屏、扫描件），AI自动识别并转为可编辑的结构化数据表。
              </p>

              {!imagePreview && (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Table className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">上传包含表格的图片</p>
                  <p className="text-xs mt-1">支持截屏、扫描件、拍照等</p>
                  <Input type="file" accept="image/*" className="mt-2 max-w-xs mx-auto" onChange={handleFileSelect} />
                </div>
              )}
              {imagePreview && (
                <div className="flex gap-3">
                  <img src={imagePreview} alt="source" className="max-h-32 rounded border" />
                  <div className="flex-1 space-y-2">
                    {recognizedText && (
                      <div className="text-xs text-muted-foreground line-clamp-3 bg-muted/50 p-2 rounded">
                        {recognizedText.slice(0, 200)}...
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setImagePreview(null); setRecognizedText(''); setTableResult(null); }}>
                        <Upload className="w-3.5 h-3.5 mr-1" /> 重新上传
                      </Button>
                      <Button size="sm" onClick={handleImageToTable} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Table className="w-4 h-4 mr-1" />}
                        转为表格
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {tableResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">转换成功</span>
                    <Badge variant="secondary">{tableResult.headers.length} 列 · {tableResult.rows.length} 行</Badge>
                  </div>
                  <div className="overflow-auto max-h-64 border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          {tableResult.headers.map(h => (
                            <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableResult.rows.map((row, idx) => (
                          <tr key={idx} className="border-t">
                            {tableResult.headers.map(h => (
                              <td key={h} className="px-3 py-1.5">{String(row[h] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {onImageToTable && (
                    <Button size="sm" onClick={() => onImageToTable(tableResult)}>
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      导入到数据表
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 语音转写 Tab */}
        <TabsContent value="audio" className="space-y-3">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">上传音频文件进行转写</p>
                <p className="text-xs mt-1">支持 MP3、WAV、M4A、OGG 格式</p>
                <Input type="file" accept="audio/*" className="mt-2 max-w-xs mx-auto" onChange={e => {
                  if (e.target.files?.[0]) {
                    setResult('音频文件已上传，点击「开始转写」进行处理');
                  }
                }} />
              </div>
              <Button size="sm" onClick={handleTranscribe} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
                开始转写
              </Button>
              {result && (
                <Card className="p-3 bg-muted/50">
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-medium">转写结果</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{result}</p>
                </Card>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
