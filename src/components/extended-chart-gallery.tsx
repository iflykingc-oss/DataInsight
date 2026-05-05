'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ScatterChart,
  BoxPlotChart,
  HeatmapChart,
  FunnelChart,
  SankeyChart,
  WaterfallChart,
  TreemapChart,
  GaugeChart,
  WordCloudChart,
  ComboChart,
  EXTENDED_CHART_TYPES,
  type ExtendedChartType,
} from './echarts-extensions';
import { LayoutGrid, Info } from 'lucide-react';
import type { CellValue } from '@/lib/data-processor';

interface ExtendedChartGalleryProps {
  data: {
    headers: string[];
    rows: Record<string, CellValue>[];
  };
}

export function ExtendedChartGallery({ data }: ExtendedChartGalleryProps) {
  const [selectedChart, setSelectedChart] = useState<ExtendedChartType>('scatter');
  const [xField, setXField] = useState(data.headers?.[0] || '');
  const [yField, setYField] = useState('');
  const [yFields, setYFields] = useState<string[]>([]);
  const [wordField, setWordField] = useState('');
  const [gaugeValue, setGaugeValue] = useState(75);

  const numericFields = useMemo(() => {
    return data.headers.filter(h => {
      const sample = data.rows.slice(0, 20).map(r => r[h]);
      return sample.some(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v))));
    });
  }, [data]);

  const categoricalFields = useMemo(() => {
    return data.headers.filter(h => !numericFields.includes(h));
  }, [data.headers, numericFields]);

  const selectedChartInfo = EXTENDED_CHART_TYPES.find(c => c.id === selectedChart);

  const renderChart = () => {
    const chartProps = {
      data,
      xField,
      yField: yField || numericFields[0],
      title: selectedChartInfo?.name,
      height: 450,
    };

    switch (selectedChart) {
      case 'scatter':
        return <ScatterChart {...chartProps} />;
      case 'boxplot':
        return <BoxPlotChart {...chartProps} />;
      case 'heatmap':
        return <HeatmapChart data={data} title="字段相关性热力图" height={450} />;
      case 'funnel':
        return <FunnelChart {...chartProps} />;
      case 'sankey':
        return <SankeyChart {...chartProps} />;
      case 'waterfall':
        return <WaterfallChart {...chartProps} />;
      case 'treemap':
        return <TreemapChart {...chartProps} />;
      case 'gauge':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <GaugeChart value={gaugeValue} title={yField || '指标完成度'} max={100} unit="%" />
            <div className="flex items-center gap-4 mt-4">
              <span className="text-sm text-muted-foreground">调整数值:</span>
              <input
                type="range"
                min={0}
                max={100}
                value={gaugeValue}
                onChange={e => setGaugeValue(Number(e.target.value))}
                className="w-48"
              />
              <span className="text-sm font-mono">{gaugeValue}%</span>
            </div>
          </div>
        );
      case 'wordcloud':
        return <WordCloudChart data={data} field={wordField || categoricalFields[0]} title={`${wordField || categoricalFields[0]} 词频统计`} height={450} />;
      case 'combo':
        return <ComboChart data={data} xField={xField} yFields={yFields.length >= 2 ? yFields : numericFields.slice(0, 2)} title="组合分析" height={450} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-primary" />
            扩展图表库
          </h2>
          <p className="text-muted-foreground mt-1">10种高级图表类型，满足专业分析需求</p>
        </div>
      </div>

      {/* 图表类型选择 */}
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {EXTENDED_CHART_TYPES.map(chart => (
          <Button
            key={chart.id}
            variant={selectedChart === chart.id ? 'default' : 'outline'}
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2 px-1"
            onClick={() => setSelectedChart(chart.id)}
          >
            <span className="text-lg">{chart.icon}</span>
            <span className="text-[10px]">{chart.name}</span>
          </Button>
        ))}
      </div>

      {/* 当前图表信息 */}
      {selectedChartInfo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>
            <strong>{selectedChartInfo.name}</strong>：{selectedChartInfo.description}
          </span>
        </div>
      )}

      <Separator />

      {/* 字段配置 */}
      <div className="flex flex-wrap items-center gap-3">
        {selectedChart !== 'heatmap' && selectedChart !== 'gauge' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">X轴:</span>
            <Select value={xField} onValueChange={setXField}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.headers.map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedChart !== 'heatmap' && selectedChart !== 'wordcloud' && selectedChart !== 'gauge' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Y轴:</span>
            <Select value={yField} onValueChange={setYField}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择字段" />
              </SelectTrigger>
              <SelectContent>
                {numericFields.map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedChart === 'wordcloud' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">文本字段:</span>
            <Select value={wordField} onValueChange={setWordField}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择字段" />
              </SelectTrigger>
              <SelectContent>
                {categoricalFields.map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedChart === 'combo' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Y轴字段(多选):</span>
            <div className="flex flex-wrap gap-1">
              {numericFields.slice(0, 4).map(h => (
                <Badge
                  key={h}
                  variant={yFields.includes(h) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setYFields(prev =>
                      prev.includes(h) ? prev.filter(f => f !== h) : [...prev, h]
                    );
                  }}
                >
                  {h}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 图表展示 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {selectedChartInfo?.icon} {selectedChartInfo?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>
    </div>
  );
}
