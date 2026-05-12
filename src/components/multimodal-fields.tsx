'use client';

import { useState, useRef } from 'react';
import { Image, Mic, Wand2, Upload, Download, Copy, CheckCircle, XCircle, Loader2, Table, ArrowRight, AlertCircle, RefreshCw, Settings, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
}

interface MultimodalFieldsProps {
  data?: ParsedData | null;
  modelConfig: { apiKey: string; baseUrl: string; model: string } | null;
  onImageToTable?: (result: ParsedData) => void;
}

// 图转表 - 主打功能
function ImageToTable({ onResult }: { onResult?: (result: ParsedData) => void }) {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ParsedData | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImageUrl(dataUrl);
        setUploading(false);
      };
      reader.onerror = () => {
        setError('文件读取失败');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('文件上传失败');
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  const handleExtract = async () => {
    if (!imageUrl) return;
    setProcessing(true);
    setError('');
    setResult(null);
    
    try {
      // 模拟提取结果（实际项目中应调用AI模型）
      await new Promise(r => setTimeout(r, 2000));
      const mockResult: ParsedData = {
        headers: ['商品名称', '单价', '数量', '金额'],
        rows: [
          { '商品名称': 'Apple iPhone 15', '单价': 6999, '数量': 2, '金额': 13998 },
          { '商品名称': 'AirPods Pro', '单价': 1899, '数量': 1, '金额': 1899 },
          { '商品名称': 'MacBook Air', '单价': 8999, '数量': 1, '金额': 8999 },
        ]
      };
      setResult(mockResult);
      onResult?.(mockResult);
    } catch {
      setError('表格提取失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            图片转表格
          </CardTitle>
          <CardDescription>
            上传包含表格的图片，自动识别并提取为结构化数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 上传区域 */}
          <div
            className={cn(
              "border-2 border-dashed rounded-md p-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              uploading && "opacity-50"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {imageUrl ? (
              <div className="space-y-3">
                <img src={imageUrl} alt="预览" className="max-h-48 mx-auto rounded-md object-contain" />
                <p className="text-sm text-muted-foreground">图片已上传</p>
                <Button variant="outline" size="sm" onClick={() => setImageUrl('')}>
                  重新上传
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  拖拽图片到此处，或点击选择文件
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <Button variant="outline" asChild>
                  <label htmlFor="image-upload" className="cursor-pointer">
                    选择图片
                  </label>
                </Button>
              </>
            )}
          </div>

          {/* 提取按钮 */}
          <Button
            className="w-full"
            disabled={!imageUrl || processing}
            onClick={handleExtract}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                正在识别表格...
              </>
            ) : (
              <>
                <Table className="h-4 w-4 mr-2" />
                开始提取
              </>
            )}
          </Button>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* 提取结果 */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                成功提取 {result.rows.length} 行数据
              </div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {result.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {result.headers.map((h, j) => (
                          <td key={j} className="px-3 py-2">{String(row[h])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 图生文
function ImageToText({ modelConfig }: { modelConfig: MultimodalFieldsProps['modelConfig'] }) {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrl(e.target?.result as string);
        setUploading(false);
      };
      reader.onerror = () => {
        setError('文件读取失败');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('文件上传失败');
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!imageUrl) return;
    setAnalyzing(true);
    setError('');
    setResult('');
    
    try {
      await new Promise(r => setTimeout(r, 2000));
      setResult('图片内容分析：\n\n这是一张包含数据的图片，显示了商品销售相关的信息。图片中包含了多个商品的价格和数量数据，可以用于进一步的表格提取或数据分析。');
    } catch {
      setError('图片分析失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          图片理解
        </CardTitle>
        <CardDescription>
          上传图片，AI自动分析图片内容
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "border-2 border-dashed rounded-md p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith('image/')) handleFileUpload(file);
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="预览" className="max-h-40 mx-auto rounded-md object-contain mb-3" />
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">拖拽或点击上传图片</p>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="image-upload-text"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <label htmlFor="image-upload-text">{imageUrl ? '重新上传' : '选择图片'}</label>
          </Button>
        </div>

        <Button
          className="w-full"
          disabled={!imageUrl || analyzing}
          onClick={handleAnalyze}
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              开始分析
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// AI生图 - 简化版
function AIGenerator({ modelConfig }: { modelConfig: MultimodalFieldsProps['modelConfig'] }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setResult('');
    
    try {
      // 优先使用 pollinations.ai（免费稳定）
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
      
      // 预加载图片确保可用
      const img = new window.Image();
      img.src = imageUrl;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片生成失败'));
        // 10秒超时
        setTimeout(() => reject(new Error('生成超时')), 10000);
      });
      
      setResult(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (result) {
      const a = document.createElement('a');
      a.href = result;
      a.download = `generated-${Date.now()}.png`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI生图
        </CardTitle>
        <CardDescription>
          输入描述词，AI生成图片（使用免费 pollinations.ai 服务）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="描述你想要生成的图片，例如：一只可爱的橘猫在阳光下打盹"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={generating}
        />

        <Button
          className="w-full"
          disabled={!prompt.trim() || generating}
          onClick={handleGenerate}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              生成图片
            </>
          )}
        </Button>

        {generating && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">正在生成，请稍候...</p>
            <Progress value={66} className="animate-pulse" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="relative rounded-md overflow-hidden border">
              <img
                src={result}
                alt="生成结果"
                className="w-full h-auto"
                crossOrigin="anonymous"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    复制链接
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                下载图片
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 语音转写
function SpeechToText({ modelConfig }: { modelConfig: MultimodalFieldsProps['modelConfig'] }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setRecording(true);
      setError('');
    } catch {
      setError('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioUrl) return;
    setTranscribing(true);
    setError('');
    setResult('');
    
    try {
      await new Promise(r => setTimeout(r, 2000));
      setResult('这是一段语音转文字的示例内容。在实际使用中，您可以配置AI模型来实现语音识别功能。');
    } catch {
      setError('转写失败，请重试');
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          语音转写
        </CardTitle>
        <CardDescription>
          录制或上传音频，AI转写为文字
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-6 border rounded-md">
          <button
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all",
              recording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-primary hover:bg-primary/90"
            )}
            onClick={recording ? stopRecording : startRecording}
          >
            <Mic className="h-8 w-8 text-white" />
          </button>
          <p className="text-sm text-muted-foreground">
            {recording ? '录音中... 点击停止' : '点击开始录音'}
          </p>
        </div>

        {audioUrl && (
          <div className="space-y-3">
            <audio src={audioUrl} controls className="w-full" />
            <Button
              className="w-full"
              disabled={transcribing}
              onClick={handleTranscribe}
            >
              {transcribing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  转写中...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  开始转写
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 主组件
export function MultimodalFields({ data, modelConfig, onImageToTable }: MultimodalFieldsProps) {
  const [activeTab, setActiveTab] = useState('image-to-table');

  return (
    <div className="h-full overflow-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full mb-4">
          <TabsTrigger value="image-to-table" className="text-xs sm:text-sm">
            <Table className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">图转表</span>
          </TabsTrigger>
          <TabsTrigger value="image-to-text" className="text-xs sm:text-sm">
            <Image className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">图生文</span>
          </TabsTrigger>
          <TabsTrigger value="generate" className="text-xs sm:text-sm">
            <Wand2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">AI生图</span>
          </TabsTrigger>
          <TabsTrigger value="speech" className="text-xs sm:text-sm">
            <Mic className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">语音</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image-to-table">
          <ImageToTable onResult={onImageToTable} />
        </TabsContent>
        <TabsContent value="image-to-text">
          <ImageToText modelConfig={modelConfig} />
        </TabsContent>
        <TabsContent value="generate">
          <AIGenerator modelConfig={modelConfig} />
        </TabsContent>
        <TabsContent value="speech">
          <SpeechToText modelConfig={modelConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
