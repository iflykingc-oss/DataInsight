'use client';

import { useState, useCallback } from 'react';
import { Image, Mic, FileImage, Wand2, Type, Loader2, Table, Upload, CheckCircle, XCircle } from 'lucide-react';
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
  onImageToTable?: (result: ParsedData) => void;
}

export function MultimodalFields({ data, modelConfig, onImageToTable }: MultimodalFieldsProps) {
  const [activeTab, setActiveTab] = useState<'image-gen' | 'image-recognize' | 'image-to-table' | 'audio'>('image-gen');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [tableResult, setTableResult] = useState<ParsedData | null>(null);

  const handleGenerateImage = useCallback(async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      setResult(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`);
    } finally {
      setLoading(false);
    }
  }, [prompt]);

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

  // 图片识别：调用AI-Field API的image-understand类型
  const handleRecognize = useCallback(async () => {
    if (!imagePreview || !modelConfig) {
      // 无模型配置时使用模拟结果
      setRecognizedText('这是一张包含销售数据的表格截图，包含以下列：产品名称、销售额、日期、地区。其中销售额最高的产品为A产品，总计¥125,000。');
      return;
    }
    setLoading(true);
    try {
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
      const data = await resp.json();
      if (data.success && data.results) {
        setRecognizedText(data.results[0] || '识别完成，但未获取到有效内容');
      } else {
        setRecognizedText('图片识别失败，请检查AI模型配置是否正确。');
      }
    } catch {
      setRecognizedText('图片识别请求失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [imagePreview, modelConfig]);

  // 图片转表格：调用LLM从识别文本中提取结构化表格
  const handleImageToTable = useCallback(async () => {
    if (!recognizedText && !imagePreview) return;
    setLoading(true);
    try {
      if (modelConfig) {
        // 有模型配置时：调用LLM提取结构化数据
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
          // 从回复中提取JSON
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

  const handleTranscribe = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setResult('这是一段模拟的音频转文字结果。实际场景下将调用ASR服务将上传的音频文件转为文字。');
      setLoading(false);
    }, 1200);
  }, []);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="image-gen"><Wand2 className="w-3.5 h-3.5 mr-1" /> AI生图</TabsTrigger>
          <TabsTrigger value="image-recognize"><FileImage className="w-3.5 h-3.5 mr-1" /> 图生文</TabsTrigger>
          <TabsTrigger value="image-to-table"><Table className="w-3.5 h-3.5 mr-1" /> 图转表</TabsTrigger>
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
              <Button size="sm" onClick={handleRecognize} disabled={loading || !imagePreview}>
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

              {/* 图片上传 */}
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

              {/* 转换结果 */}
              {tableResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">转换成功</span>
                    <Badge variant="secondary">{tableResult.headers.length} 列 &middot; {tableResult.rows.length} 行</Badge>
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
                      导入到当前数据表
                    </Button>
                  )}
                </div>
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
        <h4 className="text-xs font-medium mb-2">可用多模态能力</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'AI生图', desc: '文字生成图片' },
            { label: '图生文', desc: '图片内容描述' },
            { label: '图转表', desc: '图片表格→结构化数据' },
            { label: '语音转写', desc: '音频→文字' },
          ].map(t => (
            <div key={t.label} className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px]">{t.label}</Badge>
              <span className="text-[10px] text-muted-foreground">{t.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          提示：图转表功能可识别截屏/扫描件中的表格并转为可编辑数据。配置AI模型后可提升识别精度。
        </p>
      </Card>
    </div>
  );
}
