export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'radar'
  | 'area'
  | 'heatmap'
  | 'gauge'
  | 'funnel'
  | 'treemap'
  | 'sankey'
  | 'pivot';

export interface ChartConfig {
  type: ChartType;
  title?: string;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  series: SeriesConfig[];
  colors?: string[];
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  animation?: AnimationConfig;
}

export interface AxisConfig {
  field: string;
  label?: string;
  scale?: 'linear' | 'log' | 'time' | 'band';
  tickCount?: number;
  format?: string;
  rotate?: number;
}

export interface SeriesConfig {
  field: string;
  name?: string;
  type?: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  stack?: string;
  color?: string;
  yAxisIndex?: number;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface LegendConfig {
  show: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  orient?: 'horizontal' | 'vertical';
}

export interface TooltipConfig {
  show: boolean;
  trigger?: 'item' | 'axis' | 'none';
  format?: string;
}

export interface AnimationConfig {
  enable: boolean;
  duration?: number;
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  components: DashboardComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardComponent {
  id: string;
  type: 'chart' | 'table' | 'kpi' | 'text' | 'filter';
  title?: string;
  config: ChartConfig | TableConfig | KPIConfig;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  linkedFilters?: string[];
}

export interface TableConfig {
  fields: string[];
  sortable?: boolean;
  filterable?: boolean;
  pageSize?: number;
  showTotal?: boolean;
}

export interface KPIConfig {
  field: string;
  value?: number;
  format?: 'number' | 'currency' | 'percent' | 'custom';
  comparison?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    label?: string;
  };
}

export interface ChartExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf';
  width?: number;
  height?: number;
  quality?: number;
  background?: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  category: 'dashboard' | 'chart' | 'report' | 'analysis';
  description?: string;
  thumbnail?: string;
  config: DashboardLayout | ChartConfig;
  isBuiltIn?: boolean;
}
