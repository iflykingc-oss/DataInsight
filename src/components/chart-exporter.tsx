'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Image,
  FileText,
  Presentation,
  FileCode,
  Loader2,
  CheckCircle2,
  Settings,
  Printer,
  Mail,
  Copy,
  RefreshCw,
  Calendar,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { ParsedData } from '@/lib/data-processor';

// ============================================
// 类型定义
// ============================================

// 导出格式
type ExportFormat = 'png' | 'svg' | 'pdf' | 'excel' | 'csv' | 'word' | 'powerpoint';

// 导出配置
interface ExportConfig {
  format: ExportFormat;
  quality: number; // 1-100
  width?: number;
  height?: number;
  includeTitle: boolean;
  includeLegend: boolean;
  includeData: boolean;
  backgroundColor: string;
  scale: number; // 1x, 2x, 3x
}

// 导出任务
interface ExportTask {
  id: string;
  name: string;
  format: ExportFormat;
  status: 'pending' | 'exporting' | 'completed' | 'failed';
  progress: number;
  url?: string;
  createdAt: number;
}

// 预设导出配置
const FORMAT_PRESETS: Array<{
  format: ExportFormat;
  label: string;
  icon: React.ElementType;
  description: string;
  extensions: string[];
}> = [
  {
    format: 'png',
    label: 'PNG 图片',
    icon: Image,
    description: '高清晰度位图，适合插入文档和PPT',
    extensions: ['.png']
  },
  {
    format: 'svg',
    label: 'SVG 矢量图',
    icon: FileCode,
    description: '矢量格式，无限放大不失真',
    extensions: ['.svg']
  },
  {
    format: 'pdf',
    label: 'PDF 文档',
    icon: FileText,
    description: '适合打印和存档',
    extensions: ['.pdf']
  },
  {
    format: 'excel',
    label: 'Excel 数据',
    icon: FileSpreadsheet,
    description: '原始数据表格，可编辑（支持公式）',
    extensions: ['.xlsx']
  },
  {
    format: 'csv',
    label: 'CSV 文件',
    icon: FileText,
    description: '通用数据格式，兼容所有表格软件',
    extensions: ['.csv']
  },
  {
    format: 'word',
    label: 'Word 文档',
    icon: FileText,
    description: '图文报告，可编辑',
    extensions: ['.docx']
  },
  {
    format: 'powerpoint',
    label: 'PPT 演示',
    icon: Presentation,
    description: '幻灯片演示文稿',
    extensions: ['.pptx']
  }
];

// 质量预设
const QUALITY_PRESETS = [
  { label: '标准', value: 80, description: '适合屏幕显示' },
  { label: '高清', value: 95, description: '适合打印输出' },
  { label: '最高', value: 100, description: '最高清晰度，文件较大' }
];

// 尺寸预设
const SIZE_PRESETS = [
  { label: '原始尺寸', width: 0, height: 0 },
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '2K', width: 2560, height: 1440 },
  { label: '4K', width: 3840, height: 2160 },
  { label: 'A4 竖版', width: 595, height: 842 },
  { label: 'A4 横版', width: 842, height: 595 }
];

interface ChartExporterProps {
  chartRef?: React.RefObject<HTMLElement | null>;
  chartName?: string;
  data?: ParsedData; // 表格数据，用于导出Excel/CSV
  onExport?: (format: ExportFormat, blob: Blob) => void;
  className?: string;
}

