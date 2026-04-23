# DataInsight - 智能表格数据处理与可视化工具

## 项目概述

轻量化智能表格数据处理与可视化工具，依托自动数据分析能力，支持多端上传表格文件，自动生成标准化报表 + 交互式仪表盘，满足个人/企业数据统计、业务复盘、数据可视化展示需求。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据可视化**: Recharts
- **文件解析**: xlsx (Excel), papaparse (CSV)
- **AI 集成**: coze-coding-dev-sdk (LLM)

## 核心功能

### 1. 多端表格上传能力
- Web 端网页上传
- 支持文件格式：Excel（.xlsx/.xls）、CSV
- 支持单文件/批量文件上传
- 自动校验文件格式、数据完整性

### 2. 自动数据处理与分析能力
- 自动数据清洗：去重、空值处理
- 自动数据分析：基础统计（求和/均值/计数/占比）、趋势分析
- 自动字段识别：智能识别表格表头、数据维度、指标字段

### 3. 交互式仪表盘视图能力
- 自动生成可视化仪表盘（柱状图、折线图、饼图、面积图、雷达图）
- 维度筛选、图表类型切换
- 支持仪表盘自定义配置

### 4. 智能报表生成能力
- 一键生成标准化统计报表
- 支持报表模板选择
- 报表预览与打印

### 5. AI 智能分析
- 基于 LLM 的自然语言数据问答
- 自动生成数据洞察和建议
- 流式响应输出

### 6. 飞书多维表格集成（Beta）
- 飞书应用配置入口
- 多维表格数据导入
- API 调用示例

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── upload/          # 文件上传 API
│   │   ├── analyze/         # 数据分析 API
│   │   └── llm-insight/     # LLM 智能洞察 API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx             # 主页面
├── components/
│   ├── ui/                  # shadcn/ui 组件库
│   ├── file-uploader.tsx    # 文件上传组件
│   ├── data-table.tsx       # 数据表格组件
│   ├── data-insights.tsx    # 数据分析展示组件
│   ├── dashboard.tsx        # 交互式仪表盘
│   ├── llm-assistant.tsx    # AI 助手组件
│   ├── feishu-integration.tsx  # 飞书集成组件
│   └── report-generator.tsx # 报表生成组件
└── lib/
    ├── utils.ts             # 通用工具函数
    └── data-processor.ts    # 数据处理工具
```

## 开发命令

- **开发环境**: `pnpm dev` (端口 5000)
- **构建**: `pnpm build`
- **类型检查**: `pnpm ts-check`
- **代码检查**: `pnpm lint`

## API 接口

### POST /api/upload
上传并解析 Excel/CSV 文件

**请求**: FormData，包含 files 字段

**响应**:
```json
{
  "success": true,
  "data": [{
    "headers": ["字段1", "字段2"],
    "rows": [{ "字段1": "值1", "字段2": 100 }],
    "fileName": "data.xlsx",
    "rowCount": 100,
    "columnCount": 2
  }]
}
```

### POST /api/analyze
分析已解析的数据

**请求**:
```json
{
  "data": { /* ParsedData */ }
}
```

**响应**:
```json
{
  "success": true,
  "analysis": {
    "fieldStats": [...],
    "summary": { "totalRows": 100, "totalColumns": 5, ... },
    "insights": ["洞察1", "洞察2"],
    "anomalies": [...]
  }
}
```

### POST /api/llm-insight
获取 AI 智能洞察（SSE 流式响应）

## 注意事项

1. **文件大小限制**: 默认 50MB
2. **支持的格式**: .xlsx, .xls, .csv
3. **数据类型推断**: 自动识别数值、文本、日期字段
4. **AI 分析**: 使用 doubao-seed-2-0-lite 模型，流式输出
