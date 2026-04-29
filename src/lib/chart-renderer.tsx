import React from 'react';
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  AreaChart,
} from 'recharts';
import type { ChartType, ChartConfig, SeriesConfig } from '@/types';

interface ChartRendererProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
  width?: number;
  height?: number;
}

export function ChartRenderer({ config, data, width = 600, height = 400 }: ChartRendererProps) {
  const renderChart = () => {
    const commonProps = {
      data,
      width,
      height,
    };

    switch (config.type) {
      case 'bar':
        return <BarChart {...commonProps} />;
      case 'line':
        return <LineChart {...commonProps} />;
      case 'pie':
        return <PieChart {...commonProps} />;
      case 'scatter':
        return <ScatterChart {...commonProps} />;
      case 'area':
        return <AreaChart {...commonProps} />;
      default:
        return <BarChart {...commonProps} />;
    }
  };

  return (
    <div className="chart-renderer">
      {config.title && (
        <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
      )}
      {renderChart()}
    </div>
  );
}

export function getChartTypeForData(dataType: string): ChartType {
  switch (dataType) {
    case 'number':
      return 'bar';
    case 'string':
      return 'pie';
    case 'date':
      return 'line';
    default:
      return 'bar';
  }
}

export function createChartConfig(
  type: ChartType,
  xField: string,
  yField: string,
  title?: string
): ChartConfig {
  return {
    type,
    title,
    xAxis: { field: xField },
    yAxis: { field: yField },
    series: [
      {
        field: yField,
        type: (type === 'area' ? 'area' : type) as SeriesConfig['type'],
      },
    ],
    legend: { show: true },
    tooltip: { show: true },
    animation: { enable: true, duration: 500 },
  };
}