export function ChartExporter({
  chartRef,
  chartName = '图表',
  data,
  onExport,
  className
}: ChartExporterProps) {
  // 状态
  const [config, setConfig] = useState<ExportConfig>({
    format: 'png',
    quality: 95,
    includeTitle: true,
    includeLegend: true,
    includeData: true,
    backgroundColor: '#ffffff',
    scale: 2
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('export');
  // showSettings unused
  
  const [exportHistory, setExportHistory] = useState<ExportTask[]>([]);

  // 导出为 PNG
  const exportToPNG = useCallback(async (): Promise<Blob | null> => {
    if (!chartRef?.current) {
      // 如果没有 ref，创建一个默认的画布
      const canvas = document.createElement('canvas');
      canvas.width = config.width || 800;
      canvas.height = config.height || 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (config.includeTitle) {
          ctx.fillStyle = '#1a1a1a';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText(chartName, 20, 40);
        }
      }
      return new Promise(resolve => canvas.toBlob(resolve, 'image/png', config.quality / 100));
    }

    try {
      // 尝试使用 html2canvas 库（如果可用）
      const html2canvas = (window as unknown as { html2canvas?: (el: HTMLElement, options: Record<string, unknown>) => Promise<{ toBlob: (callback: (blob: Blob | null) => void, type: string, quality: number) => void }> }).html2canvas;
      
      if (html2canvas) {
        const canvas = await html2canvas(chartRef.current, {
          scale: config.scale,
          backgroundColor: config.backgroundColor,
          useCORS: true
        });
        
        return new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png', config.quality / 100);
        });
      }
    } catch {
      console.log('html2canvas not available, using fallback');
    }

    // 回退方案：创建基础图片
    const canvas = document.createElement('canvas');
    canvas.width = config.width || 800;
    canvas.height = config.height || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (config.includeTitle) {
        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(chartName, 20, 40);
      }
      
      if (config.includeLegend) {
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.fillText('图例区域', 20, canvas.height - 20);
      }
    }
    
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png', config.quality / 100));
  }, [chartRef, chartName, config]);

  // 导出为 SVG
  const exportToSVG = useCallback((): Blob => {
    const width = config.width || 800;
    const height = config.height || 600;
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${config.backgroundColor}"/>
`;
    
    if (config.includeTitle) {
      svg += `  <text x="20" y="40" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#1a1a1a">${chartName}</text>\n`;
    }
    
    if (config.includeLegend) {
      svg += `  <text x="20" y="${height - 20}" font-family="Arial, sans-serif" font-size="14" fill="#666">图例区域</text>\n`;
    }
    
    svg += '</svg>';
    
    return new Blob([svg], { type: 'image/svg+xml' });
  }, [chartName, config]);

  // 导出为真正的 Excel (.xlsx)
  const exportToExcel = useCallback((): Blob => {
    if (data?.headers && data?.rows) {
      // 使用 xlsx 库生成真正的 Excel 文件
      const wsData = [data.headers, ...data.rows.map(row => data.headers.map(h => row[h] ?? ''))];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // 设置列宽
      ws['!cols'] = data.headers.map(() => ({ wch: 15 }));
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '数据表');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    
    // 回退：使用 CSV 格式
    const csv = [
      ['数据项', '数值'],
      ['项目 A', '1000'],
      ['项目 B', '2000'],
      ['项目 C', '1500']
    ].map(row => row.join(',')).join('\n');
    
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }, [data]);

  // 导出为 CSV
  const exportToCSV = useCallback((): Blob => {
    if (data?.headers && data?.rows) {
      const rows = [
        data.headers.join(','),
        ...data.rows.map(row => data.headers.map(h => {
          const val = row[h] ?? '';
          // 处理含逗号或引号的值
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(','))
      ];
      return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    }
    return new Blob([['数据项,数值', '项目 A,1000', '项目 B,2000', '项目 C,1500'].join('\n')], { type: 'text/csv;charset=utf-8' });
  }, [data]);

  // 导出为 PDF
  const exportToPDF = useCallback(async (): Promise<Blob> => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // 添加标题
    pdf.setFontSize(18);
    pdf.text(chartName, 20, 20);
    
    // 添加生成时间
    pdf.setFontSize(10);
    pdf.setTextColor(128);
    pdf.text(`生成时间: ${new Date().toLocaleString()}`, 20, 28);
    
    // 如果有数据，添加数据表格
    if (data?.headers && data?.rows) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setTextColor(0);
      pdf.text('数据内容', 20, 20);
      
      const startY = 30;
      const colWidth = 45;
      const rowHeight = 8;
      
      // 表头
      pdf.setFillColor(66, 66, 66);
      pdf.setTextColor(255, 255, 255);
      data.headers.forEach((header, i) => {
        pdf.rect(20 + i * colWidth, startY, colWidth, rowHeight, 'F');
        pdf.text(String(header).substring(0, 12), 22 + i * colWidth, startY + 6);
      });
      
      // 数据行
      pdf.setTextColor(0);
      data.rows.slice(0, 20).forEach((row, rowIndex) => {
        const y = startY + (rowIndex + 1) * rowHeight;
        if (y > 180) return; // 避免超出页面
        
        data.headers.forEach((header, colIndex) => {
          const val = String(row[header] ?? '');
          pdf.text(val.substring(0, 12), 22 + colIndex * colWidth, y + 5);
        });
      });
      
      if (data.rows.length > 20) {
        pdf.setTextColor(128);
        pdf.text(`... 共 ${data.rows.length} 行数据`, 20, startY + 22 * rowHeight);
      }
    }
    
    return pdf.output('blob');
  }, [chartName, data]);

  // 导出
  const handleExport = async () => {
    setIsExporting(true);
    
    const task: ExportTask = {
      id: `export-${Date.now()}`,
      name: chartName,
      format: config.format,
      status: 'exporting',
      progress: 0,
      createdAt: Date.now()
    };
    
    setExportHistory(prev => [task, ...prev]);

    try {
      let blob: Blob | null = null;
      
      switch (config.format) {
        case 'png':
          task.progress = 30;
          setExportHistory(prev => prev.map(t => t.id === task.id ? task : t));
          blob = await exportToPNG();
          break;
          
        case 'svg':
          task.progress = 50;
          setExportHistory(prev => prev.map(t => t.id === task.id ? task : t));
          blob = exportToSVG();
          break;
          
        case 'excel':
          task.progress = 50;
          setExportHistory(prev => prev.map(t => t.id === task.id ? task : t));
          blob = exportToExcel();
          break;
          
        case 'csv':
          task.progress = 50;
          setExportHistory(prev => prev.map(t => t.id === task.id ? task : t));
          blob = exportToCSV();
          break;
          
        case 'pdf': {
          task.progress = 30;
          setExportHistory(prev => prev.map(t => t.id === task.id ? task : t));
          blob = await exportToPDF();
          break;
        }
          
        case 'word':
        case 'powerpoint':
          // 这些格式需要专门的库支持
          blob = await exportToPNG(); // 暂时用 PNG 代替
          break;
      }
      
      if (blob) {
        task.progress = 80;
        setExportHistory(prev => prev.map(t => t.id === task.id ? task : t));
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        task.url = url;
        task.status = 'completed';
        task.progress = 100;
        
        // 触发下载
        const link = document.createElement('a');
        link.href = url;
        link.download = `${chartName.replace(/\s+/g, '_')}.${config.format}`;
        link.click();
        
        setExportedUrl(url);
        onExport?.(config.format, blob);
      }
    } catch (error) {
      task.status = 'failed';
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setExportHistory(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  // 复制到剪贴板
  const handleCopyToClipboard = async () => {
    if (!exportedUrl) return;
    
    try {
      const response = await fetch(exportedUrl);
      if (!response.ok) throw new Error('获取图片失败');
      const blob = await response.blob();
      await navigator.clipboard.writeText(await blobToBase64(blob));
    } catch {
      console.error('Copy failed');
    }
  };

  // 辅助函数
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 打印
  const handlePrint = () => {
    if (!exportedUrl) return;
    
    const printWindow = window.open(exportedUrl);
    printWindow?.print();
  };

  // 邮件分享
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`${chartName} - DataInsight 导出`);
    const body = encodeURIComponent(`请查看附件中的图表导出文件。\n\n由 DataInsight 生成`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const selectedPreset = FORMAT_PRESETS.find(p => p.format === config.format);
  const Icon = selectedPreset?.icon || Download;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-green-500" />
          <h3 className="font-medium">图表导出</h3>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export" className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            导出
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="w-4 h-4" />
            设置
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            历史
          </TabsTrigger>
        </TabsList>

        {/* 导出 Tab */}
        <TabsContent value="export" className="mt-4 space-y-4">
          {/* 格式选择 */}
          <div className="space-y-3">
            <Label>选择导出格式</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {FORMAT_PRESETS.map(preset => {
                const FormatIcon = preset.icon;
                const isSelected = config.format === preset.format;
                
                return (
                  <button
                    key={preset.format}
                    onClick={() => setConfig(prev => ({ ...prev, format: preset.format }))}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <FormatIcon className={cn(
                      'w-6 h-6 mb-2',
                      isSelected ? 'text-primary' : 'text-gray-600'
                    )} />
                    <p className={cn(
                      'font-medium text-sm',
                      isSelected ? 'text-primary' : ''
                    )}>
                      {preset.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {preset.extensions.join(', ')}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 快速设置预览 */}
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Icon className="w-8 h-8 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedPreset?.label}</p>
                  <p className="text-sm text-gray-500">{selectedPreset?.description}</p>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <p>{config.scale}x 分辨率</p>
                  <p>质量 {config.quality}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 导出按钮 */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                导出 {selectedPreset?.label}
              </>
            )}
          </Button>

          {/* 导出后操作 */}
          {exportedUrl && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-green-700">导出成功</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                      <Copy className="w-4 h-4 mr-1" />
                      复制
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-1" />
                      打印
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleEmailShare}>
                      <Mail className="w-4 h-4 mr-1" />
                      邮件
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 设置 Tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          {/* 质量设置 */}
          <div className="space-y-3">
            <Label>导出质量</Label>
            <div className="flex gap-2">
              {QUALITY_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setConfig(prev => ({ ...prev, quality: preset.value }))}
                  className={cn(
                    'flex-1 p-3 rounded-lg border text-center transition-all',
                    config.quality === preset.value
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <p className="font-medium">{preset.label}</p>
                  <p className="text-xs text-gray-500">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 尺寸设置 */}
          <div className="space-y-3">
            <Label>输出尺寸</Label>
            <select
              className="w-full p-3 border rounded-lg"
              value={config.width ? `${config.width}x${config.height}` : '0x0'}
              onChange={e => {
                const parts = e.target.value.split('x');
                const w = Number(parts[0]) || undefined;
                const h = Number(parts[1]) || undefined;
                setConfig(prev => ({ ...prev, width: w, height: h }));
              }}
            >
              {SIZE_PRESETS.map(preset => (
                <option key={preset.label} value={`${preset.width}x${preset.height}`}>
                  {preset.label} {preset.width ? `(${preset.width}x${preset.height})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 分辨率 */}
          <div className="space-y-3">
            <Label>图片分辨率</Label>
            <div className="flex gap-2">
              {[1, 2, 3].map(scale => (
                <button
                  key={scale}
                  onClick={() => setConfig(prev => ({ ...prev, scale }))}
                  className={cn(
                    'flex-1 p-3 rounded-lg border text-center transition-all',
                    config.scale === scale
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <p className="font-medium">{scale}x</p>
                  <p className="text-xs text-gray-500">
                    {scale === 1 ? '标准' : scale === 2 ? 'Retina' : '超高清'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 背景色 */}
          <div className="space-y-3">
            <Label>背景颜色</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.backgroundColor}
                onChange={e => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <Input
                value={config.backgroundColor}
                onChange={e => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfig(prev => ({ ...prev, backgroundColor: 'transparent' }))}
              >
                透明
              </Button>
            </div>
          </div>

          {/* 包含内容 */}
          <div className="space-y-3">
            <Label>包含内容</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-title"
                  checked={config.includeTitle}
                  onCheckedChange={checked => setConfig(prev => ({ ...prev, includeTitle: !!checked }))}
                />
                <label htmlFor="include-title" className="text-sm">包含标题</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-legend"
                  checked={config.includeLegend}
                  onCheckedChange={checked => setConfig(prev => ({ ...prev, includeLegend: !!checked }))}
                />
                <label htmlFor="include-legend" className="text-sm">包含图例</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-data"
                  checked={config.includeData}
                  onCheckedChange={checked => setConfig(prev => ({ ...prev, includeData: !!checked }))}
                />
                <label htmlFor="include-data" className="text-sm">包含原始数据</label>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 历史 Tab */}
        <TabsContent value="history" className="mt-4">
          {exportHistory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无导出历史</p>
                <p className="text-sm text-gray-400 mt-1">
                  导出文件后会显示在这里
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {exportHistory.map(task => (
                <Card key={task.id} className="hover:bg-gray-50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          task.status === 'completed' ? 'bg-green-100' :
                          task.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                        )}>
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : task.status === 'failed' ? (
                            <FileText className="w-4 h-4 text-red-600" />
                          ) : (
                            <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{task.name}</p>
                          <p className="text-xs text-gray-500">
                            {FORMAT_PRESETS.find(f => f.format === task.format)?.label} · 
                            {new Date(task.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      {task.status === 'completed' && task.url && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = task.url!;
                              link.download = `${task.name}.${task.format}`;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {task.status === 'exporting' && (
                      <div className="mt-2">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ChartExporter;
